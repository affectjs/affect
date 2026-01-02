/*jshint node:true*/
import path from "path";

/*
 *! Miscellaneous methods
 */

import type { FfmpegCommand } from "../utils";
// Built-in presets
import * as divx from "../presets/divx";
import * as flashvideo from "../presets/flashvideo";
import * as podcast from "../presets/podcast";
import { createRequire } from "module";

const builtInPresets: Record<string, any> = {
  divx,
  flashvideo,
  podcast,
};

export default function (proto: FfmpegCommand) {
  /**
   * Use preset
   *
   * @method FfmpegCommand#preset
   * @category Miscellaneous
   * @aliases usingPreset
   *
   * @param {String|Function} preset preset name or preset function
   */
  proto.usingPreset = proto.preset = function (preset: string | ((...args: unknown[]) => unknown)) {
    if (typeof preset === "function") {
      preset(this);
    } else if (typeof preset === "string" && builtInPresets[preset]) {
      builtInPresets[preset].load(this);
    } else {
      try {
        const modulePath = path.isAbsolute(preset as string)
          ? (preset as string)
          : path.join(this.options.presets || "", preset as string);

        const require = createRequire(import.meta.url);
        const module = require(modulePath);

        if (typeof module.load === "function") {
          module.load(this);
        } else {
          throw new Error("preset " + modulePath + " has no load() function");
        }
      } catch (err: any) {
        throw new Error("preset " + preset + " could not be loaded: " + err.message);
      }
    }

    return this;
  };

  /**
   * Set process priority
   *
   * @method FfmpegCommand#renice
   * @category Miscellaneous
   * @aliases priority
   *
   * @param {Number} priority process priority from -20 to 20
   * @return FfmpegCommand
   */
  proto.priority = proto.renice = function (priority: number) {
    this.options.niceness = priority;
    return this;
  };
}
