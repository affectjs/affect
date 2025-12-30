#!/usr/bin/env node

/**
 * 交互式示例运行脚本
 * 允许用户从列表中选择并运行一个示例
 */

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const readline = require("readline");
const ora = require("ora");

// 示例文件列表及其描述
const examples = [
    {
        file: "any-to-mp4-steam.js",
        name: "Any to MP4 Stream",
        description: "将任何视频格式转换为 MP4（使用流）",
    },
    {
        file: "express-stream.js",
        name: "Express Stream",
        description: "Express.js 服务器流式视频转换示例",
    },
    {
        file: "full.js",
        name: "Full Conversion",
        description: "完整的视频转换示例（包含所有选项）",
    },
    {
        file: "image2video.js",
        name: "Image to Video",
        description: "将图片转换为视频",
    },
    {
        file: "input-stream.js",
        name: "Input Stream",
        description: "从输入流处理视频",
    },
    {
        file: "livertmp2hls.js",
        name: "RTMP to HLS",
        description: "将 RTMP 直播流转换为 HLS",
    },
    {
        file: "mergeVideos.js",
        name: "Merge Videos",
        description: "合并多个视频文件",
    },
    {
        file: "metadata.js",
        name: "Metadata",
        description: "提取视频元数据",
    },
    {
        file: "preset.js",
        name: "Preset",
        description: "使用预设进行视频转换",
    },
    {
        file: "progress.js",
        name: "Progress",
        description: "监控转换进度",
    },
    {
        file: "stream.js",
        name: "Stream",
        description: "流式视频转换",
    },
    {
        file: "thumbnails.js",
        name: "Thumbnails",
        description: "生成视频缩略图",
    },
    {
        file: "web-ui-server.js",
        name: "Web UI Server",
        description: "基于 Bun 的 Web 界面，上传视频并测试转换功能",
        requiresBun: true,
    },
];

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

/**
 * 检查 FFmpeg 是否可用
 * @returns {Promise<{available: boolean, message?: string}>}
 */
function checkFfmpeg() {
    return new Promise((resolve) => {
        const spinner = ora("检查 FFmpeg 环境").start();

        // 首先检查环境变量
        if (process.env.FFMPEG_PATH) {
            try {
                if (fs.existsSync(process.env.FFMPEG_PATH)) {
                    spinner.succeed("FFmpeg 环境检查通过");
                    resolve({ available: true });
                    return;
                }
            } catch (e) {
                // 继续检查 PATH
            }
        }

        // 检查 PATH 中的 ffmpeg
        const platform = require("os").platform();
        let checkCommand;
        let shell = false;

        if (platform.match(/win(32|64)/)) {
            // Windows - 使用 where 命令
            checkCommand = "where ffmpeg";
            shell = true;
        } else {
            // Linux/Mac - 使用 which 命令
            checkCommand = "which ffmpeg";
        }

        try {
            const result = execSync(checkCommand, {
                stdio: "pipe",
                shell: shell,
                encoding: "utf8",
            });
            // 如果命令成功执行且有输出，说明找到了
            if (result && result.trim().length > 0) {
                spinner.succeed("FFmpeg 环境检查通过");
                resolve({ available: true });
            } else {
                throw new Error("FFmpeg not found");
            }
        } catch (e) {
            spinner.fail("FFmpeg 未找到");
            const installInstructions = platform.match(/win(32|64)/)
                ? "     - Windows: 从 https://ffmpeg.org/download.html 下载并添加到 PATH"
                : platform === "darwin"
                ? "     - macOS: brew install ffmpeg"
                : "     - Ubuntu/Debian: sudo apt-get install ffmpeg\n     - CentOS/RHEL: sudo yum install ffmpeg";

            resolve({
                available: false,
                message: `\n请先安装 FFmpeg 或运行设置命令：

  1. 安装 FFmpeg:
${installInstructions}

  2. 或者运行设置命令来配置 FFmpeg 路径:
     pnpm exec fluent-ffmpeg-cli setup

  3. 或者设置环境变量:
     export FFMPEG_PATH=/path/to/ffmpeg
     export FFPROBE_PATH=/path/to/ffprobe`,
            });
        }
    });
}

/**
 * 显示示例列表
 */
function showExamples() {
    console.log("\n可用示例列表：\n");
    examples.forEach((example, index) => {
        console.log(
            `  ${(index + 1).toString().padStart(2)}. ${example.name.padEnd(
                20
            )} - ${example.description}`
        );
    });
    console.log(`  ${(examples.length + 1).toString().padStart(2)}. 退出\n`);
}

