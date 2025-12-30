#!/usr/bin/env bun

/**
 * Fluent-FFmpeg Web UI Server
 * 使用 Bun 运行，提供一个 Web 界面来测试 fluent-ffmpeg 功能
 */

import { serve } from "bun";
import { join, dirname, extname, basename } from "path";
import { mkdir, readdir, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import ffmpeg from "@luban-ws/fluent-ffmpeg";

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = join(import.meta.dir, "uploads");
const OUTPUT_DIR = join(import.meta.dir, "outputs");

// 安全配置
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/avi",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/x-flv",
  "video/x-ms-wmv",
];
const MAX_CONCURRENT_TASKS = 3; // 最大并发转换任务数
let activeTasks = 0;

// 确保目录存在
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}
if (!existsSync(OUTPUT_DIR)) {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

// 存储转换任务
const tasks = new Map();

// 清理旧文件（可选）
async function cleanupOldFiles() {
  try {
    const files = await readdir(OUTPUT_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = join(OUTPUT_DIR, file);
      const stats = await stat(filePath);
      // 删除超过 1 小时的文件
      if (now - stats.mtimeMs > 3600000) {
        await unlink(filePath);
      }
    }
  } catch (err) {
    console.error("清理文件时出错:", err);
  }
}

// 定期清理
setInterval(cleanupOldFiles, 3600000); // 每小时清理一次

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // 静态文件服务
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // API 路由
    if (url.pathname.startsWith("/api/")) {
      return handleAPI(req, url);
    }

    // 下载输出文件
    if (url.pathname.startsWith("/download/")) {
      const filename = url.pathname.replace("/download/", "");
      // 安全验证：防止路径遍历攻击
      if (!isValidFilename(filename)) {
        return new Response("无效的文件名", { status: 400 });
      }
      const filePath = join(OUTPUT_DIR, filename);
      // 确保文件在输出目录内（防止路径遍历）
      if (!filePath.startsWith(OUTPUT_DIR)) {
        return new Response("非法路径", { status: 403 });
      }
      if (existsSync(filePath)) {
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        });
      }
      return new Response("文件不存在", { status: 404 });
    }

    return new Response("Not Found", { status: 404 });
  },
});

