import React from "react";
import { useTimelineStore } from "@affectjs/editor-ui";

export const VideoPreview: React.FC = () => {
  const { currentTime, editorData, effects } = useTimelineStore();

  // Find all active clips at the current time
  const activeClips = React.useMemo(() => {
    const active = [];
    for (const row of editorData) {
      for (const action of row.actions) {
        if (currentTime >= action.start && currentTime <= action.end) {
          const effect = effects[action.effectId];
          if (effect && (effect.type === "video" || effect.type === "image")) {
            active.push({ action, effect });
          }
        }
      }
    }
    return active;
  }, [currentTime, editorData, effects]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {/* Simulation of a Canvas/Render Area */}
      <div className="relative w-[1280px] h-[720px] bg-slate-900 shadow-2xl scale-[0.4] md:scale-[0.6] lg:scale-[0.8] origin-center">
        {activeClips.map(({ action, effect }) => {
          const asset = effect.asset;
          if (!asset) return null;

          const props = effect.properties || { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 };
          const style: React.CSSProperties = {
            position: "absolute",
            left: `${props.x}px`,
            top: `${props.y}px`,
            transform: `translate(-50%, -50%) scale(${props.scale}) rotate(${props.rotation}deg)`,
            opacity: props.opacity,
            maxWidth: "none", // Allow transform to handle sizing
            pointerEvents: "none",
          };

          if (effect.type === "video") {
            return (
              <video
                key={action.id}
                src={asset.url}
                style={style}
                autoPlay
                muted
                loop
                playsInline
                ref={(el) => {
                  if (el) el.currentTime = currentTime - action.start;
                }}
              />
            );
          }

          if (effect.type === "image") {
            return <img key={action.id} src={asset.url} alt={effect.name} style={style} />;
          }

          return null;
        })}
      </div>
    </div>
  );
};
