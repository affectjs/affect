import React from "react";
import { useTimelineStore } from "../../store/timeline";

/**
 * 属性检查器组件
 * 显示和编辑选中片段的属性
 */
export const Inspector: React.FC = () => {
  const { selectedClipId, editorData } = useTimelineStore();

  // 查找选中的片段
  const selectedClip = React.useMemo(() => {
    if (!selectedClipId) return null;

    for (const row of editorData) {
      const clip = row.actions.find((action) => action.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, editorData]);

  if (!selectedClip) {
    return (
      <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 text-slate-400 text-sm">
        未选中任何片段
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 p-4">
      <div className="space-y-4">
        {/* 标题 */}
        <div className="text-white font-semibold text-lg border-b border-slate-700 pb-2">
          属性检查器
        </div>

        {/* 基本信息 */}
        <div className="space-y-2">
          <div className="text-sm text-slate-400">基本信息</div>
          <div className="bg-slate-900 rounded p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">开始时间</span>
              <span className="text-white font-mono">
                {selectedClip.start.toFixed(2)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">结束时间</span>
              <span className="text-white font-mono">
                {selectedClip.end.toFixed(2)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">持续时间</span>
              <span className="text-white font-mono">
                {(selectedClip.end - selectedClip.start).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* 效果列表 */}
        <div className="space-y-2">
          <div className="text-sm text-slate-400">效果</div>
          <div className="bg-slate-900 rounded p-3 text-sm text-slate-400">
            暂无效果
          </div>
        </div>

        {/* 变换 */}
        <div className="space-y-2">
          <div className="text-sm text-slate-400">变换</div>
          <div className="bg-slate-900 rounded p-3 text-sm text-slate-400">
            暂无变换
          </div>
        </div>
      </div>
    </div>
  );
};
