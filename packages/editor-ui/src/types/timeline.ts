export interface TimelineState {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  isPlaying: boolean;
  currentTime: number;
  scale: number;
  scaleSplitCount: number;
  selectedClipId: string | null;
  duration: number;
  editorMode: "video" | "image";
  selectedAssetId: string | null;
}

export interface TimelineRow {
  id: string;
  actions: TimelineAction[];
}

export interface ClipProperties {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
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
  type: "video" | "audio" | "image" | "text";
  asset?: Asset;
  properties?: ClipProperties;
}

export interface Asset {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  url: string; // Blob URL
  file?: File;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
  };
}
