import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Search, 
  ChevronRight, 
  FileCode, 
  FileText, 
  Terminal, 
  Atom, 
  Split, 
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Replace
} from 'lucide-react';
import { WorkspaceFile, TabItem, SupportedLanguage } from '../../types/workspace';
import { tokenizeCode, renderToken } from '../../utils/syntaxHighlight';

interface EditorAreaProps {
  activeFile: WorkspaceFile | null;
  openTabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onContentChange: (fileId: string, newContent: string) => void;
  onSaveFile: (fileId: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  highlightLine?: number | null;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  activeFile,
  openTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSaveFile,
  onCursorChange,
  highlightLine,
}) => {
  const [breakpoints, setBreakpoints] = useState<Record<number, boolean>>({});
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatchIndex, setFindMatchIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Jump to highlight line if provided (e.g. from Diagnostics click)
  useEffect(() => {
    if (highlightLine && textareaRef.current) {
      const lines = (activeFile?.content || '').split('\n');
      let charIndex = 0;
      for (let i = 0; i < Math.min(highlightLine - 1, lines.length); i++) {
        charIndex += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charIndex, charIndex + (lines[highlightLine - 1]?.length || 0));
      
      // Scroll into view
      const lineHeight = 21; // 21px line height
      const targetScroll = (highlightLine - 5) * lineHeight;
      if (editorContainerRef.current) {
        editorContainerRef.current.scrollTop = Math.max(0, targetScroll);
      }
    }
  }, [highlightLine]);

  // Handle keyboard shortcuts (Ctrl+S, Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeFile) {
          onSaveFile(activeFile.id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, onSaveFile]);

  const toggleBreakpoint = (lineNum: number) => {
    setBreakpoints(prev => ({
      ...prev,
      [lineNum]: !prev[lineNum],
    }));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea || !activeFile) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      // Insert 4 spaces
      const updated = val.substring(0, start) + '    ' + val.substring(end);
      onContentChange(activeFile.id, updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleSelectionOrCursor = () => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorChange) return;

    const cursor = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursor);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    onCursorChange(line, col);
  };

  // Find occurrences
  const findMatches = React.useMemo(() => {
    if (!findText.trim() || !activeFile) return [];
    const lines = activeFile.content.split('\n');
    const matches: Array<{ lineIndex: number; colIndex: number }> = [];
    lines.forEach((l, lIdx) => {
      let idx = l.toLowerCase().indexOf(findText.toLowerCase());
      while (idx !== -1) {
        matches.push({ lineIndex: lIdx, colIndex: idx });
        idx = l.toLowerCase().indexOf(findText.toLowerCase(), idx + 1);
      }
    });
    return matches;
  }, [findText, activeFile]);

  const scrollToMatch = (index: number) => {
    if (findMatches.length === 0 || !editorContainerRef.current) return;
    const normIndex = ((index % findMatches.length) + findMatches.length) % findMatches.length;
    const match = findMatches[normIndex];
    if (match) {
      const targetTop = match.lineIndex * 21;
      editorContainerRef.current.scrollTo({
        top: Math.max(0, targetTop - 120),
        behavior: 'smooth',
      });
    }
  };

  const handleNextMatch = () => {
    if (findMatches.length === 0) return;
    const nextIdx = (findMatchIndex + 1) % findMatches.length;
    setFindMatchIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (findMatches.length === 0) return;
    const prevIdx = (findMatchIndex - 1 + findMatches.length) % findMatches.length;
    setFindMatchIndex(prevIdx);
    scrollToMatch(prevIdx);
  };

  const handleReplaceOne = () => {
    if (!activeFile || findMatches.length === 0) return;
    const match = findMatches[findMatchIndex % findMatches.length];
    const lines = activeFile.content.split('\n');
    const line = lines[match.lineIndex];
    const updatedLine = line.substring(0, match.colIndex) + replaceText + line.substring(match.colIndex + findText.length);
    lines[match.lineIndex] = updatedLine;
    onContentChange(activeFile.id, lines.join('\n'));
    if (findMatches.length > 1) {
      scrollToMatch(findMatchIndex % (findMatches.length - 1));
    }
  };

  const handleReplaceAll = () => {
    if (!activeFile || !findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const updated = activeFile.content.replace(regex, replaceText);
    onContentChange(activeFile.id, updated);
  };

  // Render file icon helper
  const renderTabIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'qc' || ext === 'qua') {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 shrink-0"
        >
          <title>QuantumCode Trishula</title>
          {/* Central spear */}
          <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2.2" />
          <polyline points="10,5 12,2 14,5" strokeWidth="2" fill="white" />
          {/* Curved trident prongs */}
          <path d="M5 8 C5 14, 12 15, 12 15 C12 15, 19 14, 19 8" strokeWidth="1.8" />
          <polyline points="3.5,9.5 5,7.5 6.5,9.5" strokeWidth="1.8" fill="white" />
          <polyline points="17.5,9.5 19,7.5 20.5,9.5" strokeWidth="1.8" fill="white" />
          {/* Crossbar collar */}
          <line x1="9" y1="16" x2="15" y2="16" strokeWidth="2" />
        </svg>
      );
    }
    if (ext === 'h' || ext === 'hpp') return <span className="text-[#519aba] font-bold text-[11px] font-mono">.h</span>;
    if (ext === 'cpp' || ext === 'cc') return <span className="text-[#00599c] font-bold text-[11px] font-mono">C++</span>;
    if (ext === 'yaml' || ext === 'yml') return <span className="text-[#cb171e] font-bold text-[11px] font-mono">YML</span>;
    if (ext === 'json') return <span className="text-[#cbcb41] font-bold text-[11px] font-mono">{"{}"}</span>;
    if (ext === 'md') return <FileText className="w-3.5 h-3.5 text-[#42a5f5]" />;
    if (ext === 'll') return <span className="text-[#d7ba7d] font-bold text-[11px] font-mono">LL</span>;
    if (ext === 'qasm') return <Atom className="w-3.5 h-3.5 text-[#4ec9b0]" />;
    if (ext === 'cmake') return <span className="text-[#008f88] font-bold text-[11px] font-mono">CM</span>;
    if (ext === 'sh' || fileName === 'Makefile') return <Terminal className="w-3.5 h-3.5 text-[#4caf50]" />;
    return <FileCode className="w-3.5 h-3.5 text-[#858585]" />;
  };

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex flex-col items-center justify-center text-[#858585] select-none p-6">
        <div className="w-16 h-16 rounded-full bg-[#252526] flex items-center justify-center mb-4 text-[#007acc] border border-[#333333]">
          <Atom className="w-8 h-8 animate-spin-slow" />
        </div>
        <h2 className="text-lg font-medium text-white mb-2">QIR Platform Workspace</h2>
        <p className="text-xs text-[#858585] max-w-md text-center mb-6">
          Open a file from the explorer on the left or browse core IR components like <span className="text-[#4ec9b0] font-mono">include/ir/type.h</span> and <span className="text-[#4ec9b0] font-mono">src/ir/builder.cpp</span>.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#252526] p-3 rounded border border-[#333333] flex items-center space-x-2">
            <kbd className="bg-[#333333] px-1.5 py-0.5 rounded text-white text-[10px]">Ctrl+S</kbd>
            <span>Save active file</span>
          </div>
          <div className="bg-[#252526] p-3 rounded border border-[#333333] flex items-center space-x-2">
            <kbd className="bg-[#333333] px-1.5 py-0.5 rounded text-white text-[10px]">Ctrl+`</kbd>
            <span>Toggle simulated terminal</span>
          </div>
          <div className="bg-[#252526] p-3 rounded border border-[#333333] flex items-center space-x-2">
            <kbd className="bg-[#333333] px-1.5 py-0.5 rounded text-white text-[10px]">Ctrl+F</kbd>
            <span>Find & replace</span>
          </div>
          <div className="bg-[#252526] p-3 rounded border border-[#333333] flex items-center space-x-2">
            <kbd className="bg-[#333333] px-1.5 py-0.5 rounded text-white text-[10px]">Ctrl+I</kbd>
            <span>Ask QIR Gemini Copilot</span>
          </div>
        </div>
      </div>
    );
  }

  const tokenizedLines = tokenizeCode(activeFile.content, activeFile.language);
  const pathSegments = activeFile.path.split('/').filter(Boolean);

  return (
    <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden relative select-none">
      {/* 1. Multi-Tab Header Bar */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto custom-scrollbar h-9 shrink-0">
        <div className="flex items-center h-full">
          {openTabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group h-full flex items-center space-x-2 px-3.5 border-r border-[#1e1e1e] cursor-pointer text-xs select-none transition-colors ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#282828] hover:text-[#cccccc]'
                }`}
              >
                {renderTabIcon(tab.title)}
                <span className="truncate font-medium">{tab.title}</span>

                {/* Modified Indicator / Close Button */}
                <div className="flex items-center w-4 h-4 justify-center">
                  {tab.isDirty ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className="w-2 h-2 rounded-full bg-[#ffffff] group-hover:hidden"
                    />
                  ) : null}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={`hover:bg-[#3c3c3c] hover:text-white rounded-xs p-0.5 text-[#858585] ${
                      tab.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action icons right */}
        <div className="flex items-center space-x-2 px-3 text-[#858585]">
          <button
            onClick={() => onSaveFile(activeFile.id)}
            title="Save File (Ctrl+S)"
            className="hover:text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFindOpen(!findOpen)}
            title="Find in File (Ctrl+F)"
            className="hover:text-white transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Breadcrumbs Bar */}
      <div className="flex items-center px-4 py-1 text-[11px] text-[#858585] bg-[#1e1e1e] border-b border-[#2d2d2d] space-x-1.5 select-none shrink-0 font-mono">
        <span>qir-platform</span>
        {pathSegments.map((seg, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-[#555555]" />
            <span className={idx === pathSegments.length - 1 ? 'text-[#cccccc] font-medium' : ''}>
              {seg}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* 3. Floating Find & Replace Widget */}
      {findOpen && (
        <div className="absolute right-6 top-16 bg-[#252526] border border-[#454545] rounded shadow-2xl p-2 z-30 flex flex-col space-y-1.5 text-xs text-white w-80">
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              autoFocus
              placeholder="Find..."
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setFindMatchIndex(0);
              }}
              className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1 outline-none border border-transparent focus:border-[#007acc] rounded-xs"
            />
            <span className="text-[11px] text-[#858585] px-1">
              {findMatches.length > 0 ? `${(findMatchIndex % findMatches.length) + 1} of ${findMatches.length}` : 'No matches'}
            </span>
            <button
              onClick={handlePrevMatch}
              disabled={findMatches.length === 0}
              className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded"
              title="Previous Match (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={findMatches.length === 0}
              className="p-1 hover:bg-[#3c3c3c] disabled:opacity-30 rounded"
              title="Next Match (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setFindOpen(false)} className="p-1 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              placeholder="Replace..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="flex-1 bg-[#3c3c3c] text-white text-xs px-2 py-1 outline-none border border-transparent focus:border-[#007acc] rounded-xs"
            />
            <button
              onClick={handleReplaceOne}
              disabled={findMatches.length === 0}
              className="px-2 py-1 bg-[#3c3c3c] hover:bg-[#4c4c4c] disabled:opacity-30 rounded text-[11px]"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={findMatches.length === 0}
              className="px-2 py-1 bg-[#3c3c3c] hover:bg-[#4c4c4c] disabled:opacity-30 rounded text-[11px]"
            >
              All
            </button>
          </div>
        </div>
      )}

      {/* 4. Code Editor Main Area */}
      {(() => {
        const calculatedHeight = Math.max(tokenizedLines.length * 21 + 48, 500);
        const activeFindMatch = findOpen && findMatches.length > 0 
          ? findMatches[findMatchIndex % findMatches.length] 
          : null;

        return (
          <div 
            ref={editorContainerRef}
            className="flex-1 flex overflow-auto relative custom-scrollbar bg-[#1e1e1e]"
          >
            {/* Line Numbers Gutter */}
            <div 
              className="w-14 py-2 bg-[#1e1e1e] select-none text-right pr-3 font-mono text-xs text-[#858585] shrink-0 border-r border-[#2d2d2d] z-10"
              style={{ minHeight: `${calculatedHeight}px` }}
            >
              {tokenizedLines.map((_, idx) => {
                const lineNum = idx + 1;
                const hasBreakpoint = !!breakpoints[lineNum];
                const isHighlighted = highlightLine === lineNum;
                const isFindMatchLine = activeFindMatch && activeFindMatch.lineIndex === idx;

                return (
                  <div
                    key={lineNum}
                    onClick={() => toggleBreakpoint(lineNum)}
                    className={`group h-[21px] leading-[21px] flex items-center justify-end space-x-1 cursor-pointer hover:text-white ${
                      isFindMatchLine
                        ? 'bg-[#515c6a]/40 text-[#e2c08d] font-bold'
                        : isHighlighted 
                        ? 'bg-[#37373d] text-[#e2c08d] font-bold' 
                        : ''
                    }`}
                  >
                    {/* Breakpoint red circle */}
                    <span
                      className={`w-2 h-2 rounded-full mr-1 transition-opacity ${
                        hasBreakpoint
                          ? 'bg-[#e51400] opacity-100'
                          : 'bg-[#e51400]/40 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <span className={hasBreakpoint ? 'text-white font-bold' : ''}>{lineNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Code Content Container: Overlay Textarea on Rendered Syntax */}
            <div 
              className="relative flex-1 font-mono text-xs leading-[21px] min-w-full"
              style={{ minHeight: `${calculatedHeight}px` }}
            >
              {/* Syntax-Highlighted Render Layer */}
              <div 
                className="absolute inset-0 py-2 pl-4 pointer-events-none whitespace-pre select-none font-mono text-xs leading-[21px]"
                style={{ 
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  tabSize: 4,
                }}
              >
                {tokenizedLines.map((tokens, lIdx) => {
                  const lineNum = lIdx + 1;
                  const isHighlighted = highlightLine === lineNum;
                  const isFindMatchLine = activeFindMatch && activeFindMatch.lineIndex === lIdx;

                  return (
                    <div 
                      key={lIdx} 
                      className={`h-[21px] leading-[21px] ${
                        isFindMatchLine
                          ? 'bg-[#515c6a]/50 -mx-4 px-4 border-l-2 border-[#cca700]'
                          : isHighlighted 
                          ? 'bg-[#264f78]/30 -mx-4 px-4' 
                          : ''
                      }`}
                    >
                      {tokens.length === 0 ? '\n' : tokens.map((t, tIdx) => renderToken(t, tIdx))}
                    </div>
                  );
                })}
              </div>

              {/* Interactive Textarea Layer */}
              <textarea
                ref={textareaRef}
                value={activeFile.content}
                onChange={(e) => onContentChange(activeFile.id, e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onKeyUp={handleSelectionOrCursor}
                onClick={handleSelectionOrCursor}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                style={{ 
                  height: `${calculatedHeight}px`,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  tabSize: 4,
                  lineHeight: '21px',
                  fontSize: '12px',
                }}
                className="w-full py-2 pl-4 bg-transparent text-transparent caret-white outline-none resize-none whitespace-pre font-mono text-xs leading-[21px] z-10 selection:bg-[#264f78] overflow-hidden"
              />
            </div>

            {/* 5. VS Code Minimap Preview */}
            <div className="w-16 bg-[#1e1e1e]/80 border-l border-[#2d2d2d] shrink-0 p-1 select-none hidden lg:block overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
              <div className="scale-[0.25] origin-top-left pointer-events-none w-[400%] font-mono text-[7px] leading-[7px] space-y-1">
                {tokenizedLines.slice(0, 150).map((tokens, idx) => (
                  <div key={idx} className="h-1.5 truncate">
                    {tokens.map((t, i) => (
                      <span
                        key={i}
                        className={`inline-block h-1 mr-0.5 rounded-xs ${
                          t.type === 'keyword'
                            ? 'bg-[#569cd6] w-3'
                            : t.type === 'type'
                            ? 'bg-[#4ec9b0] w-4'
                            : t.type === 'string'
                            ? 'bg-[#ce9178] w-5'
                            : t.type === 'comment'
                            ? 'bg-[#6a9955] w-6'
                            : 'bg-[#858585] w-2'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
