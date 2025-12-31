import { TimelineEditor } from "./components/Timeline/Timeline";
import { VideoPreview, Controls } from "./components/Preview";
import { Inspector } from "./components/Inspector";

/**
 * Web视频编辑器主应用
 * 基于RFC-014设计
 *
 * 布局结构：
 * ┌─────────────────────────────────────┐
 * │  Header (Toolbar)                   │
 * ├────────────────────┬────────────────┤
 * │                    │                │
 * │  Preview           │  Inspector     │
 * │                    │                │
 * ├────────────────────┴────────────────┤
 * │                                     │
 * │  Timeline                           │
 * │                                     │
 * └─────────────────────────────────────┘
 */
function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      {/* Header / Toolbar */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 text-white font-semibold shrink-0">
        <span className="mr-4">Web Video Editor</span>
        <span className="text-xs text-slate-400">基于RFC-014实现</span>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Preview + Inspector Row */}
        <div className="h-[60%] flex border-b border-slate-700">
          {/* Video Preview Area */}
          <div className="flex-1 bg-black relative">
            <VideoPreview />
            <Controls />
          </div>

          {/* Inspector Panel */}
          <Inspector />
        </div>

        {/* Timeline Area */}
        <div className="h-[40%]">
          <TimelineEditor />
        </div>
      </main>
    </div>
  );
}

export default App;
