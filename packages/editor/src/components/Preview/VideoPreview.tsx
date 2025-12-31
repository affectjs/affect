import React, { useRef, useEffect } from "react";
import { useTimelineStore } from "../../store/timeline";

/**
 * 视频预览组件
 * 负责显示当前编辑的视频预览
 */
export const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentTime, isPlaying, setTime, setIsPlaying } = useTimelineStore();

  // 同步时间线当前时间到视频
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = currentTime;
  }, [currentTime]);

  // 同步播放状态
  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch((err) => {
        console.error("播放失败:", err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 处理视频时间更新
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setTime(e.currentTarget.currentTime);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="max-w-full max-h-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};
