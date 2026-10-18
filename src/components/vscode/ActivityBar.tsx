import React from 'react';
import { 
  Files, 
  Search, 
  GitBranch, 
  Play, 
  Blocks, 
  Atom, 
  Sparkles, 
  Settings, 
  Terminal,
  PanelBottom,
  Zap
} from 'lucide-react';
import { ActiveSidebarView } from '../../types/workspace';

interface ActivityBarProps {
  activeView: ActiveSidebarView;
  setActiveView: (view: ActiveSidebarView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  bottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean) => void;
  dirtyCount: number;
  diagnosticCount: number;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  setActiveView,
  sidebarOpen,
  setSidebarOpen,
  copilotOpen,
  setCopilotOpen,
  bottomPanelOpen,
  setBottomPanelOpen,
  dirtyCount,
  diagnosticCount,
}) => {
  const handleViewClick = (view: ActiveSidebarView) => {
    if (activeView === view && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActiveView(view);
      setSidebarOpen(true);
    }
  };

  return (
    <div className="w-12 bg-[#333333] flex flex-col justify-between items-center py-2 select-none z-20 border-r border-[#252526]">
      {/* Top Icons */}
      <div className="flex flex-col items-center w-full space-y-2">
        {/* Explorer */}
        <button
          onClick={() => handleViewClick('explorer')}
          title="Explorer (Ctrl+Shift+E)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'explorer' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <Files className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Global Search */}
        <button
          onClick={() => handleViewClick('search')}
          title="Search (Ctrl+Shift+F)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'search' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <Search className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Source Control / Git */}
        <button
          onClick={() => handleViewClick('source-control')}
          title="Source Control (Ctrl+Shift+G)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'source-control' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <GitBranch className="w-6 h-6 stroke-[1.5]" />
          {dirtyCount > 0 && (
            <span className="absolute top-2 right-2 bg-[#007acc] text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
              {dirtyCount}
            </span>
          )}
        </button>

        {/* Run & Debug / Tests */}
        <button
          onClick={() => handleViewClick('debug')}
          title="Run and Debug (Ctrl+Shift+D)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'debug' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <Play className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Pass Debugger Toggle */}
        <button
          onClick={() => handleViewClick('pass-debugger')}
          title="Pass Debugger (Step through compiler passes in IR Diff-View)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'pass-debugger' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-[#007acc]'
          }`}
        >
          <Zap className="w-6 h-6 stroke-[1.5]" />
          <span className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-[#007acc]" />
        </button>

        {/* Quantum Circuit Visualizer */}
        <button
          onClick={() => handleViewClick('quantum-circuit')}
          title="Quantum Circuit & IR Visualizer"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'quantum-circuit' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-[#4ec9b0]'
          }`}
        >
          <Atom className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Extensions */}
        <button
          onClick={() => handleViewClick('extensions')}
          title="Extensions (Ctrl+Shift+X)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'extensions' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc] bg-[#252526]/40'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <Blocks className="w-6 h-6 stroke-[1.5]" />
        </button>
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center w-full space-y-2">
        {/* Toggle Bottom Terminal */}
        <button
          onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
          title="Toggle Terminal / Output Panel (Ctrl+\`)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            bottomPanelOpen ? 'text-white' : 'text-[#858585] hover:text-white'
          }`}
        >
          <Terminal className="w-6 h-6 stroke-[1.5]" />
          {diagnosticCount > 0 && (
            <span className="absolute top-2 right-2 bg-[#cca700] text-black text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              !
            </span>
          )}
        </button>

        {/* Toggle Gemini QIR Copilot */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          title="QIR Gemini Copilot Assistant (Ctrl+I)"
          className={`relative w-12 h-11 flex items-center justify-center transition-colors ${
            copilotOpen
              ? 'text-[#70a5fd] bg-[#252526]/50'
              : 'text-[#858585] hover:text-[#70a5fd]'
          }`}
        >
          <Sparkles className="w-6 h-6 stroke-[1.5]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#007acc] animate-pulse" />
        </button>

        {/* Settings */}
        <button
          onClick={() => handleViewClick('settings')}
          title="Settings (Ctrl+,)"
          className={`w-12 h-11 flex items-center justify-center transition-colors ${
            activeView === 'settings' && sidebarOpen
              ? 'text-white border-l-2 border-[#007acc]'
              : 'text-[#858585] hover:text-white'
          }`}
        >
          <Settings className="w-6 h-6 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
};