async function handleAPI(req, url) {
  const path = url.pathname;

  // 上传文件
  if (path === "/api/upload" && req.method === "POST") {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file) {
        return new Response(JSON.stringify({ error: "没有文件" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 验证文件类型
      const fileType = file.type;
      if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
        return new Response(
          JSON.stringify({
            error: `不支持的文件类型: ${fileType}. 支持的格式: ${ALLOWED_VIDEO_TYPES.join(", ")}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 验证文件大小
      const fileSize = file.size;
      if (fileSize > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({
            error: `文件太大. 最大允许: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 验证文件名
      const originalName = file.name;
      if (!isValidFilename(originalName)) {
        return new Response(JSON.stringify({ error: "无效的文件名" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 生成安全的文件名
      const safeName = sanitizeFilename(originalName);
      const filename = `${Date.now()}-${safeName}`;
      const filePath = join(UPLOAD_DIR, filename);

      // 确保文件路径在上传目录内
      if (!filePath.startsWith(UPLOAD_DIR)) {
        return new Response(JSON.stringify({ error: "非法路径" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      await Bun.write(filePath, file);

      // 获取文件元数据
      const metadata = await getVideoMetadata(filePath);

      return new Response(
        JSON.stringify({
          success: true,
          filename,
          originalName: file.name,
          metadata,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 开始转换
  if (path === "/api/convert" && req.method === "POST") {
    try {
      // 检查并发任务数
      if (activeTasks >= MAX_CONCURRENT_TASKS) {
        return new Response(
          JSON.stringify({
            error: `已达到最大并发任务数 (${MAX_CONCURRENT_TASKS})，请稍后再试`,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const body = await req.json();
      const { filename, options } = body;

      // 验证文件名
      if (!filename || !isValidFilename(filename)) {
        return new Response(JSON.stringify({ error: "无效的文件名" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const inputPath = join(UPLOAD_DIR, filename);

      // 确保输入路径在上传目录内
      if (!inputPath.startsWith(UPLOAD_DIR)) {
        return new Response(JSON.stringify({ error: "非法路径" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const outputFilename = `${taskId}${getOutputExtension(options.format || "mp4")}`;
      const outputPath = join(OUTPUT_DIR, outputFilename);

      // 确保输出路径在输出目录内
      if (!outputPath.startsWith(OUTPUT_DIR)) {
        return new Response(JSON.stringify({ error: "非法路径" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!existsSync(inputPath)) {
        return new Response(JSON.stringify({ error: "输入文件不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 创建转换任务
      const task = {
        id: taskId,
        status: "processing",
        progress: 0,
        inputFile: filename,
        outputFile: outputFilename,
        startTime: Date.now(),
      };
      tasks.set(taskId, task);
      activeTasks++;

      // 开始转换
      convertVideo(inputPath, outputPath, options, taskId);

      return new Response(JSON.stringify({ taskId, outputFilename }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 获取任务状态
  if (path.startsWith("/api/task/") && req.method === "GET") {
    const taskId = path.replace("/api/task/", "");
    const task = tasks.get(taskId);

    if (!task) {
      return new Response(JSON.stringify({ error: "任务不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 获取缩略图
  if (path === "/api/thumbnails" && req.method === "POST") {
    try {
      const body = await req.json();
      const { filename, count = 3 } = body;

      const inputPath = join(UPLOAD_DIR, filename);
      if (!existsSync(inputPath)) {
        return new Response(JSON.stringify({ error: "文件不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const thumbnails = await generateThumbnails(inputPath, count);
      return new Response(JSON.stringify({ thumbnails }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
}

function convertVideo(inputPath, outputPath, options, taskId) {
  const task = tasks.get(taskId);
  if (!task) return;

  const command = ffmpeg(inputPath);

  // 应用选项
  if (options.format) {
    command.format(options.format);
  }
  if (options.videoCodec) {
    command.videoCodec(options.videoCodec);
  }
  if (options.audioCodec) {
    command.audioCodec(options.audioCodec);
  }
  if (options.videoBitrate) {
    command.videoBitrate(options.videoBitrate);
  }
  if (options.audioBitrate) {
    command.audioBitrate(options.audioBitrate);
  }
  if (options.size) {
    command.size(options.size);
  }
  if (options.fps) {
    command.fps(options.fps);
  }
  if (options.preset) {
    command.preset(options.preset);
  }

  // 进度事件
  command.on("progress", (progress) => {
    task.progress = Math.round(progress.percent || 0);
    task.currentFps = progress.currentFps;
    task.currentKbps = progress.currentKbps;
    task.timemark = progress.timemark;
  });

  // 完成事件
  command.on("end", () => {
    task.status = "completed";
    task.progress = 100;
    task.endTime = Date.now();
    task.duration = task.endTime - task.startTime;
    activeTasks = Math.max(0, activeTasks - 1);
  });

  // 错误事件
  command.on("error", (err) => {
    task.status = "error";
    task.error = err.message;
    activeTasks = Math.max(0, activeTasks - 1);
  });

  // 开始转换
  command.save(outputPath);
}

async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          duration: metadata.format?.duration,
          size: metadata.format?.size,
          bitrate: metadata.format?.bit_rate,
          streams: metadata.streams?.map((s) => ({
            codec_type: s.codec_type,
            codec_name: s.codec_name,
            width: s.width,
            height: s.height,
            bit_rate: s.bit_rate,
          })),
        });
      }
    });
  });
}

async function generateThumbnails(inputPath, count) {
  return new Promise((resolve, reject) => {
    const thumbnails = [];
    const thumbDir = join(OUTPUT_DIR, "thumbnails");
    if (!existsSync(thumbDir)) {
      mkdir(thumbDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .on("filenames", (filenames) => {
        thumbnails.push(...filenames);
      })
      .on("end", () => {
        resolve(thumbnails);
      })
      .on("error", reject)
      .takeScreenshots(
        {
          count,
          folder: thumbDir,
          filename: `thumb-%i.png`,
          size: "320x240",
        },
        thumbDir
      );
  });
}

function getOutputExtension(format) {
  const extensions = {
    mp4: ".mp4",
    avi: ".avi",
    mkv: ".mkv",
    webm: ".webm",
    flv: ".flv",
    mov: ".mov",
  };
  return extensions[format] || ".mp4";
}

/**
 * 验证文件名是否安全（防止路径遍历攻击）
 */
function isValidFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return false;
  }
  // 禁止路径遍历字符
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  // 禁止控制字符
  if (/[\x00-\x1F\x7F]/.test(filename)) {
    return false;
  }
  return true;
}

/**
 * 清理文件名，移除危险字符
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .substring(0, 255);
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fluent-FFmpeg Web UI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .section h2 {
            margin-bottom: 20px;
            color: #333;
        }
        
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .upload-area:hover {
            background: #f0f4ff;
            border-color: #764ba2;
        }
        
        .upload-area.dragover {
            background: #e8f0fe;
            border-color: #764ba2;
        }
        
        input[type="file"] {
            display: none;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        
        select, input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .metadata-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .metadata-item strong {
            display: block;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Fluent-FFmpeg Web UI</h1>
            <p>上传视频并测试各种转换选项</p>
        </div>
        
        <div class="content">
            <!-- 上传区域 -->
            <div class="section">
                <h2>📤 上传视频</h2>
                <div class="upload-area" id="uploadArea">
                    <p>点击或拖拽文件到此处上传</p>
                    <input type="file" id="fileInput" accept="video/*">
                </div>
                <div id="fileInfo" style="display: none; margin-top: 20px;"></div>
            </div>
            
            <!-- 转换选项 -->
            <div class="section" id="optionsSection" style="display: none;">
                <h2>⚙️ 转换选项</h2>
                <div class="grid">
                    <div class="form-group">
                        <label>输出格式</label>
                        <select id="format">
                            <option value="mp4">MP4</option>
                            <option value="avi">AVI</option>
                            <option value="webm">WebM</option>
                            <option value="mkv">MKV</option>
                            <option value="flv">FLV</option>
                            <option value="mov">MOV</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>视频编码器</label>
                        <select id="videoCodec">
                            <option value="">自动</option>
                            <option value="libx264">H.264 (libx264)</option>
                            <option value="libx265">H.265 (libx265)</option>
                            <option value="vp9">VP9</option>
                            <option value="vp8">VP8</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>音频编码器</label>
                        <select id="audioCodec">
                            <option value="">自动</option>
                            <option value="aac">AAC</option>
                            <option value="libmp3lame">MP3</option>
                            <option value="opus">Opus</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>视频码率 (kbps)</label>
                        <input type="number" id="videoBitrate" placeholder="例如: 1000">
                    </div>
                    
                    <div class="form-group">
                        <label>音频码率 (kbps)</label>
                        <input type="number" id="audioBitrate" placeholder="例如: 128">
                    </div>
                    
                    <div class="form-group">
                        <label>分辨率</label>
                        <select id="size">
                            <option value="">原始尺寸</option>
                            <option value="1920x1080">1920x1080 (Full HD)</option>
                            <option value="1280x720">1280x720 (HD)</option>
                            <option value="854x480">854x480 (SD)</option>
                            <option value="640x360">640x360</option>
                            <option value="50%">50% 原始尺寸</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>帧率 (fps)</label>
                        <input type="number" id="fps" placeholder="例如: 30">
                    </div>
                    
                    <div class="form-group">
                        <label>预设</label>
                        <select id="preset">
                            <option value="">无</option>
                            <option value="flashvideo">Flash Video</option>
                            <option value="podcast">Podcast</option>
                            <option value="divx">DivX</option>
                        </select>
                    </div>
                </div>
                
                <button class="btn" id="convertBtn" style="width: 100%; margin-top: 20px;">
                    开始转换
                </button>
            </div>
            
            <!-- 进度 -->
            <div class="section" id="progressSection" style="display: none;">
                <h2>📊 转换进度</h2>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%">0%</div>
                </div>
                <div id="progressInfo"></div>
            </div>
            
            <!-- 结果 -->
            <div class="section" id="resultSection" style="display: none;">
                <h2>✅ 转换结果</h2>
                <div id="resultContent"></div>
            </div>
        </div>
    </div>
    
    <script>
        let currentFilename = null;
        let currentTaskId = null;
        let progressInterval = null;
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const optionsSection = document.getElementById('optionsSection');
        const progressSection = document.getElementById('progressSection');
        const resultSection = document.getElementById('resultSection');
        const convertBtn = document.getElementById('convertBtn');
        
        // 上传区域事件
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
        
        async function handleFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.success) {
                    currentFilename = data.filename;
                    displayFileInfo(data);
                    optionsSection.style.display = 'block';
                } else {
                    alert('上传失败: ' + data.error);
                }
            } catch (err) {
                alert('上传错误: ' + err.message);
            }
        }
        
        function displayFileInfo(data) {
            fileInfo.innerHTML = \`
                <div class="status info">
                    <strong>文件: \${data.originalName}</strong>
                </div>
                <div class="metadata">
                    <div class="metadata-item">
                        <strong>时长</strong>
                        \${formatDuration(data.metadata.duration)}
                    </div>
                    <div class="metadata-item">
                        <strong>文件大小</strong>
                        \${formatSize(data.metadata.size)}
                    </div>
                    <div class="metadata-item">
                        <strong>码率</strong>
                        \${formatBitrate(data.metadata.bitrate)}
                    </div>
                    <div class="metadata-item">
                        <strong>视频流</strong>
                        \${data.metadata.streams?.filter(s => s.codec_type === 'video').length || 0}
                    </div>
                    <div class="metadata-item">
                        <strong>音频流</strong>
                        \${data.metadata.streams?.filter(s => s.codec_type === 'audio').length || 0}
                    </div>
                </div>
            \`;
            fileInfo.style.display = 'block';
        }
        
        convertBtn.addEventListener('click', async () => {
            const options = {
                format: document.getElementById('format').value,
                videoCodec: document.getElementById('videoCodec').value || undefined,
                audioCodec: document.getElementById('audioCodec').value || undefined,
                videoBitrate: document.getElementById('videoBitrate').value || undefined,
                audioBitrate: document.getElementById('audioBitrate').value || undefined,
                size: document.getElementById('size').value || undefined,
                fps: document.getElementById('fps').value || undefined,
                preset: document.getElementById('preset').value || undefined,
            };
            
            try {
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: currentFilename, options })
                });
                
                const data = await response.json();
                if (data.taskId) {
                    currentTaskId = data.taskId;
                    progressSection.style.display = 'block';
                    resultSection.style.display = 'none';
                    convertBtn.disabled = true;
                    startProgressPolling();
                } else {
                    alert('转换失败: ' + data.error);
                }
            } catch (err) {
                alert('转换错误: ' + err.message);
            }
        });
        
        function startProgressPolling() {
            if (progressInterval) clearInterval(progressInterval);
            
            progressInterval = setInterval(async () => {
                try {
                    const response = await fetch(\`/api/task/\${currentTaskId}\`);
                    const task = await response.json();
                    
                    updateProgress(task);
                    
                    if (task.status === 'completed' || task.status === 'error') {
                        clearInterval(progressInterval);
                        convertBtn.disabled = false;
                        
                        if (task.status === 'completed') {
                            showResult(task);
                        } else {
                            alert('转换失败: ' + task.error);
                        }
                    }
                } catch (err) {
                    console.error('获取进度失败:', err);
                }
            }, 500);
        }
        
        function updateProgress(task) {
            const progressFill = document.getElementById('progressFill');
            const progressInfo = document.getElementById('progressInfo');
            
            progressFill.style.width = task.progress + '%';
            progressFill.textContent = task.progress + '%';
            
            let info = \`状态: \${task.status === 'processing' ? '处理中' : task.status}\`;
            if (task.currentFps) info += \` | FPS: \${task.currentFps}\`;
            if (task.currentKbps) info += \` | 码率: \${task.currentKbps} kbps\`;
            if (task.timemark) info += \` | 时间: \${task.timemark}\`;
            
            progressInfo.textContent = info;
        }
        
        function showResult(task) {
            resultSection.style.display = 'block';
            resultSection.innerHTML = \`
                <div class="status success">
                    <strong>转换完成！</strong>
                    <p>耗时: \${formatDuration(task.duration / 1000)}</p>
                </div>
                <div style="margin-top: 20px;">
                    <a href="/download/\${task.outputFile}" class="btn" download>
                        下载转换后的视频
                    </a>
                </div>
            \`;
        }
        
        function formatDuration(seconds) {
            if (!seconds) return '未知';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h > 0 ? \`\${h}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\` : \`\${m}:\${s.toString().padStart(2, '0')}\`;
        }
        
        function formatSize(bytes) {
            if (!bytes) return '未知';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        function formatBitrate(bits) {
            if (!bits) return '未知';
            return Math.round(bits / 1000) + ' kbps';
        }
    </script>
</body>
</html>`;
}

console.log(`🚀 Fluent-FFmpeg Web UI Server 运行在 http://localhost:${PORT}`);
console.log(`📁 上传目录: ${UPLOAD_DIR}`);
console.log(`📁 输出目录: ${OUTPUT_DIR}`);
