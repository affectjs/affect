/*jshint node:true*/
"use strict";

/**
 * Setup script for fluent-ffmpeg test environment
 *
 * This script helps configure the environment for running tests by:
 * - Detecting ffmpeg and ffprobe binaries
 * - Checking version compatibility (supports FFmpeg 6.1.1+)
 * - Installing/updating ffmpeg to supported versions if needed
 * - Setting up environment variables
 * - Configuring paths for testing
 *
 * Note: This fork supports FFmpeg 6.1.1+. For FFmpeg 8.0+ support, see the 8.0 branch.
 */

var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var fs = require("fs");
var path = require("path");
var which = require("which");
var os = require("os");
var readline = require("readline");
var oraModule = require("ora");
var ora = oraModule.default || oraModule;

var platform = os.platform();
var isWindows = platform.match(/win(32|64)/);
var isMacOS = platform === "darwin";
var isLinux = platform === "linux";

// Minimum supported version: FFmpeg 6.1.1+
var MIN_VERSION_MAJOR = 6;
var MIN_VERSION_MINOR = 1;
var MIN_VERSION_PATCH = 1;

/**
 * Find executable in PATH
 * @param {String} name - executable name
 * @param {Function} callback - callback(err, path)
 */
function findExecutable(name, callback) {
  // First try environment variable
  var envVar = name.toUpperCase() + "_PATH";
  if (process.env[envVar]) {
    fs.access(process.env[envVar], fs.constants.F_OK, function (err) {
      if (!err) {
        return callback(null, process.env[envVar]);
      }
    });
  }

  // Then try which/where
  which(name, function (err, result) {
    if (err) {
      // Try with .exe extension on Windows
      if (isWindows) {
        which(name + ".exe", function (err2, result2) {
          callback(err2, result2);
        });
      } else {
        callback(err, null);
      }
    } else {
      callback(null, result);
    }
  });
}

/**
 * Get ffmpeg version
 * @param {String} ffmpegPath - path to ffmpeg
 * @param {Function} callback - callback(err, version)
 */
function getFfmpegVersion(ffmpegPath, callback) {
  exec('"' + ffmpegPath + '" -version', { timeout: 5000 }, function (err, stdout) {
    if (err) {
      return callback(err);
    }

    // Parse version from output like "ffmpeg version 4.4.2" or "ffmpeg version n4.4.2"
    var versionMatch = stdout.match(/ffmpeg version (?:n)?(\d+)\.(\d+)(?:\.(\d+))?/);
    var version = null;

    if (versionMatch) {
      version = {
        major: parseInt(versionMatch[1], 10),
        minor: parseInt(versionMatch[2], 10),
        patch: versionMatch[3] ? parseInt(versionMatch[3], 10) : 0,
        full: versionMatch[0].replace(/ffmpeg version (?:n)?/, ""),
      };
    }

    callback(null, version);
  });
}

/**
 * Check if version meets minimum requirements
 * Supports FFmpeg 6.1.1+ (this branch only, 8.0+ is in another branch)
 * @param {Object} version - version object with major, minor, patch
 * @return {Boolean} true if version is supported
 */
function isVersionSupported(version) {
  if (!version) {
    return false;
  }

  // Check for version 6.1.1+
  if (version.major > MIN_VERSION_MAJOR) {
    return true;
  }
  if (version.major === MIN_VERSION_MAJOR) {
    if (version.minor > MIN_VERSION_MINOR) {
      return true;
    }
    if (version.minor === MIN_VERSION_MINOR && version.patch >= MIN_VERSION_PATCH) {
      return true;
    }
  }

  return false;
}

/**
 * Check if package manager is available
 * @param {String} manager - package manager name (brew, apt, yum, choco, winget)
 * @param {Function} callback - callback(err, available)
 */
