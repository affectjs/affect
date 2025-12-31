import React from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useTimelineStore } from "../../store/timeline";

/**
 * 播放控制组件
 * 提供播放、暂停、跳转等控制功能
 */
export const Controls: React.FC = () => {
  const { currentTime, duration, isPlaying, setTime, setIsPlaying } =
    useTimelineStore();

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 播放/暂停切换
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // 跳转到开始
  const skipToStart = () => {
    setTime(0);
    setIsPlaying(false);
  };

  // 跳转到结束
  const skipToEnd = () => {
    setTime(duration);
    setIsPlaying(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm p-4">
      <div className="flex items-center gap-4">
        {/* 播放控制按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={skipToStart}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            aria-label="跳转到开始"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            aria-label={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={skipToEnd}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            aria-label="跳转到结束"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 时间显示 */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-white font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-sm text-slate-400">/</span>
          <span className="text-sm text-slate-400 font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* 进度条 */}
        <div className="flex-[2] relative h-1 bg-slate-600 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-blue-500"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
