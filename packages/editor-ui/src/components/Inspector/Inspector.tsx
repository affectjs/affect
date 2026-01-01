import React from "react";
import { useTimelineStore } from "../../store/timeline";
import { Move, Maximize, Ghost } from "lucide-react";

export const Inspector: React.FC = () => {
  const { selectedClipId, editorData, effects, updateClipProperties } = useTimelineStore();

  const selectedClip = React.useMemo(() => {
    if (!selectedClipId) return null;
    for (const row of editorData) {
      const clip = row.actions.find((action) => action.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, editorData]);

  const effect = selectedClip ? effects[selectedClip.effectId] : null;

  if (!selectedClip || !effect) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <Maximize size={20} className="text-slate-600" />
        </div>
        <p className="text-sm text-slate-500 font-medium">
          Select a clip on the timeline to inspect properties
        </p>
      </div>
    );
  }

  const props = effect.properties || { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 };

  const handleUpdate = (newProps: Partial<typeof props>) => {
    updateClipProperties(effect.id, newProps);
  };

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-800/50 shrink-0">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inspector</h2>
        <p className="text-sm font-semibold text-slate-200 mt-1 truncate">{effect.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Transform */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Move size={14} />
            <h3 className="text-xs font-bold uppercase tracking-tight">Transform</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">X Position</label>
              <input
                type="number"
                value={props.x || 0}
                onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">Y Position</label>
              <input
                type="number"
                value={props.y || 0}
                onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">Scale</label>
              <input
                type="number"
                step="0.01"
                value={props.scale || 1}
                onChange={(e) => handleUpdate({ scale: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">Rotation</label>
              <div className="relative">
                <input
                  type="number"
                  value={props.rotation || 0}
                  onChange={(e) => handleUpdate({ rotation: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none transition-colors"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-600">°</span>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Ghost size={14} />
            <h3 className="text-xs font-bold uppercase tracking-tight">Appearance</h3>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 uppercase">Opacity</label>
              <span className="text-[10px] text-slate-400">
                {Math.round((props.opacity || 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={props.opacity || 1}
              onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </section>

        {/* Time Info */}
        <section className="pt-4 border-t border-slate-800 space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500 uppercase">Start</span>
            <span className="text-slate-300 font-mono">{selectedClip.start.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500 uppercase">Duration</span>
            <span className="text-slate-300 font-mono">
              {(selectedClip.end - selectedClip.start).toFixed(2)}s
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
