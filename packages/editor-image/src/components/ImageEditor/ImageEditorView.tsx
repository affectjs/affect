import React from "react";
import { useTimelineStore } from "@affectjs/editor-ui";
import { Crop, Maximize, RotateCw, Sun, Contrast, Droplets } from "lucide-react";

export const ImageEditorView: React.FC = () => {
  const { assets, selectedAssetId } = useTimelineStore();
  const asset = selectedAssetId ? assets[selectedAssetId] : null;

  if (!asset || asset.type !== "image") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <p>Select an image from the library to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="relative shadow-2xl shadow-black/50 overflow-hidden bg-slate-900 border border-slate-800">
          <img
            src={asset.url}
            alt={asset.name}
            className="max-w-full max-h-full object-contain pointer-events-none"
            style={
              {
                // For now just basic display, later will be canvas/VIPS logic
              }
            }
          />
          {/* Interaction Overlays later */}
        </div>
      </div>

      {/* Image Specific Toolbar */}
      <div className="h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-center px-4 gap-6 shrink-0">
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <Crop size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Crop</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <Maximize size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Resize</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <RotateCw size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Rotate</span>
        </button>
        <div className="w-px h-6 bg-slate-800" />
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <Sun size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Light</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <Contrast size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Contrast</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors">
          <Droplets size={18} />
          <span className="text-[10px] uppercase font-bold tracking-tight">Blur</span>
        </button>
      </div>
    </div>
  );
};
