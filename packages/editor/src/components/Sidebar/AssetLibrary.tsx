import React, { useRef } from "react";
import { Upload, FileVideo, FileAudio, FileImage, Plus } from "lucide-react";
import { useTimelineStore } from "../../store/timeline";
import { Asset } from "../../types/timeline";

export const AssetLibrary: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { assets, addAsset, addClip, selectedAssetId, setSelectedAssetId, setEditorMode } =
    useTimelineStore();

  const handleAssetClick = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    if (asset.type === "image") {
      setEditorMode("image");
    } else {
      setEditorMode("video");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const type = file.type.split("/")[0] as Asset["type"];
      if (!["video", "audio", "image"].includes(type)) continue;

      const asset: Asset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        file,
      };

      addAsset(asset);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addToTimeline = (asset: Asset) => {
    const trackId = asset.type === "audio" ? "audio1" : "video1";
    const id = `clip-${Date.now()}`;
    const duration = 5;

    addClip(
      trackId,
      {
        id,
        start: 0,
        end: duration,
        effectId: id,
      },
      {
        id,
        name: asset.name,
        type:
          asset.type === "video"
            ? "video"
            : asset.type === "audio"
              ? "audio"
              : asset.type === "image"
                ? "image"
                : "text",
        asset: asset,
        properties: { x: 0, y: 0, scale: 1, opacity: 1 },
      }
    );
  };

  const getIcon = (type: Asset["type"]) => {
    switch (type) {
      case "video":
        return <FileVideo size={20} className="text-blue-400" />;
      case "audio":
        return <FileAudio size={20} className="text-purple-400" />;
      case "image":
        return <FileImage size={20} className="text-green-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 w-64 overflow-hidden shrink-0">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asset Library</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 hover:bg-slate-700 rounded text-blue-400 transition-colors"
          title="Import Media"
        >
          <Upload size={16} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/*,audio/*,image/*"
          multiple
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Object.values(assets).length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600 px-4 text-center">
            <Upload size={24} className="mb-2 opacity-20" />
            <p className="text-xs">Drag files here or click upload icon</p>
          </div>
        ) : (
          Object.values(assets).map((asset) => (
            <div
              key={asset.id}
              onClick={() => handleAssetClick(asset)}
              className={`group border rounded p-2 transition-all cursor-default flex items-center gap-3 ${
                selectedAssetId === asset.id
                  ? "bg-blue-500/20 border-blue-500/50"
                  : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50"
              }`}
            >
              <div className="w-10 h-10 bg-black rounded flex items-center justify-center shrink-0 overflow-hidden relative">
                {asset.type === "image" ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                ) : (
                  getIcon(asset.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate" title={asset.name}>
                  {asset.name}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">{asset.type}</p>
              </div>
              <button
                onClick={() => addToTimeline(asset)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-blue-400 transition-all"
                title="Add to Timeline"
              >
                <Plus size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
