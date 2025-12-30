/*jshint node:true */
import type { FfmpegCommand } from "../utils";
export const load = function(ffmpeg: FfmpegCommand) {
  ffmpeg
    .format('flv')
    .flvmeta()
    .size('320x?')
    .videoBitrate('512k')
    .videoCodec('libx264')
    .fps(24)
    .audioBitrate('96k')
    .audioCodec('aac')
    .audioFrequency(22050)
    .audioChannels(2);
};