function checkPackageManager(manager, callback) {
  var command;
  switch (manager) {
    case "brew":
      command = "which brew";
      break;
    case "apt":
      command = "which apt-get";
      break;
    case "yum":
      command = "which yum";
      break;
    case "choco":
      command = "where choco";
      break;
    case "winget":
      command = "where winget";
      break;
    default:
      return callback(new Error("Unknown package manager: " + manager));
  }

  exec(command, function (err) {
    callback(null, !err);
  });
}

/**
 * Prompt user for input
 * @param {String} question - question to ask
 * @param {Function} callback - callback(err, answer)
 */
function promptUser(question, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(question, function (answer) {
    rl.close();
    callback(null, answer.trim().toLowerCase());
  });
}

/**
 * Install ffmpeg using appropriate package manager
 * @param {Object} options - installation options
 * @param {Function} callback - callback(err)
 */
function installFfmpeg(options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  options = options || {};

  // Determine package manager and install command
  if (isMacOS) {
    // Use brew to install/upgrade ffmpeg to ensure we get 6.1.1+
    checkPackageManager("brew", function (err, brewAvailable) {
      if (!brewAvailable) {
        return callback(
          new Error("Homebrew is required on macOS. Install it from https://brew.sh")
        );
      }

      // Check if ffmpeg is installed via brew
      exec("brew list ffmpeg 2>/dev/null", function (err) {
        var installCommand;
        var manager = "brew";

        if (err) {
          // Not installed, install it
          installCommand = "brew install ffmpeg";
        } else {
          // Already installed, upgrade to ensure we have 6.1.1+
          installCommand = "brew upgrade ffmpeg";
        }

        doInstall(manager, installCommand);
      });
    });
    return;
  } else if (isLinux) {
    // Try apt first, then yum
    checkPackageManager("apt", function (err, available) {
      if (available) {
        doInstall("apt", "sudo apt-get update && sudo apt-get install -y ffmpeg");
      } else {
        checkPackageManager("yum", function (err, available) {
          if (available) {
            doInstall("yum", "sudo yum install -y ffmpeg");
          } else {
            return callback(
              new Error("No supported package manager found (apt-get or yum required)")
            );
          }
        });
      }
    });
    return;
  } else if (isWindows) {
    // Try winget first, then choco
    checkPackageManager("winget", function (err, available) {
      if (available) {
        doInstall("winget", "winget install ffmpeg");
      } else {
        checkPackageManager("choco", function (err, available) {
          if (available) {
            doInstall("choco", "choco install ffmpeg -y");
          } else {
            return callback(
              new Error("No supported package manager found (winget or chocolatey required)")
            );
          }
        });
      }
    });
    return;
  } else {
    return callback(new Error("Unsupported operating system: " + platform));
  }

  function doInstall(manager, installCommand) {
    if (!options.autoInstall) {
      console.log("\nTo install ffmpeg, run the following command:\n  " + installCommand + "\n");
      return callback(new Error("ffmpeg installation required. Run: " + installCommand));
    }

    var spinner = options.silent ? null : ora("Installing ffmpeg using " + manager + "...").start();

    try {
      if (spinner) {
        spinner.text = "Running: " + installCommand;
      }
      execSync(installCommand, {
        stdio: options.silent ? "pipe" : "inherit",
        shell: true,
      });

      if (spinner) {
        spinner.succeed("FFmpeg installed/upgraded successfully!");
      }

      // On macOS with brew, verify the installed version meets requirements
      if (manager === "brew" && isMacOS) {
        if (spinner) {
          spinner.start("Verifying installed version...");
        }
        // Wait a moment for brew to update PATH, then verify version
        setTimeout(function () {
          findExecutable("ffmpeg", function (err, newPath) {
            if (newPath) {
              getFfmpegVersion(newPath, function (err, version) {
                if (!err && version) {
                  if (isVersionSupported(version)) {
                    if (spinner) {
                      spinner.succeed(
                        "Verified: FFmpeg " + version.full + " meets requirements (6.1.1+)"
                      );
                    }
                  } else {
                    if (spinner) {
                      spinner.warn(
                        "Installed FFmpeg " + version.full + " may not meet requirements (6.1.1+)"
                      );
                      console.warn(
                        "You may need to update brew: brew update && brew upgrade ffmpeg"
                      );
                    }
                  }
                } else if (spinner) {
                  spinner.stop();
                }
                callback(null);
              });
            } else {
              if (spinner) {
                spinner.stop();
              }
              callback(null);
            }
          });
        }, 1000);
      } else {
        callback(null);
      }
    } catch (err) {
      if (spinner) {
        spinner.fail("Failed to install ffmpeg: " + err.message);
      }
      callback(new Error("Failed to install ffmpeg: " + err.message));
    }
  }
}

