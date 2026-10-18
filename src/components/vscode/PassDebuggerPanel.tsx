/**
 * @file src/components/vscode/PassDebuggerPanel.tsx
 * @brief Sidebar Panel for the Quantum Optimization Pass Debugger
 */

import React from 'react';
import { 
  StepBack, 
  StepForward, 
  Play, 
  Pause, 
  RotateCcw, 
  Split, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Clock, 
  Activity, 
  Cpu, 
  ShieldCheck,
  Terminal,
  ChevronRight
} from 'lucide-react';
import { COMPILER_PASS_STEPS, PassStepInfo } from '../../data/passDebuggerData';

interface PassDebuggerPanelProps {
  currentPassIndex: number;
  onSelectPass: (index: number) => void;
  diffViewOpen: boolean;
  onToggleDiffView: () => void;
  onExecuteCommand: (cmd: string) => void;
}

export const PassDebuggerPanel: React.FC<PassDebuggerPanelProps> = ({
  currentPassIndex,
  onSelectPass,
  diffViewOpen,
  onToggleDiffView,
  onExecuteCommand,
}) => {
  const currentPass = COMPILER_PASS_STEPS[currentPassIndex] || COMPILER_PASS_STEPS[0];

  return (
    <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar select-none text-xs">
      {/* 1. Header & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-[#858585]">
          <Zap className="w-3.5 h-3.5 text-[#007acc]" />
          <span>Pass Debugger</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] font-mono font-semibold">
          Pass {currentPassIndex} / {COMPILER_PASS_STEPS.length - 1}
        </span>
      </div>

      {/* 2. Interactive Stepper Toolbar */}
      <div className="bg-[#252526] p-2 rounded-xs border border-[#3e3e42] space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold text-xs truncate max-w-[170px]">
            {currentPass.shortName}
          </div>
          <span className="text-[10px] text-[#858585] uppercase font-mono bg-[#333333] px-1.5 py-0.2 rounded">
            {currentPass.category}
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={() => onSelectPass(Math.max(0, currentPassIndex - 1))}
            disabled={currentPassIndex === 0}
            title="Step Back"
            className="flex items-center justify-center p-1.5 bg-[#333333] hover:bg-[#3e3e42] disabled:opacity-30 disabled:hover:bg-[#333333] rounded-xs text-[#cccccc] hover:text-white transition-colors"
          >
            <StepBack className="w-3.5 h-3.5 mr-1" />
            <span className="text-[10px]">Prev</span>
          </button>

          <button
            onClick={() => onSelectPass(Math.min(COMPILER_PASS_STEPS.length - 1, currentPassIndex + 1))}
            disabled={currentPassIndex === COMPILER_PASS_STEPS.length - 1}
            title="Step Next"
            className="flex items-center justify-center p-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 disabled:hover:bg-[#007acc] rounded-xs text-white font-semibold transition-colors"
          >
            <span className="text-[10px] mr-1">Next</span>
            <StepForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectPass(0)}
            title="Reset to Initial QIR"
            className="flex items-center justify-center p-1.5 bg-[#333333] hover:bg-[#3e3e42] rounded-xs text-[#858585] hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span className="text-[10px]">Reset</span>
          </button>

          <button
            onClick={onToggleDiffView}
            title="Toggle IR Diff-View Window in Editor"
            className={`flex items-center justify-center p-1.5 rounded-xs transition-colors ${
              diffViewOpen 
                ? 'bg-[#4ec9b0] text-black font-semibold' 
                : 'bg-[#333333] hover:bg-[#3e3e42] text-[#4ec9b0]'
            }`}
          >
            <Split className="w-3.5 h-3.5 mr-1" />
            <span className="text-[10px]">Diff</span>
          </button>
        </div>

        {/* Diff View Banner */}
        <button
          onClick={onToggleDiffView}
          className={`w-full py-1.5 px-2 rounded-xs flex items-center justify-between text-left transition-colors border ${
            diffViewOpen
              ? 'bg-[#007acc]/20 border-[#007acc] text-white'
              : 'bg-[#2a2d2e] border-[#333333] text-[#cccccc] hover:bg-[#333333]'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Split className="w-3.5 h-3.5 text-[#007acc]" />
            <span className="text-[11px] font-medium">
              {diffViewOpen ? 'Diff View Active' : 'Open IR Diff-View Window'}
            </span>
          </div>
          <span className="text-[10px] text-[#4ec9b0] font-mono">
            {diffViewOpen ? 'DOCKED' : 'VIEW'}
          </span>
        </button>
      </div>

      {/* 3. Pass Optimization Metrics Card */}
      <div className="bg-[#252526] p-2.5 rounded-xs border border-[#3e3e42] space-y-2">
        <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider flex items-center justify-between">
          <span>Pass Transformation Metrics</span>
          <span className="text-[#4ec9b0] font-mono">{currentPass.metrics.netChange}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#1e1e1e] p-1.5 rounded border border-[#333333]">
            <div className="text-[#858585] text-[10px]">Gate Count</div>
            <div className="text-white font-bold flex items-center space-x-1">
              <span className="text-[#f48771]">{currentPass.metrics.gatesBefore}</span>
              <ArrowRight className="w-2.5 h-2.5 text-[#858585]" />
              <span className="text-[#7ee787]">{currentPass.metrics.gatesAfter}</span>
            </div>
          </div>

          <div className="bg-[#1e1e1e] p-1.5 rounded border border-[#333333]">
            <div className="text-[#858585] text-[10px]">T-Gate Count</div>
            <div className="text-white font-bold flex items-center space-x-1">
              <span className="text-[#cca700]">{currentPass.metrics.tCountBefore}</span>
              <ArrowRight className="w-2.5 h-2.5 text-[#858585]" />
              <span className="text-[#4ec9b0]">{currentPass.metrics.tCountAfter}</span>
            </div>
          </div>

          <div className="bg-[#1e1e1e] p-1.5 rounded border border-[#333333]">
            <div className="text-[#858585] text-[10px]">Circuit Depth</div>
            <div className="text-white font-bold flex items-center space-x-1">
              <span>{currentPass.metrics.depthBefore}</span>
              <ArrowRight className="w-2.5 h-2.5 text-[#858585]" />
              <span className="text-[#70a5fd]">{currentPass.metrics.depthAfter}</span>
            </div>
          </div>

          <div className="bg-[#1e1e1e] p-1.5 rounded border border-[#333333]">
            <div className="text-[#858585] text-[10px]">Est. Latency</div>
            <div className="text-[#7ee787] font-bold">
              {currentPass.metrics.latencyReduction}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1 pt-1 border-t border-[#333333]">
          <div className="text-[10px] text-[#858585] font-semibold uppercase">Analysis Invariants:</div>
          {currentPass.notes.map((note, idx) => (
            <div key={idx} className="flex items-start space-x-1 text-[11px] text-[#cccccc] leading-tight">
              <span className="text-[#4ec9b0] font-bold">•</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Complete Optimization Pipeline Stepper List */}
      <div className="flex-1 flex flex-col space-y-1">
        <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-1">
          Compiler Pass Pipeline ({COMPILER_PASS_STEPS.length} Steps)
        </div>

        <div className="space-y-1">
          {COMPILER_PASS_STEPS.map((step) => {
            const isSelected = step.index === currentPassIndex;
            const isPassed = step.index < currentPassIndex;

            return (
              <div
                key={step.id}
                onClick={() => onSelectPass(step.index)}
                className={`p-2 rounded-xs border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#007acc]/20 border-[#007acc] text-white shadow-xs'
                    : isPassed
                    ? 'bg-[#252526] border-[#333333] text-[#cccccc] hover:bg-[#2d2d30]'
                    : 'bg-[#1e1e1e] border-transparent text-[#858585] hover:bg-[#252526] hover:text-[#cccccc]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-medium truncate">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-[#007acc] text-white'
                        : isPassed
                        ? 'bg-[#4ec9b0]/20 text-[#4ec9b0]'
                        : 'bg-[#333333] text-[#858585]'
                    }`}>
                      {isPassed ? '✓' : step.index}
                    </span>
                    <span className="truncate text-xs">{step.shortName}</span>
                  </div>

                  <span className={`text-[10px] font-mono shrink-0 ml-1 ${
                    isSelected ? 'text-[#4ec9b0] font-bold' : 'text-[#858585]'
                  }`}>
                    {step.metrics.netChange}
                  </span>
                </div>

                {isSelected && (
                  <div className="text-[10px] text-[#858585] mt-1 pl-5.5 leading-snug">
                    {step.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Trigger Pipeline CLI */}
      <div className="pt-2 border-t border-[#2d2d2d]">
        <button
          onClick={() => onExecuteCommand('./tools/qir-opt --passes=clifford-t,routing,gate-fusion --print-stats')}
          className="w-full bg-[#333333] hover:bg-[#3e3e42] text-white py-1.5 px-2 rounded-xs flex items-center justify-center space-x-1.5 font-medium transition-colors border border-[#3e3e42]"
        >
          <Terminal className="w-3.5 h-3.5 text-[#007acc]" />
          <span>Run Pass Pipeline in Terminal</span>
        </button>
      </div>
    </div>
  );
};
