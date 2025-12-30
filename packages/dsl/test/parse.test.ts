/**
 * @affectjs/dsl - Parser Tests
 *
 * Exhaustive tests for DSL parsing covering all possible usage scenarios
 */

import { describe, it, expect } from "vitest";
import { parseDsl, parseDslFile, compileDsl, compileDslFile } from "../src/index";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("DSL Parser - Exhaustive Tests", () => {
  describe("Basic AffectBlock Syntax", () => {
    it("should parse video with hardcoded paths", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.type).toBe("AffectBlock");
      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("video");
        expect(ast.commands[0].type).toBe("Input");
        expect(ast.commands[0].path.type).toBe("Literal");
        expect(ast.commands[0].path.value).toBe("input.mp4");
        expect(ast.commands[1].type).toBe("Resize");
        expect(ast.commands[2].type).toBe("Save");
        expect(ast.commands[2].path.type).toBe("Literal");
        expect(ast.commands[2].path.value).toBe("output.mp4");
      }
    });

    it("should parse audio with hardcoded paths", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { encode mp3 192 }';
      const ast = parseDsl(dsl);

      expect(ast.type).toBe("AffectBlock");
      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("audio");
      }
    });

    it("should parse image with hardcoded paths", () => {
      const dsl = 'affect image "input.jpg" "output.jpg" { resize 1920 1080 }';
      const ast = parseDsl(dsl);

      expect(ast.type).toBe("AffectBlock");
      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("image");
      }
    });

    it("should parse auto media type", () => {
      const dsl = 'affect auto "input.mp4" "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.type).toBe("AffectBlock");
      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("auto");
      }
    });
  });

  describe("Context Variables", () => {
    it("should parse $input variable", () => {
      const dsl = 'affect auto $input "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.type).toBe("Variable");
      expect(ast.commands[0].path.name).toBe("input");
    });

    it("should parse $output variable", () => {
      const dsl = 'affect auto "input.mp4" $output { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[2].path.type).toBe("Variable");
      expect(ast.commands[2].path.name).toBe("output");
    });

    it("should parse both $input and $output variables", () => {
      const dsl = "affect auto $input $output { resize 1280 720 }";
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.type).toBe("Variable");
      expect(ast.commands[0].path.name).toBe("input");
      expect(ast.commands[2].path.type).toBe("Variable");
      expect(ast.commands[2].path.name).toBe("output");
    });

    it("should parse custom variable names", () => {
      const dsl = "affect auto $myInput $myOutput { resize 1280 720 }";
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.name).toBe("myInput");
      expect(ast.commands[2].path.name).toBe("myOutput");
    });

    it("should parse variables with underscores", () => {
      const dsl = "affect auto $input_file $output_file { resize 1280 720 }";
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.name).toBe("input_file");
      expect(ast.commands[2].path.name).toBe("output_file");
    });

    it("should parse variables with numbers", () => {
      const dsl = "affect auto $input1 $output2 { resize 1280 720 }";
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.name).toBe("input1");
      expect(ast.commands[2].path.name).toBe("output2");
    });
  });

  describe("Resize Command", () => {
    it("should parse resize with width and height", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      const resize = ast.commands.find((cmd) => cmd.type === "Resize");
      expect(resize).toBeDefined();
      expect(resize.width).toBe(1280);
      expect(resize.height).toBe(720);
    });

    it("should parse resize with auto height", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 auto }';
      const ast = parseDsl(dsl);

      const resize = ast.commands.find((cmd) => cmd.type === "Resize");
      expect(resize.width).toBe(1280);
      expect(resize.height).toBe("auto");
    });

    it("should parse resize with percentage", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 50% }';
      const ast = parseDsl(dsl);

      const resize = ast.commands.find((cmd) => cmd.type === "Resize");
      expect(resize.width).toBe("50%");
    });

    it("should parse resize with only width (height null)", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 }';
      const ast = parseDsl(dsl);

      const resize = ast.commands.find((cmd) => cmd.type === "Resize");
      expect(resize.width).toBe(1280);
      expect(resize.height).toBeNull();
    });
  });

  describe("Encode Command", () => {
    it("should parse video encode with codec and bitrate", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { encode h264 2000 }';
      const ast = parseDsl(dsl);

      const encode = ast.commands.find((cmd) => cmd.type === "Encode");
      expect(encode).toBeDefined();
      expect(encode.codec).toBe("h264");
      expect(encode.param).toBe(2000);
    });

    it("should parse audio encode with codec and bitrate", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { encode mp3 192 }';
      const ast = parseDsl(dsl);

      const encode = ast.commands.find((cmd) => cmd.type === "Encode");
      expect(encode.codec).toBe("mp3");
      expect(encode.param).toBe(192);
    });

    it("should parse encode without param", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { encode h264 }';
      const ast = parseDsl(dsl);

      const encode = ast.commands.find((cmd) => cmd.type === "Encode");
      expect(encode.codec).toBe("h264");
      expect(encode.param).toBeNull();
    });

    it("should parse encode with string param", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { encode h264 "high" }';
      const ast = parseDsl(dsl);

      const encode = ast.commands.find((cmd) => cmd.type === "Encode");
      expect(encode.codec).toBe("h264");
      expect(encode.param).toBe("high");
    });

    it("should parse multiple encode commands", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { encode h264 2000 encode aac 128 }';
      const ast = parseDsl(dsl);

      const encodes = ast.commands.filter((cmd) => cmd.type === "Encode");
      expect(encodes.length).toBe(2);
      expect(encodes[0].codec).toBe("h264");
      expect(encodes[1].codec).toBe("aac");
    });
  });

  describe("Filter Command", () => {
    it("should parse filter with name only", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { filter grayscale }';
      const ast = parseDsl(dsl);

      const filter = ast.commands.find((cmd) => cmd.type === "Filter");
      expect(filter).toBeDefined();
      expect(filter.name).toBe("grayscale");
      expect(filter.value).toBeNull();
    });

    it("should parse filter with name and numeric value", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { filter blur 5 }';
      const ast = parseDsl(dsl);

      const filter = ast.commands.find((cmd) => cmd.type === "Filter");
      expect(filter.name).toBe("blur");
      expect(filter.value).toBe(5);
    });

    it("should parse filter with name and string value", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { filter preset "slow" }';
      const ast = parseDsl(dsl);

      const filter = ast.commands.find((cmd) => cmd.type === "Filter");
      expect(filter.name).toBe("preset");
      expect(filter.value).toBe("slow");
    });

    it("should parse multiple filters", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { filter blur 5 filter brightness 1.2 }';
      const ast = parseDsl(dsl);

      const filters = ast.commands.filter((cmd) => cmd.type === "Filter");
      expect(filters.length).toBe(2);
    });
  });

  describe("Crop Command", () => {
    it("should parse crop with x, y, width, height", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { crop 0 0 640 480 }';
      const ast = parseDsl(dsl);

      const crop = ast.commands.find((cmd) => cmd.type === "Crop");
      expect(crop).toBeDefined();
      expect(crop.x).toBe(0);
      expect(crop.y).toBe(0);
      expect(crop.width).toBe(640);
      expect(crop.height).toBe(480);
    });

    it("should parse crop with center and auto", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { crop center auto 640 480 }';
      const ast = parseDsl(dsl);

      const crop = ast.commands.find((cmd) => cmd.type === "Crop");
      expect(crop.x).toBe("center");
      expect(crop.y).toBe("auto");
    });

    it("should parse crop with region string", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { crop "center" 640 480 }';
      const ast = parseDsl(dsl);

      const crop = ast.commands.find((cmd) => cmd.type === "Crop");
      expect(crop.region).toBe("center");
    });
  });

  describe("Rotate Command", () => {
    it("should parse rotate with angle", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { rotate 90 }';
      const ast = parseDsl(dsl);

      const rotate = ast.commands.find((cmd) => cmd.type === "Rotate");
      expect(rotate).toBeDefined();
      expect(rotate.angle).toBe(90);
      expect(rotate.flip).toBeNull();
    });

    it("should parse rotate with angle and flip", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { rotate 180 "horizontal" }';
      const ast = parseDsl(dsl);

      const rotate = ast.commands.find((cmd) => cmd.type === "Rotate");
      expect(rotate.angle).toBe(180);
      expect(rotate.flip).toBe("horizontal");
    });
  });

  describe("Multiple Operations", () => {
    it("should parse multiple operations in sequence", () => {
      const dsl =
        'affect video "input.mp4" "output.mp4" { resize 1280 720 encode h264 2000 filter blur 5 }';
      const ast = parseDsl(dsl);

      expect(ast.commands.length).toBe(5); // Input, Resize, Encode, Filter, Save
      expect(ast.commands[1].type).toBe("Resize");
      expect(ast.commands[2].type).toBe("Encode");
      expect(ast.commands[3].type).toBe("Filter");
    });

    it("should parse complex video processing pipeline", () => {
      const dsl = `
affect video "input.mp4" "output.mp4" {
  resize 1920 1080
  encode h264 2000
  encode aac 128
  filter fps 30
  filter brightness 1.1
}`;
      const ast = parseDsl(dsl);

      const operations = ast.commands.filter((cmd) => cmd.type !== "Input" && cmd.type !== "Save");
      expect(operations.length).toBe(5);
    });
  });

  describe("Output Path Handling", () => {
    it("should parse affect block without output path", () => {
      const dsl = 'affect video "input.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands.length).toBe(2); // Input, Resize
      expect(ast.commands[0].type).toBe("Input");
      expect(ast.commands[1].type).toBe("Resize");
      // No Save command
    });

    it("should parse affect block with output path", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      const save = ast.commands.find((cmd) => cmd.type === "Save");
      expect(save).toBeDefined();
      expect(save.path.value).toBe("output.mp4");
    });

    it("should parse save command inside block", () => {
      const dsl = 'affect video "input.mp4" { resize 1280 720 save "output.mp4" }';
      const ast = parseDsl(dsl);

      const save = ast.commands.find((cmd) => cmd.type === "Save");
      expect(save).toBeDefined();
    });
  });

  describe("String Literals", () => {
    it("should parse double-quoted strings", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.value).toBe("input.mp4");
      expect(ast.commands[2].path.value).toBe("output.mp4");
    });

    it("should parse single-quoted strings", () => {
      const dsl = "affect video 'input.mp4' 'output.mp4' { resize 1280 720 }";
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.value).toBe("input.mp4");
      expect(ast.commands[2].path.value).toBe("output.mp4");
    });

    it("should parse strings with spaces", () => {
      const dsl = 'affect video "my input file.mp4" "my output file.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.value).toBe("my input file.mp4");
      expect(ast.commands[2].path.value).toBe("my output file.mp4");
    });

    it("should parse strings with escape sequences", () => {
      const dsl = 'affect video "input\\"file.mp4" "output\\nfile.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.value).toContain('"');
      expect(ast.commands[2].path.value).toContain("\n");
    });
  });

  describe("Edge Cases", () => {
    it("should parse empty operations block", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { }';
      const ast = parseDsl(dsl);

      expect(ast.commands.length).toBe(2); // Input, Save
    });

    it("should parse with only whitespace", () => {
      const dsl = 'affect   video   "input.mp4"   "output.mp4"   {   resize   1280   720   }';
      const ast = parseDsl(dsl);

      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("video");
        expect(ast.commands[1].type).toBe("Resize");
      }
    });

    it("should parse with newlines and tabs", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
\tresize 1280 720
\tencode h264 2000
}`;
      const ast = parseDsl(dsl);

      expect(ast.commands[1].type).toBe("Resize");
      expect(ast.commands[2].type).toBe("Encode");
    });

    it("should handle mixed variable and literal", () => {
      const dsl = 'affect auto $input "output.mp4" { resize 1280 720 }';
      const ast = parseDsl(dsl);

      expect(ast.commands[0].path.type).toBe("Variable");
      expect(ast.commands[2].path.type).toBe("Literal");
    });
  });

  describe("Error Cases", () => {
    it("should throw error for invalid syntax", () => {
      expect(() => {
        parseDsl("invalid syntax");
      }).toThrow();
    });

    it("should throw error for missing media type", () => {
      expect(() => {
        parseDsl('affect "input.mp4" "output.mp4" { resize 1280 720 }');
      }).toThrow();
    });

    it("should throw error for missing input", () => {
      // Note: According to grammar, input is required.
      // The DSL 'affect video "output.mp4" { resize 1280 720 }'
      // actually parses "output.mp4" as input (which is valid).
      // To test missing input, we need an invalid syntax.
      expect(() => {
        parseDsl("affect video { resize 1280 720 }");
      }).toThrow();
    });

    it("should throw error for unclosed block", () => {
      expect(() => {
        parseDsl('affect video "input.mp4" "output.mp4" { resize 1280 720');
      }).toThrow();
    });
  });

  describe("File Parsing - Usage Examples", () => {
    it("should parse DSL from assets/create-video.affect file (comprehensive usage example)", () => {
      const usageFile = join(__dirname, "assets/create-video.affect");
      const ast = parseDslFile(usageFile);

      // Verify basic structure
      expect(ast.type).toBe("AffectBlock");
      if (ast.type === "AffectBlock") {
        expect(ast.mediaType).toBe("auto");

        // Verify input variable
        expect(ast.commands[0].type).toBe("Input");
        expect(ast.commands[0].path.type).toBe("Variable");
        expect(ast.commands[0].path.name).toBe("input");

        // Verify output variable
        const saveCmd = ast.commands.find((cmd) => cmd.type === "Save");
        expect(saveCmd).toBeDefined();
        if (saveCmd) {
          expect(saveCmd.path.type).toBe("Variable");
          expect(saveCmd.path.name).toBe("output");
        }

        // Verify various command types are present
        const commandTypes = ast.commands.map((cmd) => cmd.type);
        expect(commandTypes).toContain("Resize");
        expect(commandTypes).toContain("Encode");
        expect(commandTypes).toContain("VideoBlock");
        expect(commandTypes).toContain("AudioBlock");
        expect(commandTypes).toContain("FilterBlock");
        expect(commandTypes).toContain("Crop");
        expect(commandTypes).toContain("Rotate");
        expect(commandTypes).toContain("Timeout");
        expect(commandTypes).toContain("Format");

        // Verify VideoBlock contains VideoCodec, VideoBitrate, VideoFPS
        const videoBlock = ast.commands.find((cmd) => cmd.type === "VideoBlock");
        expect(videoBlock).toBeDefined();
        if (videoBlock && videoBlock.commands) {
          const videoBlockTypes = videoBlock.commands.map((cmd) => cmd.type);
          expect(videoBlockTypes).toContain("VideoCodec");
          expect(videoBlockTypes).toContain("VideoBitrate");
          expect(videoBlockTypes).toContain("VideoFPS");
        }

        // Verify AudioBlock contains AudioCodec, AudioBitrate, etc.
        const audioBlock = ast.commands.find((cmd) => cmd.type === "AudioBlock");
        expect(audioBlock).toBeDefined();
        if (audioBlock && audioBlock.commands) {
          const audioBlockTypes = audioBlock.commands.map((cmd) => cmd.type);
          expect(audioBlockTypes).toContain("AudioCodec");
          expect(audioBlockTypes).toContain("AudioBitrate");
          expect(audioBlockTypes).toContain("AudioChannels");
          expect(audioBlockTypes).toContain("AudioFrequency");
        }

        // Verify FilterBlock contains Filter commands
        const filterBlock = ast.commands.find((cmd) => cmd.type === "FilterBlock");
        expect(filterBlock).toBeDefined();
        if (filterBlock && filterBlock.commands) {
          const filterTypes = filterBlock.commands.map((cmd) => cmd.type);
          expect(filterTypes).toContain("Filter");
        }

        // Verify command count (Input + operations + Save)
        expect(ast.commands.length).toBeGreaterThan(10);
      }
    });
  });

  describe("Grouped Commands Syntax", () => {
    it("should parse video block with grouped commands", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  video {
    codec "libx264"
    bitrate "1M"
    fps 30
  }
}`;
      const ast = parseDsl(dsl);
      expect(ast.type).toBe("AffectBlock");
      const videoBlock = ast.commands.find((cmd) => cmd.type === "VideoBlock");
      expect(videoBlock).toBeDefined();
      expect(videoBlock.commands.length).toBe(3);
    });

    it("should parse audio block with grouped commands", () => {
      const dsl = `affect audio "input.wav" "output.mp3" {
  audio {
    codec "aac"
    bitrate 128
    channels 2
  }
}`;
      const ast = parseDsl(dsl);
      const audioBlock = ast.commands.find((cmd) => cmd.type === "AudioBlock");
      expect(audioBlock).toBeDefined();
      expect(audioBlock.commands.length).toBe(3);
    });

    it("should parse filter block with grouped commands", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  filter {
    blur
    grayscale
  }
}`;
      const ast = parseDsl(dsl);
      const filterBlock = ast.commands.find((cmd) => cmd.type === "FilterBlock");
      expect(filterBlock).toBeDefined();
      expect(filterBlock.commands.length).toBe(2);
    });

    it("should parse mixed grouped and flat commands", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  resize 1280 720
  video {
    codec "libx264"
  }
  audio codec "aac"
}`;
      const ast = parseDsl(dsl);
      expect(ast.commands.some((cmd) => cmd.type === "VideoBlock")).toBe(true);
      expect(ast.commands.some((cmd) => cmd.type === "AudioCodec")).toBe(true);
    });
  });

  describe("Compiler Tests", () => {
    it("should compile basic DSL to Operations", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const compiled = compileDsl(dsl);
      expect(compiled).toBeDefined();
      expect(compiled.input).toBe("input.mp4");
      expect(compiled.output).toBe("output.mp4");
      expect(compiled.mediaType).toBe("video");
      expect(compiled.operations).toBeDefined();
      expect(compiled.operations.length).toBeGreaterThan(0);
      const resizeOp = compiled.operations.find((op) => op.type === "resize");
      expect(resizeOp).toBeDefined();
    });

    it("should compile DSL with context variables", () => {
      const dsl = "affect auto $input $output { resize 1280 720 }";
      const compiled = compileDsl(dsl, {
        context: { input: "test.mp4", output: "out.mp4" },
      });
      expect(compiled.input).toBe("test.mp4");
      expect(compiled.output).toBe("out.mp4");
    });

    it("should compile grouped commands correctly", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  video {
    codec "libx264"
    fps 30
  }
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.operations).toBeDefined();
      // Video codec and fps should be in operations
      const hasVideoCodec = compiled.operations.some(
        (op) => op.type === "encode" && op.codec === "libx264"
      );
      expect(hasVideoCodec).toBe(true);
    });

    it("should compile operations correctly", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { resize 1280 720 }';
      const compiled = compileDsl(dsl);
      expect(compiled.operations).toBeDefined();
      expect(Array.isArray(compiled.operations)).toBe(true);
    });
  });

  describe("Media Type Filtering and Warnings", () => {
    it("should ignore video and audio commands for image media type", () => {
      const dsl = `affect image "input.jpg" "output.jpg" {
  resize 1920 1080
  video {
    codec "libx264"
  }
  audio {
    codec "aac"
  }
  filter grayscale
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.mediaType).toBe("image");
      // Video and audio encode operations should be filtered out for images
      const videoEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "libx264"
      );
      const audioEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "aac"
      );
      expect(videoEncodeOps.length).toBe(0);
      expect(audioEncodeOps.length).toBe(0);
      // Filter operations should be kept
      const filterOps = compiled.operations.filter((op) => op.type === "filter");
      expect(filterOps.length).toBeGreaterThan(0);
    });

    it("should show warnings for ignored video/audio commands in image", () => {
      const dsl = `affect image "input.jpg" "output.jpg" {
  video {
    codec "libx264"
  }
  audio {
    codec "aac"
  }
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.warnings).toBeDefined();
      expect(compiled.warnings?.length).toBeGreaterThan(0);
      const hasVideoWarning = compiled.warnings?.some((w) =>
        w.includes("video commands are ignored")
      );
      const hasAudioWarning = compiled.warnings?.some((w) =>
        w.includes("audio commands are ignored")
      );
      expect(hasVideoWarning).toBe(true);
      expect(hasAudioWarning).toBe(true);
    });

    it("should ignore video commands for audio media type", () => {
      const dsl = `affect audio "input.wav" "output.mp3" {
  encode mp3 192
  video {
    codec "libx264"
  }
  audio {
    codec "aac"
  }
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.mediaType).toBe("audio");
      // Video encode should be filtered out
      const videoEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "libx264"
      );
      expect(videoEncodeOps.length).toBe(0);
      // Audio encode should be kept
      const audioEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && (op.codec === "mp3" || op.codec === "aac")
      );
      expect(audioEncodeOps.length).toBeGreaterThan(0);
    });

    it("should show warnings for ignored video commands in audio", () => {
      const dsl = `affect audio "input.wav" "output.mp3" {
  video {
    codec "libx264"
  }
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.warnings).toBeDefined();
      expect(compiled.warnings?.length).toBeGreaterThan(0);
      const hasVideoWarning = compiled.warnings?.some((w) =>
        w.includes("video commands are ignored")
      );
      expect(hasVideoWarning).toBe(true);
    });

    it("should not show warnings when warnings are disabled", () => {
      const dsl = `affect image "input.jpg" "output.jpg" {
  video {
    codec "libx264"
  }
}`;
      const compiled = compileDsl(dsl, { warnings: false });
      expect(compiled.warnings).toBeUndefined();
    });

    it("should keep all commands for video media type", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  video {
    codec "libx264"
  }
  audio {
    codec "aac"
  }
  filter grayscale
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.mediaType).toBe("video");
      // All operations should be kept for video
      const videoEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "libx264"
      );
      const audioEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "aac"
      );
      const filterOps = compiled.operations.filter((op) => op.type === "filter");
      expect(videoEncodeOps.length).toBeGreaterThan(0);
      expect(audioEncodeOps.length).toBeGreaterThan(0);
      expect(filterOps.length).toBeGreaterThan(0);
      expect(compiled.warnings).toBeUndefined();
    });

    it("should keep all commands for auto media type", () => {
      const dsl = `affect auto "input.mp4" "output.mp4" {
  video {
    codec "libx264"
  }
  audio {
    codec "aac"
  }
}`;
      const compiled = compileDsl(dsl);
      expect(compiled.mediaType).toBe("auto");
      // All operations should be kept for auto
      const videoEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "libx264"
      );
      const audioEncodeOps = compiled.operations.filter(
        (op) => op.type === "encode" && op.codec === "aac"
      );
      expect(videoEncodeOps.length).toBeGreaterThan(0);
      expect(audioEncodeOps.length).toBeGreaterThan(0);
      expect(compiled.warnings).toBeUndefined();
    });
  });

  describe("Video Commands", () => {
    it("should parse video codec command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { video codec "libx264" }';
      const ast = parseDsl(dsl);
      const videoCodec = ast.commands.find((cmd) => cmd.type === "VideoCodec");
      expect(videoCodec).toBeDefined();
      expect(videoCodec.codec).toBe("libx264");
    });

    it("should parse video bitrate command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { video bitrate "1M" }';
      const ast = parseDsl(dsl);
      const videoBitrate = ast.commands.find((cmd) => cmd.type === "VideoBitrate");
      expect(videoBitrate).toBeDefined();
      expect(videoBitrate.bitrate).toBe("1M");
    });

    it("should parse video fps command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { video fps 30 }';
      const ast = parseDsl(dsl);
      const videoFPS = ast.commands.find((cmd) => cmd.type === "VideoFPS");
      expect(videoFPS).toBeDefined();
      expect(videoFPS.fps).toBe(30);
    });

    it("should parse no video command", () => {
      const dsl = 'affect video "input.mp4" "output.mp3" { no video }';
      const ast = parseDsl(dsl);
      const noVideo = ast.commands.find((cmd) => cmd.type === "NoVideo");
      expect(noVideo).toBeDefined();
    });
  });

  describe("Audio Commands", () => {
    it("should parse audio codec command", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { audio codec "aac" }';
      const ast = parseDsl(dsl);
      const audioCodec = ast.commands.find((cmd) => cmd.type === "AudioCodec");
      expect(audioCodec).toBeDefined();
      expect(audioCodec.codec).toBe("aac");
    });

    it("should parse audio bitrate command", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { audio bitrate 128 }';
      const ast = parseDsl(dsl);
      const audioBitrate = ast.commands.find((cmd) => cmd.type === "AudioBitrate");
      expect(audioBitrate).toBeDefined();
      expect(audioBitrate.bitrate).toBe(128);
    });

    it("should parse audio channels command", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { audio channels 2 }';
      const ast = parseDsl(dsl);
      const audioChannels = ast.commands.find((cmd) => cmd.type === "AudioChannels");
      expect(audioChannels).toBeDefined();
      expect(audioChannels.channels).toBe(2);
    });

    it("should parse audio frequency command", () => {
      const dsl = 'affect audio "input.wav" "output.mp3" { audio frequency 44100 }';
      const ast = parseDsl(dsl);
      const audioFrequency = ast.commands.find((cmd) => cmd.type === "AudioFrequency");
      expect(audioFrequency).toBeDefined();
      expect(audioFrequency.frequency).toBe(44100);
    });

    it("should parse no audio command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { no audio }';
      const ast = parseDsl(dsl);
      const noAudio = ast.commands.find((cmd) => cmd.type === "NoAudio");
      expect(noAudio).toBeDefined();
    });
  });

  describe("Options Commands", () => {
    it("should parse timeout command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { timeout 300 }';
      const ast = parseDsl(dsl);
      const timeout = ast.commands.find((cmd) => cmd.type === "Timeout");
      expect(timeout).toBeDefined();
      expect(timeout.timeout).toBe(300);
    });

    it("should parse format command", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { format "mp4" }';
      const ast = parseDsl(dsl);
      const format = ast.commands.find((cmd) => cmd.type === "Format");
      expect(format).toBeDefined();
      expect(format.format).toBe("mp4");
    });
  });

  describe("Event Handlers", () => {
    it("should parse on start event", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { on start "handler" }';
      const ast = parseDsl(dsl);
      const onStart = ast.commands.find((cmd) => cmd.type === "OnStart");
      expect(onStart).toBeDefined();
    });

    it("should parse on end event", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { on end "handler" }';
      const ast = parseDsl(dsl);
      const onEnd = ast.commands.find((cmd) => cmd.type === "OnEnd");
      expect(onEnd).toBeDefined();
    });

    it("should parse on error event", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { on error "handler" }';
      const ast = parseDsl(dsl);
      const onError = ast.commands.find((cmd) => cmd.type === "OnError");
      expect(onError).toBeDefined();
    });

    it("should parse on progress event", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { on progress "handler" }';
      const ast = parseDsl(dsl);
      const onProgress = ast.commands.find((cmd) => cmd.type === "OnProgress");
      expect(onProgress).toBeDefined();
    });
  });

  describe("Conditional Logic (if/else)", () => {
    it("should parse simple if statement", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { if width > 1920 { resize 1920 auto } }';
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.condition.type).toBe("Comparison");
        expect(ifBlock.condition.operator).toBe(">");
        expect(ifBlock.thenCommands.length).toBe(1);
        expect(ifBlock.thenCommands[0].type).toBe("Resize");
      }
    });

    it("should parse if-else statement", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  } else {
    resize 1280 720
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.thenCommands.length).toBe(1);
        expect(ifBlock.elseCommands.length).toBe(1);
        expect(ifBlock.thenCommands[0].type).toBe("Resize");
        expect(ifBlock.elseCommands[0].type).toBe("Resize");
      }
    });

    it("should parse comparison operators", () => {
      const operators = [">", "<", ">=", "<=", "==", "!="];
      operators.forEach((op) => {
        const dsl = `affect video "input.mp4" "output.mp4" { if width ${op} 1920 { resize 1920 auto } }`;
        const ast = parseDsl(dsl);
        const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
        expect(ifBlock).toBeDefined();
        if (ifBlock) {
          expect(ifBlock.condition.operator).toBe(op);
        }
      });
    });

    it("should parse logical and expression", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 and height > 1080 {
    resize 1920 1080
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.condition.type).toBe("LogicalAnd");
        expect(ifBlock.condition.left.type).toBe("Comparison");
        expect(ifBlock.condition.right.type).toBe("Comparison");
      }
    });

    it("should parse logical or expression", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 or height > 1080 {
    resize 1920 1080
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.condition.type).toBe("LogicalOr");
      }
    });

    it("should parse unary not expression", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if not processed {
    resize 1920 1080
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.condition.type).toBe("UnaryNot");
      }
    });

    it("should parse property access in conditions", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock && ifBlock.condition.type === "Comparison") {
        expect(ifBlock.condition.left.type).toBe("Property");
        expect(ifBlock.condition.left.name).toBe("width");
      }
    });

    it("should parse multiple commands in if block", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
    encode h264 2000
  }
}`;
      const ast = parseDsl(dsl);

      const ifBlock = ast.commands.find((cmd) => cmd.type === "IfBlock");
      expect(ifBlock).toBeDefined();
      if (ifBlock) {
        expect(ifBlock.thenCommands.length).toBe(2);
        expect(ifBlock.thenCommands[0].type).toBe("Resize");
        expect(ifBlock.thenCommands[1].type).toBe("Encode");
      }
    });

    it("should compile if statement correctly", () => {
      const dsl = 'affect video "input.mp4" "output.mp4" { if width > 1920 { resize 1920 auto } }';
      const compiled = compileDsl(dsl);

      expect(compiled.operations).toBeDefined();
      const ifOp = compiled.operations.find((op) => op.type === "if");
      expect(ifOp).toBeDefined();
      if (ifOp && ifOp.type === "if") {
        expect(ifOp.condition).toBeDefined();
        expect(ifOp.thenOperations).toBeDefined();
      }
    });

    it("should compile if-else statement correctly", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  } else {
    resize 1280 720
  }
}`;
      const compiled = compileDsl(dsl);

      expect(compiled.operations).toBeDefined();
      const ifOp = compiled.operations.find((op) => op.type === "if");
      expect(ifOp).toBeDefined();
      if (ifOp && ifOp.type === "if") {
        expect(ifOp.condition).toBeDefined();
        expect(ifOp.thenOperations).toBeDefined();
        expect(ifOp.elseOperations).toBeDefined();
      }
    });

    it("should compile logical expressions correctly", () => {
      const dsl = `affect video "input.mp4" "output.mp4" {
  if width > 1920 and height > 1080 {
    resize 1920 1080
  }
}`;
      const compiled = compileDsl(dsl);

      expect(compiled.operations).toBeDefined();
      const ifOp = compiled.operations.find((op) => op.type === "if");
      expect(ifOp).toBeDefined();
      if (ifOp && ifOp.type === "if") {
        expect(ifOp.condition).toBeDefined();
      }
    });
  });
});
