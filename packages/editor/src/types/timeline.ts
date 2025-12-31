export interface TimelineState {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  isPlaying: boolean;
  currentTime: number;
  scale: number;
  scaleSplitCount: number;
}

export interface TimelineRow {
  id: string;
  actions: TimelineAction[];
}

export interface TimelineAction {
  id: string;
  start: number;
  end: number;
  effectId: string;
  movable?: boolean;
  flexible?: boolean;
}

export interface TimelineEffect {
  id: string;
  name: string;
  type: "video" | "audio";
  fileSource: FileSource; // Renamed from 'source' to avoid conflict
  duration?: number;
  source?: undefined; // Explicitly undefined to satisfy the strict type check if needed, or we just leave it optional
}

export interface FileSource {
  file: File;
  url: string; // Blob URL
}
