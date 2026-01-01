import React from "react";
import { Play, Pause, Scissors, Trash2, ZoomIn, ZoomOut, Plus } from "lucide-react";
import { useTimelineStore } from "../../store/timeline";

export const Toolbar: React.FC = () => {
  const {
    isPlaying,
    setIsPlaying,
    removeClip,
    scale,
    setScale,
    addTrack,
    currentTime,
    duration,
    selectedClipId,
  } = useTimelineStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-2 gap-2 shrink-0 overflow-x-auto">
      {/* Playback Controls */}
      <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-200 transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </button>
        <div className="text-xs font-mono text-slate-400 w-24 text-center select-none">
          <span className="text-slate-200">{formatTime(currentTime)}</span>
          <span className="mx-0.5">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Edit Controls */}
      <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
        <button
          className="p-1.5 hover:bg-slate-700 rounded text-slate-200 disabled:opacity-30 transition-colors"
          title="Split Clip (Not implemented)"
          disabled={!selectedClipId}
        >
          <Scissors size={16} />
        </button>
        <button
          onClick={() => selectedClipId && removeClip(selectedClipId)}
          className="p-1.5 hover:bg-slate-700 rounded text-red-400 disabled:opacity-30 transition-colors"
          title="Delete Clip"
          disabled={!selectedClipId}
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => addTrack()}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-200 transition-colors"
          title="Add Track"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setScale(Math.max(1, scale - 1))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-200 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <div className="text-[10px] text-slate-500 w-8 text-center select-none">{scale}x</div>
        <button
          onClick={() => setScale(Math.min(20, scale + 1))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-200 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
};
