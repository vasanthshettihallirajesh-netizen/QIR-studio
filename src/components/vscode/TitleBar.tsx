import React from 'react';
import { 
  Play, 
  CheckCircle, 
  Search, 
  Sparkles, 
  PanelLeft, 
  PanelBottom, 
  PanelRight, 
  Atom, 
  Terminal,
  FolderOpen
} from 'lucide-react';

interface TitleBarProps {
  onRunBuild: () => void;
  onRunValidation: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  bottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  activeFileName?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onRunBuild,
  onRunValidation,
  sidebarOpen,
  setSidebarOpen,
  bottomPanelOpen,
  setBottomPanelOpen,
  copilotOpen,
  setCopilotOpen,
  activeFileName,
}) => {
  return (
    <div className="h-8 bg-[#3c3c3c] text-[#cccccc] flex items-center justify-between px-3 text-xs select-none border-b border-[#252526] shrink-0">
      {/* Left Menu & Brand */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-white font-semibold">
          <Atom className="w-4 h-4 text-[#007acc]" />
          <span>qir-platform</span>
        </div>

        {/* Traditional VS Code top menu */}
        <div className="hidden md:flex items-center space-x-1 text-[11px] text-[#cccccc]">
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">File</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Edit</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Selection</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">View</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Go</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Run</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Terminal</span>
          <span className="hover:bg-[#505050] px-1.5 py-0.5 rounded cursor-pointer">Help</span>
        </div>
      </div>

      {/* Center Search / Command Bar */}
      <div className="flex-1 max-w-md mx-4 hidden sm:flex items-center justify-center">
        <div className="w-full max-w-xs bg-[#252526] hover:bg-[#1e1e1e] border border-[#454545] rounded px-2.5 py-0.5 flex items-center justify-center space-x-2 text-[11px] text-[#858585] cursor-pointer transition-colors shadow-inner">
          <Search className="w-3 h-3" />
          <span className="truncate">
            {activeFileName ? `${activeFileName} - qir-platform` : 'qir-platform - Visual Studio Code'}
          </span>
        </div>
      </div>

      {/* Right Quick Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Run Build Shortcut */}
        <button
          onClick={onRunBuild}
          title="Run 'make -j8' in Terminal"
          className="bg-[#287d3c] hover:bg-[#349b4c] text-white text-[11px] font-semibold px-2 py-0.5 rounded flex items-center space-x-1 transition-colors"
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="hidden sm:inline">Build</span>
        </button>

        {/* Run Profile Validation Shortcut */}
        <button
          onClick={onRunValidation}
          title="Validate QIR Base Profile"
          className="bg-[#007acc] hover:bg-[#0062a3] text-white text-[11px] font-semibold px-2 py-0.5 rounded flex items-center space-x-1 transition-colors"
        >
          <CheckCircle className="w-3 h-3" />
          <span className="hidden sm:inline">Validate QIR</span>
        </button>

        {/* Layout Toggle Icons */}
        <div className="flex items-center space-x-1 text-[#858585] ml-1 border-l border-[#555555] pl-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Primary Side Bar"
            className={`p-1 rounded hover:text-white ${sidebarOpen ? 'text-white' : ''}`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            title="Toggle Terminal Panel"
            className={`p-1 rounded hover:text-white ${bottomPanelOpen ? 'text-white' : ''}`}
          >
            <PanelBottom className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            title="Toggle Gemini Copilot"
            className={`p-1 rounded hover:text-[#70a5fd] ${copilotOpen ? 'text-[#70a5fd]' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
