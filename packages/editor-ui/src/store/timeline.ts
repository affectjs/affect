import { create } from "zustand";
import {
  TimelineState,
  TimelineRow,
  TimelineAction,
  TimelineEffect,
  Asset,
  ClipProperties,
} from "../types/timeline";

interface TimelineStore extends TimelineState {
  // Assets
  assets: Record<string, Asset>;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, metadata: Partial<Asset["metadata"]>) => void;

  // Basic State
  setEditorData: (data: TimelineRow[]) => void;
  setTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setScale: (scale: number) => void;

  // Tracks & Clips
  addTrack: (trackId?: string) => void;
  removeTrack: (trackId: string) => void;
  addClip: (trackId: string, clip: TimelineAction, effect: TimelineEffect) => void;
  removeClip: (clipId: string) => void;
  updateClipProperties: (effectId: string, properties: Partial<ClipProperties>) => void;

  // Selection
  setSelectedClipId: (id: string | null) => void;

  // Persistence/Project
  setDuration: (duration: number) => void;

  // New Global Editor State
  setEditorMode: (mode: "video" | "image") => void;
  setSelectedAssetId: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  // Initial State
  editorData: [
    { id: "video1", actions: [] },
    { id: "audio1", actions: [] },
  ],
  effects: {},
  assets: {},
  isPlaying: false,
  currentTime: 0,
  scale: 5,
  scaleSplitCount: 10,
  selectedClipId: null,
  duration: 0,
  editorMode: "video",
  selectedAssetId: null,

  // Assets
  addAsset: (asset) =>
    set((state) => ({
      assets: { ...state.assets, [asset.id]: asset },
    })),
  updateAsset: (id, metadata) =>
    set((state) => {
      const asset = state.assets[id];
      if (!asset) return state;
      return {
        assets: {
          ...state.assets,
          [id]: { ...asset, metadata: { ...asset.metadata, ...metadata } },
        },
      };
    }),

  // Basic State
  setEditorData: (data) => set({ editorData: data }),
  setTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setScale: (scale) => set({ scale }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setDuration: (duration) => set({ duration }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),

  // Track Management
  addTrack: (trackId) =>
    set((state) => ({
      editorData: [...state.editorData, { id: trackId || `track-${Date.now()}`, actions: [] }],
    })),
  removeTrack: (trackId) =>
    set((state) => ({
      editorData: state.editorData.filter((t) => t.id !== trackId),
    })),

  // Clip Management
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
  removeClip: (clipId) =>
    set((state) => {
      const newEditorData = state.editorData.map((row) => ({
        ...row,
        actions: row.actions.filter((a) => a.id !== clipId),
      }));
      // Note: We might want to keep the effect for undo/redo or if shared, but for now simple cleanup
      return {
        editorData: newEditorData,
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      };
    }),
  updateClipProperties: (effectId, properties) =>
    set((state) => {
      const effect = state.effects[effectId];
      if (!effect) return state;
      return {
        effects: {
          ...state.effects,
          [effectId]: {
            ...effect,
            properties: { ...effect.properties, ...properties },
          },
        },
      };
    }),
}));
