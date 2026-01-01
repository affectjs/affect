import React, { useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Scissors } from "lucide-react";
import { useTimelineStore } from "../../store/timeline";
import { Button } from "../ui/button";

export const Controls: React.FC = () => {
  const { isPlaying, setIsPlaying, currentTime, setTime, duration, selectedClipId, removeClip } =
    useTimelineStore();

  const tickerRef = useRef<number>();

  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startCurrentTime = currentTime;

      const tick = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        let nextTime = startCurrentTime + elapsed;

        if (nextTime >= duration && duration > 0) {
          nextTime = duration;
          setIsPlaying(false);
        }

        setTime(nextTime);
        tickerRef.current = requestAnimationFrame(tick);
      };

      tickerRef.current = requestAnimationFrame(tick);
    } else {
      if (tickerRef.current) cancelAnimationFrame(tickerRef.current);
    }

    return () => {
      if (tickerRef.current) cancelAnimationFrame(tickerRef.current);
    };
  }, [isPlaying, duration, currentTime, setTime, setIsPlaying]);

  const handleSplit = () => {
    if (!selectedClipId) return;
    console.log("Split at", currentTime);
    // Split logic to be implemented
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTime(0)}>
          <SkipBack size={18} />
        </Button>
        <Button
          variant="primary"
          size="icon"
          className="rounded-full w-8 h-8"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setTime(duration)}>
          <SkipForward size={18} />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-slate-400">
          <span className="text-slate-200">{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSplit}
          disabled={!selectedClipId}
          className="gap-2"
        >
          <Scissors size={14} />
          Split
        </Button>
      </div>

      <div className="w-24 flex justify-end">
        <Button
          variant="danger"
          size="icon"
          onClick={() => selectedClipId && removeClip(selectedClipId)}
          disabled={!selectedClipId}
        >
          <Scissors size={14} className="rotate-45" /> {/* Delete surrogate */}
        </Button>
      </div>
    </div>
  );
};
