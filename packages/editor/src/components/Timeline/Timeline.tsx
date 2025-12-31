import React from "react";
import { Timeline } from "@xzdarcy/react-timeline-editor";
import { useTimelineStore } from "../../store/timeline";
import { TimelineRow } from "../../types/timeline";

export const TimelineEditor: React.FC = () => {
  const { editorData, effects, scale, scaleSplitCount, setEditorData, setTime, setIsPlaying } =
    useTimelineStore();

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white">
      <div className="flex-1 overflow-hidden">
        <Timeline
          scale={scale}
          scaleSplitCount={scaleSplitCount}
          editorData={editorData}
          effects={effects}
          onChange={(data) => {
            setEditorData(data as TimelineRow[]);
          }}
          autoScroll={true}
          disableDrag={false}
          onClickTimeArea={(time: number) => {
            setTime(time);
            setIsPlaying(false);
            return true;
          }}
        />
      </div>
    </div>
  );
};
