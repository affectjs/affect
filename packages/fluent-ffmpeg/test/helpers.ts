/*jshint node:true*/
import fs from "fs";
import os from "os";

interface FfmpegError {
  stack?: string;
  ffmpegOut?: string;
  ffmpegErr?: string;
  spawnErr?: { stack?: string };
}

const TestHelpers = {
  getFfmpegCheck: function (): string {
    // First check FFMPEG_PATH environment variable
    if (process.env.FFMPEG_PATH) {
      try {
        if (fs.existsSync(process.env.FFMPEG_PATH)) {
          // Return a command that will succeed (test -f)
          return 'test -f "' + process.env.FFMPEG_PATH + '"';
        }
      } catch {
        // Fall through to default check
      }
    }

    const platform = os.platform();

    if (!platform.match(/win(32|64)/)) {
      // linux/mac, use which
      return "which ffmpeg";
    } else {
      // windows, use where (> windows server 2003 / windows 7)
      return "where /Q ffmpeg";
    }
  },

  logger: {
    debug: function (arg: unknown) {
      if (process.env.FLUENTFFMPEG_COV !== "1") console.log("          [DEBUG] " + arg);
    },
    info: function (arg: unknown) {
      if (process.env.FLUENTFFMPEG_COV !== "1") console.log("          [INFO] " + arg);
    },
    warn: function (arg: unknown) {
      if (process.env.FLUENTFFMPEG_COV !== "1") console.log("          [WARN] " + arg);
    },
    error: function (arg: unknown) {
      if (process.env.FLUENTFFMPEG_COV !== "1") console.log("          [ERROR] " + arg);
    },
  },

  logArgError: function (err: unknown) {
    if (err) {
      const error = err as FfmpegError;
      console.log("Error constructor: " + (err as any).constructor?.name);
      try {
        console.log("got error: " + (error.stack || JSON.stringify(error)));
      } catch (e) {
        console.log("got error (circular or unstringifiable): " + error);
      }
      if (error.ffmpegOut) {
        console.log("---stdout---");
        console.log(error.ffmpegOut);
      }
      if (error.ffmpegErr) {
        console.log("---stderr---");
        console.log(error.ffmpegErr);
      }
      if (error.spawnErr) {
        console.log("---spawn error---");
        console.log(error.spawnErr.stack || error.spawnErr);
      }
    }
  },

  logError: function (err: unknown, stdout?: string, stderr?: string) {
    if (err) {
      const error = err as FfmpegError;
      console.log("Error constructor: " + (err as any).constructor?.name);
      try {
        console.log("got error: " + (error.stack || JSON.stringify(error)));
      } catch (e) {
        console.log("got error (circular or unstringifiable): " + error);
      }
      if (error.ffmpegOut) {
        console.log("---metadata stdout---");
        console.log(error.ffmpegOut);
      }
      if (error.ffmpegErr) {
        console.log("---metadata stderr---");
        console.log(error.ffmpegErr);
      }
      if (error.spawnErr) {
        console.log("---metadata spawn error---");
        console.log(error.spawnErr.stack || error.spawnErr);
      }
      if (stdout) {
        console.log("---stdout---");
        console.log(stdout);
      }
      if (stderr) {
        console.log("---stderr---");
        console.log(stderr);
      }
    }
  },

  logOutput: function (stdout?: string, stderr?: string) {
    if (stdout) {
      console.log("---stdout---");
      console.log(stdout);
    }
    if (stderr) {
      console.log("---stderr---");
      console.log(stderr);
    }
  },
};

export default TestHelpers;
