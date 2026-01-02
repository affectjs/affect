import { Timeline } from "@xzdarcy/react-timeline-editor";
import { TimelineRow, useTimelineStore } from "@affectjs/editor-ui";

export const TimelineEditor: React.FC = () => {
  const {
    editorData,
    effects,
    scale,
    scaleSplitCount,
    setEditorData,
    setTime,
    setIsPlaying,
    setSelectedClipId,
    selectedClipId,
  } = useTimelineStore();

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-t border-slate-800">
      <div className="flex-1 overflow-hidden">
        <Timeline
          scale={scale}
          scaleSplitCount={scaleSplitCount}
          editorData={editorData}
          effects={effects as unknown}
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
          onClickAction={(_e, { action }) => {
            setSelectedClipId(action.id);
          }}
          data-selected-id={selectedClipId}
        />
      </div>
    </div>
  );
};
