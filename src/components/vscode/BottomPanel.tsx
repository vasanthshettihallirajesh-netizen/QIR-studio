import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Layers, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  X, 
  CheckCircle2, 
  Play, 
  Loader2,
  Bug,
  Sparkles,
  Wrench
} from 'lucide-react';
import { BottomPanelTab, TerminalLine, DiagnosticItem } from '../../types/workspace';

interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: BottomPanelTab;
  setActiveTab: (tab: BottomPanelTab) => void;
  terminalLines: TerminalLine[];
  onExecuteCommand: (command: string) => void;
  onClearTerminal: () => void;
  diagnostics: DiagnosticItem[];
  onSelectDiagnostic: (diag: DiagnosticItem) => void;
  isBuilding: boolean;
  buildLogs: string[];
  autoDebugEnabled?: boolean;
  onToggleAutoDebug?: () => void;
  onTriggerAiDebug?: (diag: DiagnosticItem) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  terminalLines,
  onExecuteCommand,
  onClearTerminal,
  diagnostics,
  onSelectDiagnostic,
  isBuilding,
  buildLogs,
  autoDebugEnabled = true,
  onToggleAutoDebug,
  onTriggerAiDebug,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, activeTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'terminal') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onClearTerminal();
      return;
    }
    if (e.key === 'Enter') {
      if (commandInput.trim()) {
        onExecuteCommand(commandInput.trim());
        setHistory(prev => [...prev, commandInput.trim()]);
        setHistoryIndex(-1);
        setCommandInput('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setCommandInput(history[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setCommandInput('');
        }
      }
    }
  };

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <div
      className={`bg-[#1e1e1e] border-t border-[#2d2d2d] flex flex-col z-20 transition-all duration-150 ${
        isMaximized ? 'h-[60vh]' : 'h-64'
      }`}
    >
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between bg-[#252526] px-3 h-8 border-b border-[#1e1e1e] select-none shrink-0">
        <div className="flex items-center space-x-1 h-full">
          {/* Terminal Tab */}
          <button
            onClick={() => setActiveTab('terminal')}
            className={`h-full px-3 flex items-center space-x-1.5 text-xs transition-colors border-b-2 ${
              activeTab === 'terminal'
                ? 'text-white border-[#007acc] font-medium bg-[#1e1e1e]'
                : 'text-[#858585] border-transparent hover:text-[#cccccc]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>TERMINAL</span>
            {isBuilding && <Loader2 className="w-3 h-3 animate-spin text-[#007acc] ml-1" />}
          </button>

          {/* Build Output Tab */}
          <button
            onClick={() => setActiveTab('build-output')}
            className={`h-full px-3 flex items-center space-x-1.5 text-xs transition-colors border-b-2 ${
              activeTab === 'build-output'
                ? 'text-white border-[#007acc] font-medium bg-[#1e1e1e]'
                : 'text-[#858585] border-transparent hover:text-[#cccccc]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>BUILD OUTPUT</span>
          </button>

          {/* Diagnostics / Validator Tab */}
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`h-full px-3 flex items-center space-x-1.5 text-xs transition-colors border-b-2 ${
              activeTab === 'diagnostics'
                ? 'text-white border-[#007acc] font-medium bg-[#1e1e1e]'
                : 'text-[#858585] border-transparent hover:text-[#cccccc]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#e51400]" />
            <span>DIAGNOSTICS / VALIDATOR</span>
            <span className="text-[10px] bg-[#333333] px-1 rounded-full text-[#cccccc]">
              {errorCount} errors, {warningCount} warnings
            </span>
          </button>
        </div>

        {/* Action icons right */}
        <div className="flex items-center space-x-2 text-[#858585]">
          {/* Live Error Debugging Toggle Button */}
          {onToggleAutoDebug && (
            <button
              onClick={onToggleAutoDebug}
              title={autoDebugEnabled ? "Live Error Debugging: ON (Click to Disable)" : "Live Error Debugging: OFF (Click to Enable)"}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                autoDebugEnabled
                  ? 'bg-[#007acc]/20 text-[#4ec9b0] border border-[#007acc]/40 hover:bg-[#007acc]/30'
                  : 'bg-[#2d2d30] text-[#858585] border border-[#3e3e42] hover:text-white'
              }`}
            >
              <Bug className={`w-3.5 h-3.5 ${autoDebugEnabled ? 'text-[#4ec9b0] animate-pulse' : 'text-[#858585]'}`} />
              <span className="hidden sm:inline">LIVE DEBUG:</span>
              <span className="font-bold">{autoDebugEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {activeTab === 'terminal' && (
            <button
              onClick={onClearTerminal}
              title="Clear Terminal"
              className="p-1 hover:text-white hover:bg-[#333333] rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore Panel Size" : "Maximize Panel"}
            className="p-1 hover:text-white hover:bg-[#333333] rounded"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            title="Close Panel (Ctrl+`)"
            className="p-1 hover:text-white hover:bg-[#333333] rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-hidden p-2 font-mono text-xs">
        {/* Tab 1: Terminal */}
        {activeTab === 'terminal' && (
          <div 
            onClick={() => inputRef.current?.focus()}
            className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-2"
          >
            {/* Output lines */}
            <div className="space-y-0.5">
              {terminalLines.map((line) => {
                let colorClass = 'text-[#cccccc]';
                if (line.type === 'input') colorClass = 'text-white font-semibold';
                if (line.type === 'success') colorClass = 'text-[#4caf50] font-medium';
                if (line.type === 'error') colorClass = 'text-[#f48771] font-medium';
                if (line.type === 'info') colorClass = 'text-[#569cd6]';
                if (line.type === 'progress') colorClass = 'text-[#4ec9b0]';

                return (
                  <div key={line.id} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
                    {line.text}
                  </div>
                );
              })}
            </div>

            {/* Input row */}
            <div className="flex items-center space-x-2 mt-1 shrink-0 pb-1">
              <span className="text-[#4ec9b0] font-bold shrink-0">user@qir-dev:~/qir-platform$</span>
              <input
                ref={inputRef}
                type="text"
                disabled={isBuilding}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isBuilding ? "Compiling target in background..." : "type command (e.g. make, ./scripts/build.sh, ctest)..."}
                className="flex-1 bg-transparent text-white outline-none border-none caret-[#007acc] disabled:opacity-50"
              />
            </div>
            <div ref={terminalEndRef} />
          </div>
        )}

        {/* Tab 2: Build Output */}
        {activeTab === 'build-output' && (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-1 text-[#cccccc]">
            <div className="text-[11px] text-[#858585] mb-2 font-bold uppercase">
              Ninja / CMake Clang-17 Toolchain Pipeline
            </div>
            {buildLogs.length === 0 ? (
              <div className="text-[#858585] italic">
                No active compilation logs. Run 'make' or './scripts/build.sh' in the terminal to trigger builds.
              </div>
            ) : (
              buildLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap leading-tight text-[11px] text-[#9cdcfe]">
                  {log}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Diagnostics / Validator */}
        {activeTab === 'diagnostics' && (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#858585] mb-2 font-bold uppercase">
              <span>QIR Base Profile & Type Invariant Rules</span>
              <span className="text-[#4ec9b0] font-mono">QIR Profile: Base Profile v1.0</span>
            </div>

            {diagnostics.length === 0 ? (
              <div className="flex items-center space-x-2 text-[#4caf50] py-4">
                <CheckCircle2 className="w-4 h-4" />
                <span>No diagnostics found. All open files satisfy QIR Base Profile constraints.</span>
              </div>
            ) : (
              diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => onSelectDiagnostic(diag)}
                  className="flex items-start space-x-2 py-1.5 px-2 hover:bg-[#2a2d2e] cursor-pointer rounded-xs border-l-2 transition-colors border-transparent hover:border-[#007acc]"
                >
                  {diag.severity === 'error' && (
                    <AlertCircle className="w-4 h-4 text-[#f48771] shrink-0 mt-0.5" />
                  )}
                  {diag.severity === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-[#cca700] shrink-0 mt-0.5" />
                  )}
                  {diag.severity === 'info' && (
                    <Info className="w-4 h-4 text-[#569cd6] shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 text-xs text-white">
                      <span className="font-semibold text-[#569cd6] font-mono">[{diag.code}]</span>
                      <span>{diag.message}</span>
                    </div>
                    <div className="text-[11px] text-[#858585] mt-0.5 font-mono flex items-center justify-between">
                      <div>
                        <span>{diag.filePath}</span>
                        <span className="text-[#cca700] font-bold">:{diag.line}:{diag.column}</span>
                        <span className="ml-2 text-[#6e6e6e]">({diag.source})</span>
                      </div>
                      {onTriggerAiDebug && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerAiDebug(diag);
                          }}
                          className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#007acc]/20 hover:bg-[#007acc]/40 text-[#4ec9b0] text-[10px] font-sans transition-colors"
                          title="Debug & fix with Gemini AI"
                        >
                          <Sparkles className="w-3 h-3 text-[#70a5fd]" />
                          <span>AI Fix</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
