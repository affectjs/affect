/*jshint node:true*/
import utils from "../utils";

/**
 * Return filters to pad video to width*height,
 *
 * @param {Number} width output width
 * @param {Number} height output height
 * @param {Number} aspect video aspect ratio (without padding)
 * @param {Number} color padding color
 * @return scale/pad filters
 * @private
 */
function getScalePadFilters(width: number, height: number, aspect: number, color: string) {
  return [
    {
      filter: "scale",
      options: {
        w: "if(gt(a," + aspect + ")," + width + ",trunc(" + height + "*a/2)*2)",
        h: "if(lt(a," + aspect + ")," + height + ",trunc(" + width + "/a/2)*2)",
      },
    },
    {
      filter: "pad",
      options: {
        w: width,
        h: height,
        x: "if(gt(a," + aspect + "),0,(" + width + "-iw)/2)",
        y: "if(lt(a," + aspect + "),0,(" + height + "-ih)/2)",
        color: color,
      },
    },
  ];
}

/**
 * Recompute size filters
 *
 * @param {Object} output
 * @param {String} key newly-added parameter name ('size', 'aspect' or 'pad')
 * @param {String} value newly-added parameter value
 * @return filter string array
 * @private
 */
function createSizeFilters(output: any, key: string, value: any) {
  if (!output) return [];
  const data = (output.sizeData = output.sizeData || {});
  data[key] = value;

  if (!("size" in data)) {
    return [];
  }

  const fixedSize = data.size.match(/([0-9]+)x([0-9]+)/);
  const fixedWidth = data.size.match(/([0-9]+)x\?/);
  const fixedHeight = data.size.match(/\?x([0-9]+)/);
  const percentRatio = data.size.match(/\b([0-9]{1,3})%/);
  let width, height, aspect;

  if (percentRatio) {
    const ratio = Number(percentRatio[1]) / 100;
    return [
      {
        filter: "scale",
        options: {
          w: "trunc(iw*" + ratio + "/2)*2",
          h: "trunc(ih*" + ratio + "/2)*2",
        },
      },
    ];
  } else if (fixedSize) {
    width = Math.round(Number(fixedSize[1]) / 2) * 2;
    height = Math.round(Number(fixedSize[2]) / 2) * 2;
    aspect = width / height;

    if (data.pad) {
      return getScalePadFilters(width, height, aspect, data.pad);
    } else {
      return [{ filter: "scale", options: { w: width, h: height } }];
    }
  } else if (fixedWidth || fixedHeight) {
    if ("aspect" in data) {
      width = fixedWidth ? fixedWidth[1] : Math.round(Number(fixedHeight[1]) * data.aspect);
      height = fixedHeight ? fixedHeight[1] : Math.round(Number(fixedWidth[1]) / data.aspect);
      width = Math.round(width / 2) * 2;
      height = Math.round(height / 2) * 2;

      if (data.pad) {
        return getScalePadFilters(width, height, data.aspect, data.pad);
      } else {
        return [{ filter: "scale", options: { w: width, h: height } }];
      }
    } else {
      if (fixedWidth) {
        return [
          {
            filter: "scale",
            options: {
              w: Math.round(Number(fixedWidth[1]) / 2) * 2,
              h: "trunc(ow/a/2)*2",
            },
          },
        ];
      } else {
        return [
          {
            filter: "scale",
            options: {
              w: "trunc(oh*a/2)*2",
              h: Math.round(Number(fixedHeight[1]) / 2) * 2,
            },
          },
        ];
      }
    }
  } else {
    throw new Error("Invalid size specified: " + data.size);
  }
}

import type { FfmpegCommand } from "../utils";
export default function (proto: FfmpegCommand) {
  proto.keepPixelAspect =
    proto.keepDisplayAspect =
    proto.keepDisplayAspectRatio =
    proto.keepDAR =
      function () {
        return (this as any).videoFilters([
          {
            filter: "scale",
            options: {
              w: "if(gt(sar,1),iw*sar,iw)",
              h: "if(lt(sar,1),ih/sar,ih)",
            },
          },
          {
            filter: "setsar",
            options: "1",
          },
        ]);
      };

  proto.withSize =
    proto.setSize =
    proto.size =
      function (size: string) {
        const filters = createSizeFilters(this._currentOutput, "size", size);
        this._currentOutput.sizeFilters(filters);
        return this;
      };

  proto.withAspect =
    proto.withAspectRatio =
    proto.setAspect =
    proto.setAspectRatio =
    proto.aspect =
    proto.aspectRatio =
      function (aspect: string | number) {
        let a = Number(aspect);
        if (isNaN(a)) {
          const match = (aspect as string).match(/^(\d+):(\d+)$/);
          if (match) {
            a = Number(match[1]) / Number(match[2]);
          } else {
            throw new Error("Invalid aspect ratio: " + aspect);
          }
        }

        const filters = createSizeFilters(this._currentOutput, "aspect", a);
        this._currentOutput.sizeFilters.clear();
        this._currentOutput.sizeFilters(filters);
        return this;
      };

  proto.applyAutopadding =
    proto.applyAutoPadding =
    proto.applyAutopad =
    proto.applyAutoPad =
    proto.withAutopadding =
    proto.withAutoPadding =
    proto.withAutopad =
    proto.withAutoPad =
    proto.autoPad =
    proto.autopad =
      function (pad?: boolean | string, color?: string) {
        if (typeof pad === "string") {
          color = pad;
          pad = true;
        }
        if (typeof pad === "undefined") {
          pad = true;
        }

        const filters = createSizeFilters(
          this._currentOutput,
          "pad",
          pad ? color || "black" : false
        );
        this._currentOutput.sizeFilters.clear();
        this._currentOutput.sizeFilters(filters);
        return this;
      };
}
