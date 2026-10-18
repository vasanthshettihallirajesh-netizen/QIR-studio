/**
 * @file src/components/vscode/DiffViewWindow.tsx
 * @brief High-Fidelity Side-by-Side & Unified Diff View Window for QIR Pass Debugging
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  StepBack, 
  StepForward, 
  Play, 
  Pause, 
  RotateCcw, 
  Split, 
  FileText, 
  X, 
  Zap, 
  CheckCircle2, 
  TrendingDown, 
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { PassStepInfo, COMPILER_PASS_STEPS } from '../../data/passDebuggerData';

interface DiffViewWindowProps {
  currentPassIndex: number;
  onSelectPass: (index: number) => void;
  onClose: () => void;
}

export const DiffViewWindow: React.FC<DiffViewWindowProps> = ({
  currentPassIndex,
  onSelectPass,
  onClose,
}) => {
  const [isSideBySide, setIsSideBySide] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isScrollingSync = useRef(false);

  const currentPass = COMPILER_PASS_STEPS[currentPassIndex] || COMPILER_PASS_STEPS[0];

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onSelectPass((currentPassIndex + 1) % COMPILER_PASS_STEPS.length);
      }, 2400);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentPassIndex, onSelectPass]);

  // Synchronized scrolling between left and right diff panes
  const handleScroll = (source: 'left' | 'right') => {
    if (isScrollingSync.current) return;
    isScrollingSync.current = true;

    if (source === 'left' && leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
      rightPaneRef.current.scrollLeft = leftPaneRef.current.scrollLeft;
    } else if (source === 'right' && leftPaneRef.current && rightPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
      leftPaneRef.current.scrollLeft = rightPaneRef.current.scrollLeft;
    }

    setTimeout(() => {
      isScrollingSync.current = false;
    }, 20);
  };

  const beforeLines = currentPass.beforeIR.split('\n');
  const afterLines = currentPass.afterIR.split('\n');

  // Simple line diff algorithm for visual comparison
  const diffRows = Math.max(beforeLines.length, afterLines.length);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none border-t border-[#252526]">
      {/* 1. Diff View Toolbar */}
      <div className="h-11 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between px-3 shrink-0">
        {/* Left: Pass title and step counter */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] text-xs font-semibold border border-[#007acc]/40">
            <Zap className="w-3.5 h-3.5" />
            <span>Pass {currentPass.index} / {COMPILER_PASS_STEPS.length - 1}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-white text-xs font-semibold">{currentPass.passName}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded uppercase font-mono tracking-wider bg-[#333333] text-[#858585]">
              {currentPass.category}
            </span>
          </div>
        </div>

        {/* Center: Stepper controls */}
        <div className="flex items-center space-x-1 bg-[#1e1e1e] p-1 rounded border border-[#333333]">
          {/* Step Back */}
          <button
            onClick={() => onSelectPass(Math.max(0, currentPassIndex - 1))}
            disabled={currentPassIndex === 0}
            title="Step Back to Previous Pass"
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2d2d30] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <StepBack className="w-4 h-4" />
          </button>

          {/* Auto-Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Step-Through" : "Auto-Step Through Passes"}
            className={`p-1 rounded transition-colors ${
              isPlaying ? 'text-[#4ec9b0] bg-[#4ec9b0]/20' : 'text-[#858585] hover:text-white hover:bg-[#2d2d30]'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Step Forward */}
          <button
            onClick={() => onSelectPass(Math.min(COMPILER_PASS_STEPS.length - 1, currentPassIndex + 1))}
            disabled={currentPassIndex === COMPILER_PASS_STEPS.length - 1}
            title="Step Forward to Next Pass"
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2d2d30] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <StepForward className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              setIsPlaying(false);
              onSelectPass(0);
            }}
            title="Reset to Initial QIR State"
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2d2d30]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Quick metrics, view mode toggle & close */}
        <div className="flex items-center space-x-2">
          {/* Net change badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2 py-1 rounded bg-[#2a2d2e] border border-[#3e3e42] text-[11px] font-mono">
            <span className="text-[#858585]">Gates:</span>
            <span className="text-[#f48771]">{currentPass.metrics.gatesBefore}</span>
            <ArrowRight className="w-3 h-3 text-[#858585]" />
            <span className="text-[#7ee787] font-bold">{currentPass.metrics.gatesAfter}</span>
            <span className="text-[#4ec9b0] font-bold ml-1">({currentPass.metrics.netChange})</span>
          </div>

          {/* Side-by-side vs Unified toggle */}
          <button
            onClick={() => setIsSideBySide(!isSideBySide)}
            title={isSideBySide ? "Switch to Unified Diff" : "Switch to Side-by-Side Diff"}
            className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white flex items-center space-x-1 text-xs"
          >
            {isSideBySide ? <Split className="w-4 h-4 text-[#007acc]" /> : <FileText className="w-4 h-4" />}
            <span className="hidden xl:inline text-[11px]">{isSideBySide ? 'Side-by-Side' : 'Inline'}</span>
          </button>

          {/* Close Diff View */}
          <button
            onClick={onClose}
            title="Close Pass Diff View"
            className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Pass Description & Notes Header Strip */}
      <div className="bg-[#1e1e1e] border-b border-[#2d2d2d] px-4 py-2 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
        <div className="flex-1">
          <p className="text-[#cccccc] font-medium leading-relaxed">
            {currentPass.description}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {currentPass.notes.map((note, idx) => (
              <span key={idx} className="inline-flex items-center space-x-1 text-[11px] text-[#858585] bg-[#252526] px-2 py-0.5 rounded border border-[#333333]">
                <CheckCircle2 className="w-3 h-3 text-[#4ec9b0]" />
                <span>{note}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center space-x-3 shrink-0 bg-[#252526] px-3 py-1.5 rounded border border-[#333333] font-mono text-[11px]">
          <div>
            <span className="text-[#858585]">T-Count: </span>
            <span className="text-[#cca700] font-bold">{currentPass.metrics.tCountBefore} → {currentPass.metrics.tCountAfter}</span>
          </div>
          <div className="border-l border-[#3e3e42] pl-3">
            <span className="text-[#858585]">Depth: </span>
            <span className="text-[#70a5fd] font-bold">{currentPass.metrics.depthBefore} → {currentPass.metrics.depthAfter}</span>
          </div>
          <div className="border-l border-[#3e3e42] pl-3">
            <span className="text-[#858585]">Latency: </span>
            <span className="text-[#7ee787] font-bold">{currentPass.metrics.latencyReduction}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Diff Body */}
      {isSideBySide ? (
        // Side-by-Side View
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Before Pass (Red Highlights for removed lines) */}
          <div className="flex-1 flex flex-col border-r border-[#2d2d2d] overflow-hidden">
            <div className="h-6 bg-[#252526] px-3 flex items-center justify-between text-[11px] text-[#858585] font-mono border-b border-[#2d2d2d]">
              <span>BEFORE: {currentPassIndex === 0 ? 'Input AST' : COMPILER_PASS_STEPS[currentPassIndex - 1]?.shortName || 'Previous Pass'}</span>
              <span className="text-[#f48771]">{beforeLines.length} lines</span>
            </div>

            <div 
              ref={leftPaneRef}
              onScroll={() => handleScroll('left')}
              className="flex-1 overflow-auto font-mono text-xs leading-[21px] custom-scrollbar bg-[#1e1e1e]"
            >
              <div className="min-w-max py-2">
                {beforeLines.map((line, idx) => {
                  const isRemoved = !afterLines.includes(line) && line.trim() !== '';
                  const lineNum = idx + 1;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center px-2 ${
                        isRemoved 
                          ? 'bg-[#471e1e]/60 text-[#ff7b72] border-l-2 border-[#f48771]' 
                          : 'hover:bg-[#2a2d2e]/40 text-[#cccccc]'
                      }`}
                    >
                      <span className="w-10 text-right pr-3 text-[#6e7681] select-none text-[11px]">
                        {lineNum}
                      </span>
                      <span className="w-4 select-none text-center font-bold text-[11px] text-[#f48771]">
                        {isRemoved ? '-' : ' '}
                      </span>
                      <pre className="pl-2 font-mono text-xs whitespace-pre">{line || ' '}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Pane: After Pass (Green Highlights for added lines) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-6 bg-[#252526] px-3 flex items-center justify-between text-[11px] text-[#858585] font-mono border-b border-[#2d2d2d]">
              <span className="text-[#4ec9b0]">AFTER: {currentPass.shortName}</span>
              <span className="text-[#7ee787]">{afterLines.length} lines</span>
            </div>

            <div 
              ref={rightPaneRef}
              onScroll={() => handleScroll('right')}
              className="flex-1 overflow-auto font-mono text-xs leading-[21px] custom-scrollbar bg-[#1e1e1e]"
            >
              <div className="min-w-max py-2">
                {afterLines.map((line, idx) => {
                  const isAdded = !beforeLines.includes(line) && line.trim() !== '';
                  const lineNum = idx + 1;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center px-2 ${
                        isAdded 
                          ? 'bg-[#1b3d22]/70 text-[#7ee787] border-l-2 border-[#4ec9b0]' 
                          : 'hover:bg-[#2a2d2e]/40 text-[#cccccc]'
                      }`}
                    >
                      <span className="w-10 text-right pr-3 text-[#6e7681] select-none text-[11px]">
                        {lineNum}
                      </span>
                      <span className="w-4 select-none text-center font-bold text-[11px] text-[#7ee787]">
                        {isAdded ? '+' : ' '}
                      </span>
                      <pre className="pl-2 font-mono text-xs whitespace-pre">{line || ' '}</pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Unified Inline Diff View
        <div className="flex-1 overflow-auto font-mono text-xs leading-[21px] custom-scrollbar bg-[#1e1e1e] py-2">
          <div className="min-w-max">
            {/* Show removed lines first then added lines */}
            {beforeLines.map((line, idx) => {
              const isRemoved = !afterLines.includes(line) && line.trim() !== '';
              if (!isRemoved) return null;
              return (
                <div key={`del-${idx}`} className="flex items-center px-3 bg-[#471e1e]/60 text-[#ff7b72] border-l-2 border-[#f48771]">
                  <span className="w-8 text-right pr-2 text-[#6e7681] select-none text-[11px]">{idx + 1}</span>
                  <span className="w-8 text-right pr-2 text-[#6e7681] select-none text-[11px]"> </span>
                  <span className="w-4 text-center font-bold text-[#f48771] select-none">-</span>
                  <pre className="pl-2 font-mono text-xs whitespace-pre">{line}</pre>
                </div>
              );
            })}

            {afterLines.map((line, idx) => {
              const isAdded = !beforeLines.includes(line) && line.trim() !== '';
              return (
                <div 
                  key={`add-${idx}`} 
                  className={`flex items-center px-3 ${
                    isAdded 
                      ? 'bg-[#1b3d22]/70 text-[#7ee787] border-l-2 border-[#4ec9b0]' 
                      : 'hover:bg-[#2a2d2e]/30 text-[#cccccc]'
                  }`}
                >
                  <span className="w-8 text-right pr-2 text-[#6e7681] select-none text-[11px]"> </span>
                  <span className="w-8 text-right pr-2 text-[#6e7681] select-none text-[11px]">{idx + 1}</span>
                  <span className="w-4 text-center font-bold select-none text-[#7ee787]">{isAdded ? '+' : ' '}</span>
                  <pre className="pl-2 font-mono text-xs whitespace-pre">{line || ' '}</pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Bottom Pass Stepper Bar */}
      <div className="h-10 bg-[#252526] border-t border-[#2d2d2d] flex items-center justify-between px-4 shrink-0 text-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 custom-scrollbar max-w-[70%]">
          {COMPILER_PASS_STEPS.map((step) => {
            const isActive = step.index === currentPassIndex;
            const isCompleted = step.index < currentPassIndex;

            return (
              <button
                key={step.id}
                onClick={() => onSelectPass(step.index)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono shrink-0 transition-all flex items-center space-x-1 ${
                  isActive
                    ? 'bg-[#007acc] text-white font-bold shadow-xs'
                    : isCompleted
                    ? 'bg-[#2d2d30] text-[#7ee787] hover:bg-[#3e3e42]'
                    : 'bg-[#1e1e1e] text-[#858585] hover:bg-[#2d2d30] hover:text-[#cccccc]'
                }`}
              >
                <span>{step.index}. {step.shortName}</span>
                {isCompleted && <span className="text-[9px]">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-3 text-[#858585] text-[11px] font-mono">
          <span>Transformation: {currentPassIndex === 0 ? 'Baseline' : `${currentPass.metrics.netChange}`}</span>
          <span className="text-[#007acc] cursor-pointer hover:underline" onClick={onClose}>
            Back to Editor
          </span>
        </div>
      </div>
    </div>
  );
};
