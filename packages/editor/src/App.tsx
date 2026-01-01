import { useTimelineStore, AssetLibrary, Toolbar, Inspector } from "@affectjs/editor-ui";
import { TimelineEditor, VideoPreview, Controls } from "@affectjs/editor-video";
import { ImageEditorView } from "@affectjs/editor-image";

function App() {
  const { editorMode, setEditorMode } = useTimelineStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Header / Sidebar / Main content layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AssetLibrary />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {editorMode === "video" ? (
            <>
              {/* Preview + Inspector Row */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Video Preview Area */}
                <div className="flex-1 bg-black relative flex flex-col">
                  <div className="flex-1 min-h-0 relative">
                    <VideoPreview />
                  </div>
                  <Controls />
                </div>

                {/* Inspector Panel */}
                <Inspector />
              </div>

              {/* Timeline + Toolbar Area */}
              <div className="h-[40%] flex flex-col bg-slate-900 border-t border-slate-700">
                <Toolbar />
                <div className="flex-1 overflow-hidden relative">
                  <TimelineEditor />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <ImageEditorView />
              <Inspector />
            </div>
          )}
        </div>
      </div>

      {/* App Status Bar */}
      <footer className="h-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Browser Runtime Active
          </span>
          <button
            onClick={() => setEditorMode(editorMode === "video" ? "image" : "video")}
            className="uppercase tracking-widest font-bold text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-800 border border-transparent hover:border-slate-700"
          >
            Mode: {editorMode}
            <span className="text-[8px] opacity-50 px-1 border border-slate-600 rounded">
              Switch
            </span>
          </button>
        </div>
        <div>RFC-008 & RFC-015 Unified Editor</div>
      </footer>
    </div>
  );
}

export default App;
