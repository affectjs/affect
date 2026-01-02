import { execSync } from "child_process";

// Mimic scripts/setup-env.sh
if (!process.env.FFMPEG_PATH || !process.env.FFPROBE_PATH) {
  try {
    const output = execSync("pnpm exec fluent-setup setup --json", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const data = JSON.parse(output);

    if (data.config && data.config.ffmpeg) {
      process.env.FFMPEG_PATH = data.config.ffmpeg;
    }
    if (data.config && data.config.ffprobe) {
      process.env.FFPROBE_PATH = data.config.ffprobe;
    }
  } catch (e: unknown) {
    console.warn("Failed to auto-configure FFmpeg paths via fluent-setup:", e.message);
  }
}
