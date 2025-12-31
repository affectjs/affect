import { create } from "zustand";
import { TimelineState, TimelineRow, TimelineAction, TimelineEffect } from "../types/timeline";

interface TimelineStore extends TimelineState {
  // 基础状态设置
  setEditorData: (data: TimelineRow[]) => void;
  setTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setScale: (scale: number) => void;

  // 轨道和片段管理
  addTrack: (trackId?: string) => void;
  addClip: (trackId: string, clip: TimelineAction, effect: TimelineEffect) => void;

  // 新增：选中状态
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;

  // 新增：视频时长
  duration: number;
  setDuration: (duration: number) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  // 初始状态
  editorData: [
    {
      id: "0",
      actions: [],
    },
  ],
  effects: {},
  isPlaying: false,
  currentTime: 0,
  scale: 5,
  scaleSplitCount: 10,
  selectedClipId: null,
  duration: 0,

  // 基础状态设置
  setEditorData: (data) => set({ editorData: data }),
  setTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setScale: (scale) => set({ scale }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setDuration: (duration) => set({ duration }),

  // 轨道管理
  addTrack: (trackId) =>
    set((state) => {
      const newTrack: TimelineRow = {
        id: trackId || `track-${Date.now()}`,
        actions: [],
      };
      return { editorData: [...state.editorData, newTrack] };
    }),

  // 片段管理
  addClip: (trackId, clip, effect) =>
    set((state) => {
      const newEditorData = state.editorData.map((row) => {
        if (row.id !== trackId) return row;
        return {
          ...row,
          actions: [...row.actions, clip],
        };
      });

      return {
        editorData: newEditorData,
        effects: {
          ...state.effects,
          [effect.id]: effect,
        },
      };
    }),
}));
