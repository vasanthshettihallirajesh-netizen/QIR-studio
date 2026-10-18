import React from 'react';
import { 
  GitBranch, 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  Sparkles, 
  Radio, 
  Cpu, 
  Layers 
} from 'lucide-react';
import { DiagnosticItem, SupportedLanguage } from '../../types/workspace';

interface StatusBarProps {
  diagnostics: DiagnosticItem[];
  currentLine: number;
  currentCol: number;
  language: SupportedLanguage;
  isBuilding: boolean;
  onToggleBottomPanel: () => void;
  onToggleCopilot: () => void;
  autoDebugEnabled?: boolean;
  onToggleAutoDebug?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  diagnostics,
  currentLine,
  currentCol,
  language,
  isBuilding,
  onToggleBottomPanel,
  onToggleCopilot,
  autoDebugEnabled = true,
  onToggleAutoDebug,
}) => {
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  const getLanguageLabel = (lang: SupportedLanguage) => {
    switch (lang) {
      case 'cpp': return 'C++20';
      case 'c': return 'C';
      case 'cmake': return 'CMake';
      case 'yaml': return 'YAML';
      case 'json': return 'JSON';
      case 'markdown': return 'Markdown';
      case 'python': return 'Python';
      case 'shell': return 'Shell Script';
      case 'llvm': return 'LLVM IR';
      default: return 'Plain Text';
    }
  };

  return (
    <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none font-mono z-30 shrink-0">
      {/* Left side items */}
      <div className="flex items-center space-x-3 h-full">
        {/* Git Branch */}
        <div className="flex items-center space-x-1 hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main*</span>
        </div>

        {/* Diagnostics status */}
        <div
          onClick={onToggleBottomPanel}
          className="flex items-center space-x-1.5 hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="Toggle Problems / Diagnostics"
        >
          <div className="flex items-center space-x-0.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorCount}</span>
          </div>
          <div className="flex items-center space-x-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{warningCount}</span>
          </div>
        </div>

        {/* Build state indicator */}
        <div className="flex items-center space-x-1 text-white/90">
          {isBuilding ? (
            <span className="flex items-center space-x-1 text-yellow-200">
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
              <span>Building CMake targets...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <Check className="w-3 h-3 text-green-200" />
              <span>qir-core: built</span>
            </span>
          )}
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center space-x-3 h-full">
        {/* Active line & col */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer">
          Ln {currentLine}, Col {currentCol}
        </div>

        {/* Spaces indentation */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer hidden sm:block">
          Spaces: 4
        </div>

        {/* Encoding */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer hidden md:block">
          UTF-8
        </div>

        {/* EOL */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer hidden md:block">
          LF
        </div>

        {/* Target Profile */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer text-white font-medium flex items-center space-x-1">
          <Cpu className="w-3 h-3" />
          <span>QIR Base Profile</span>
        </div>

        {/* Language selector */}
        <div className="hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer font-semibold">
          {getLanguageLabel(language)}
        </div>

        {/* Copilot & Live Debug status */}
        {onToggleAutoDebug && (
          <div
            onClick={onToggleAutoDebug}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
              autoDebugEnabled ? 'bg-[#005a9e] text-green-200' : 'hover:bg-[#005a9e] text-white/70'
            }`}
            title={`Live AI Error Debugging: ${autoDebugEnabled ? 'ACTIVE (Click to Disable)' : 'OFF (Click to Enable)'}`}
          >
            <span className={`w-2 h-2 rounded-full ${autoDebugEnabled ? 'bg-green-400 animate-ping' : 'bg-gray-400'}`} />
            <span>AI DEBUG: {autoDebugEnabled ? 'ON' : 'OFF'}</span>
          </div>
        )}

        <div
          onClick={onToggleCopilot}
          className="flex items-center space-x-1 hover:bg-[#005a9e] px-1.5 py-0.5 rounded cursor-pointer text-yellow-200"
          title="Toggle QIR Gemini Copilot"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copilot Ready</span>
        </div>
      </div>
    </div>
  );
};