/**
 * 运行选定的示例
 */
function runExample(index) {
    const example = examples[index];
    const examplePath = path.join(__dirname, "examples", example.file);

    // 检查文件是否存在
    if (!fs.existsSync(examplePath)) {
        const spinner = ora();
        spinner.fail(`示例文件不存在: ${examplePath}`);
        process.exit(1);
    }

    // 检查是否需要 Bun
    if (example.requiresBun) {
        try {
            execSync("which bun", { stdio: "ignore" });
        } catch (e) {
            const spinner = ora();
            spinner.fail("此示例需要 Bun 运行时");
            console.error("\n请先安装 Bun: https://bun.sh");
            console.error("或使用: pnpm run web-ui\n");
            process.exit(1);
        }
    }

    // 显示示例信息
    console.log("\n" + "=".repeat(60));
    console.log(`示例: ${example.name}`);
    console.log(`文件: ${example.file}`);
    console.log(`描述: ${example.description}`);
    console.log("=".repeat(60) + "\n");

    const spinner = ora(`正在启动示例: ${example.name}`).start();

    // 运行示例 - 根据文件类型选择运行时
    const runtime = example.requiresBun ? "bun" : "node";
    const child = spawn(runtime, [examplePath], {
        stdio: "inherit", // 保持 inherit 以便示例输出正常显示
        cwd: path.join(__dirname, "examples"),
    });

    // 短暂延迟后停止 spinner，让示例输出正常显示
    setTimeout(() => {
        spinner.stop();
    }, 500);

    child.on("error", (err) => {
        spinner.fail(`运行错误: ${err.message}`);

        // 如果是 FFmpeg 未找到的错误，提供更友好的提示
        if (err.message.includes("ffmpeg") || err.code === "ENOENT") {
            console.error("\n提示: 看起来 FFmpeg 未正确配置。");
            console.error("请运行: pnpm exec fluent-ffmpeg-cli setup");
        }

        process.exit(1);
    });

    child.on("exit", (code) => {
        console.log(); // 添加空行
        if (code === 0) {
            const successSpinner = ora();
            successSpinner.succeed(`示例 "${example.name}" 执行完成`);
        } else {
            const failSpinner = ora();
            failSpinner.fail(
                `示例 "${example.name}" 执行失败 (退出码: ${code})`
            );
        }
        process.exit(code);
    });
}

/**
 * 主函数
 */
async function main() {
    // 检查 FFmpeg 是否可用
    const ffmpegCheck = await checkFfmpeg();
    if (!ffmpegCheck.available) {
        console.error("\n" + "=".repeat(60));
        console.error("错误: FFmpeg 环境未配置");
        console.error("=".repeat(60));
        console.error(ffmpegCheck.message);
        console.error("=".repeat(60) + "\n");
        process.exit(1);
    }

    console.log(); // 添加空行以分隔检查结果和示例列表

    // 检查是否提供了命令行参数
    const args = process.argv.slice(2);

    if (args.length > 0) {
        // 如果提供了参数，直接运行指定的示例
        const input = args[0];
        const index = parseInt(input, 10) - 1;

        if (isNaN(index) || index < 0 || index >= examples.length) {
            const spinner = ora();
            spinner.fail(`无效的示例编号 "${input}"`);
            console.log(`请使用 1-${examples.length} 之间的数字\n`);
            process.exit(1);
        }

        runExample(index);
        return;
    }

    // 交互式模式
    showExamples();

    rl.question("请选择要运行的示例 (输入数字): ", (answer) => {
        const index = parseInt(answer, 10) - 1;

        if (
            answer === (examples.length + 1).toString() ||
            answer.toLowerCase() === "q" ||
            answer.toLowerCase() === "quit"
        ) {
            const spinner = ora();
            spinner.info("退出");
            rl.close();
            process.exit(0);
        }

        if (isNaN(index) || index < 0 || index >= examples.length) {
            const spinner = ora();
            spinner.fail(`无效的选择 "${answer}"`);
            console.log(`请使用 1-${examples.length + 1} 之间的数字\n`);
            rl.close();
            process.exit(1);
        }

        rl.close();
        runExample(index);
    });
}

// 处理 Ctrl+C
process.on("SIGINT", () => {
    const spinner = ora();
    spinner.warn("\n已取消");
    rl.close();
    process.exit(0);
});

// 运行主函数
main();