/**
 * Setup environment for testing
 * @param {Object} options - setup options
 * @param {Function} callback - callback(err, config)
 */
function setup(options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  options = options || {};

  var config = {
    ffmpeg: null,
    ffprobe: null,
    ffmpegVersion: null,
    available: false,
  };

  var spinner = options.silent ? null : ora("Searching for ffmpeg...").start();

  // Find ffmpeg
  findExecutable("ffmpeg", function (err, ffmpegPath) {
    if (spinner) {
      if (err || !ffmpegPath) {
        spinner.warn("ffmpeg not found in PATH");
      } else {
        spinner.succeed("Found ffmpeg");
      }
    }
    if (err || !ffmpegPath) {
      // Try to install if auto-install is enabled
      if (options.install) {
        if (spinner) {
          spinner.start("Attempting to install ffmpeg...");
        }
        installFfmpeg({ autoInstall: true, silent: options.silent }, function (installErr) {
          if (installErr) {
            if (spinner) {
              spinner.fail("Installation failed: " + installErr.message);
            }
            if (options.required) {
              return callback(new Error("ffmpeg is required but not found"), config);
            }
            // Continue to check ffprobe
            checkFfprobe();
          } else {
            // Re-check after installation
            if (spinner) {
              spinner.start("Verifying installation...");
            }
            findExecutable("ffmpeg", function (err, newPath) {
              if (newPath) {
                config.ffmpeg = newPath;
                process.env.FFMPEG_PATH = newPath;
                if (spinner) {
                  spinner.succeed("FFmpeg installed at " + newPath);
                }
                // Continue with version check
                checkVersionAndFfprobe(newPath);
              } else {
                if (spinner) {
                  spinner.fail("FFmpeg installation completed but binary not found in PATH");
                }
                if (options.required) {
                  return callback(
                    new Error("ffmpeg installation completed but binary not found in PATH"),
                    config
                  );
                }
                checkFfprobe();
              }
            });
          }
        });
      } else {
        if (options.required) {
          return callback(new Error("ffmpeg is required but not found"), config);
        }
        // Continue to check ffprobe even if ffmpeg is not found
        checkFfprobe();
      }
    } else {
      checkVersionAndFfprobe(ffmpegPath);
    }

    function checkVersionAndFfprobe(ffmpegPath) {
      config.ffmpeg = ffmpegPath;
      // Set environment variable if not already set
      if (!process.env.FFMPEG_PATH) {
        process.env.FFMPEG_PATH = ffmpegPath;
      }

      var versionSpinner = options.silent ? null : ora("Checking FFmpeg version...").start();

      // Get version
      getFfmpegVersion(ffmpegPath, function (err, version) {
        if (!err && version) {
          config.ffmpegVersion = version;
          var isSupported = isVersionSupported(version);

          if (versionSpinner) {
            if (isSupported) {
              versionSpinner.succeed("FFmpeg " + version.full + " (meets requirements 6.1.1+)");
            } else {
              versionSpinner.warn(
                "FFmpeg " + version.full + " (below 6.1.1+, not fully supported)"
              );
            }
          }

          if (!isSupported) {
            if (options.install) {
              var installSpinner = options.silent
                ? null
                : ora("Attempting to install/update ffmpeg...").start();
              installFfmpeg(
                {
                  autoInstall: true,
                  silent: options.silent,
                },
                function (installErr) {
                  if (installErr) {
                    if (installSpinner) {
                      installSpinner.fail("Installation failed: " + installErr.message);
                    }
                    // Continue with existing version
                    checkFfprobe();
                  } else {
                    // Re-check after installation
                    if (installSpinner) {
                      installSpinner.start("Verifying updated version...");
                    }
                    findExecutable("ffmpeg", function (err, newPath) {
                      if (newPath) {
                        config.ffmpeg = newPath;
                        process.env.FFMPEG_PATH = newPath;
                        getFfmpegVersion(newPath, function (err, newVersion) {
                          if (!err && newVersion) {
                            config.ffmpegVersion = newVersion;
                            if (installSpinner) {
                              installSpinner.succeed("Updated to FFmpeg " + newVersion.full);
                            }
                          } else if (installSpinner) {
                            installSpinner.stop();
                          }
                          checkFfprobe();
                        });
                      } else {
                        if (installSpinner) {
                          installSpinner.stop();
                        }
                        checkFfprobe();
                      }
                    });
                  }
                }
              );
              return;
            } else if (options.required) {
              return callback(
                new Error(
                  "FFmpeg version " +
                    version.full +
                    " is not supported. Required: 6.1.1+ (for 8.0+ support, see the 8.0 branch)"
                ),
                config
              );
            }
          }
        }

        checkFfprobe();

        function checkFfprobe() {
          var probeSpinner = options.silent ? null : ora("Searching for ffprobe...").start();

          // Find ffprobe
          findExecutable("ffprobe", function (err, ffprobePath) {
            if (err || !ffprobePath) {
              if (probeSpinner) {
                probeSpinner.warn("ffprobe not found in PATH");
              }
              if (options.required) {
                return callback(new Error("ffprobe is required but not found"), config);
              }
            } else {
              config.ffprobe = ffprobePath;
              // Set environment variable if not already set
              if (!process.env.FFPROBE_PATH) {
                process.env.FFPROBE_PATH = ffprobePath;
              }
              if (probeSpinner) {
                probeSpinner.succeed("Found ffprobe");
              }
            }

            config.available = !!(config.ffmpeg && config.ffprobe);
            callback(null, config);
          });
        }
      });
    }

    function checkFfprobe() {
      findExecutable("ffprobe", function (err, ffprobePath) {
        if (err || !ffprobePath) {
          if (!options.silent) {
            console.warn("Warning: ffprobe not found in PATH");
          }
          if (options.required) {
            return callback(new Error("ffprobe is required but not found"), config);
          }
        } else {
          config.ffprobe = ffprobePath;
          if (!process.env.FFPROBE_PATH) {
            process.env.FFPROBE_PATH = ffprobePath;
          }
          if (!options.silent) {
            console.log("Found ffprobe at " + ffprobePath);
          }
        }
        config.available = !!(config.ffmpeg && config.ffprobe);
        callback(null, config);
      });
    }
  });
}

/**
 * Setup and configure fluent-ffmpeg paths
 * @param {Object} options - setup options
 * @param {Function} callback - callback(err, config)
 */
function setupFluentFfmpeg(options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  setup(options, function (err, config) {
    if (err) {
      return callback(err, config);
    }

    // Configure fluent-ffmpeg if paths are found
    if (config.ffmpeg || config.ffprobe) {
      // Use relative path from scripts directory to root
      var Ffmpeg = require("../index");

      if (config.ffmpeg) {
        Ffmpeg.setFfmpegPath(config.ffmpeg);
      }

      if (config.ffprobe) {
        Ffmpeg.setFfprobePath(config.ffprobe);
      }
    }

    callback(null, config);
  });
}

// Export functions
module.exports = {
  setup: setup,
  setupFluentFfmpeg: setupFluentFfmpeg,
  findExecutable: findExecutable,
  getFfmpegVersion: getFfmpegVersion,
  isVersionSupported: isVersionSupported,
  installFfmpeg: installFfmpeg,
  checkPackageManager: checkPackageManager,
};

// Export functions for use in CLI
// Note: Direct execution is handled by cli.ts, so we don't need the if (require.main === module) block
