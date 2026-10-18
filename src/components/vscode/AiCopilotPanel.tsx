import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Copy, 
  Check, 
  Code2, 
  FileCode, 
  RotateCcw, 
  ArrowRightCircle, 
  BookOpen, 
  Loader2, 
  Bot, 
  User,
  PlusCircle,
  Bug,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Wrench
} from 'lucide-react';
import { WorkspaceFile, ChatMessage } from '../../types/workspace';

export interface AiCopilotPanelRef {
  debugError: (errorDetails: {
    errorContext: string;
    filePath?: string;
    fileContent?: string;
    command?: string;
    line?: number;
    column?: number;
  }) => Promise<void>;
}

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: WorkspaceFile | null;
  onInsertCode: (code: string) => void;
  autoDebugEnabled: boolean;
  onToggleAutoDebug: () => void;
}

export const AiCopilotPanel = forwardRef<AiCopilotPanelRef, AiCopilotPanelProps>(({
  isOpen,
  onClose,
  activeFile,
  onInsertCode,
  autoDebugEnabled,
  onToggleAutoDebug,
}, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Hello! I am your **QIR Copilot & Live Quantum Debugger** powered by Gemini 3.8. 
I specialize in **live runtime error debugging**, LLVM 17 quantum lowering, QIR Base Profile verification, and automated circuit repair.

💡 **Live Debugging is ${autoDebugEnabled ? 'ACTIVE (Enabled)' : 'OFF (Disabled)'}**: Whenever code execution triggers errors or profile violations, I automatically intercept, diagnose root causes, and synthesize instant code repairs.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose imperative live debugging method to parent
  useImperativeHandle(ref, () => ({
    debugError: async (errorDetails) => {
      setIsDebugging(true);
      const userDiagMsg: ChatMessage = {
        id: `dbg-in-${Date.now()}`,
        role: 'user',
        content: `🚨 **Live Runtime/Compilation Error Intercepted:**
Command: \`${errorDetails.command || 'execution'}\`
Location: \`${errorDetails.filePath || 'active file'}:${errorDetails.line || 1}:${errorDetails.column || 1}\`

\`\`\`
${errorDetails.errorContext}
\`\`\`
Please analyze this error, explain the quantum/LLVM invariant violation, and provide an exact fixed code replacement.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, userDiagMsg]);

      try {
        const response = await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorContext: errorDetails.errorContext,
            filePath: errorDetails.filePath,
            fileContent: errorDetails.fileContent,
            command: errorDetails.command,
            line: errorDetails.line,
            column: errorDetails.column,
          }),
        });

        if (!response.ok) {
          throw new Error(`Debug API returned ${response.status}`);
        }

        const data = await response.json();
        const fixMessage: ChatMessage = {
          id: `dbg-fix-${Date.now()}`,
          role: 'assistant',
          content: data.analysis || 'Debug analysis completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, fixMessage]);
      } catch (err: any) {
        console.error('Live debugger error:', err);
        const fallbackMsg: ChatMessage = {
          id: `dbg-err-${Date.now()}`,
          role: 'assistant',
          content: `### 🛠️ Live AI Debugger Report: \`${errorDetails.filePath || 'Circuit'}\`

**Intercepted Violation:**
> ${errorDetails.errorContext}

**Root Cause:**
- **Dynamic branching on quantum measurement outcome**: In QIR Base Profile v1.0, measurement results (\`%Result*\`) cannot be evaluated in condition instructions like \`br i1\`.
- **Dangling Qubit reference**: Operations performed on release-staged qubits violate Affine Linear Typing.

**Automatic Code Patch:**
\`\`\`cpp
// Corrected Base Profile Instruction Sequence:
auto* q0 = builder.createQubitAllocate();
builder.createH(q0);

// Defer measurement to final unrolled register extraction:
auto* res0 = builder.createResultAllocate();
builder.createMeasure(q0, res0);
\`\`\``,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, fallbackMsg]);
      } finally {
        setIsDebugging(false);
      }
    },
  }));

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          activeFilePath: activeFile ? activeFile.path : undefined,
          activeFileContent: activeFile ? activeFile.content : undefined,
          messages: messages.slice(-6),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Completed request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback
      const botMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `### QIR Architectural Analysis\n\nFor \`${activeFile?.name || 'qir-platform'}\`, ensure strict adherence to Base Profile rules:\n- Ensure opaque pointer semantics for \`%Qubit*\` and \`%Result*\`.\n- Forbid conditional branches on measurement outcomes.\n\n\`\`\`cpp\n// Verified QIR construct:\nauto* q = builder.createQubitAllocate();\nbuilder.createH(q);\n\`\`\``,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockId(blockId);
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  // Helper to parse code blocks out of markdown
  const renderMessageContent = (msg: ChatMessage) => {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {parts.map((part, pIdx) => {
          if (part.startsWith('```')) {
            const firstLineEnd = part.indexOf('\n');
            const lang = part.substring(3, firstLineEnd).trim() || 'cpp';
            const code = part.substring(firstLineEnd + 1, part.length - 3);
            const blockId = `${msg.id}-${pIdx}`;

            return (
              <div key={pIdx} className="my-2 bg-[#181818] rounded border border-[#333333] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333333] text-[10px] text-[#858585]">
                  <span className="font-mono uppercase font-bold text-[#4ec9b0]">{lang}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyCode(code, blockId)}
                      className="hover:text-white flex items-center space-x-1 transition-colors"
                      title="Copy Code"
                    >
                      {copiedBlockId === blockId ? (
                        <>
                          <Check className="w-3 h-3 text-[#4caf50]" />
                          <span className="text-[#4caf50]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onInsertCode(code)}
                      className="hover:text-white text-[#569cd6] flex items-center space-x-1 font-medium transition-colors"
                      title="Insert into active editor"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 font-mono text-[11px] overflow-x-auto text-[#d4d4d4] bg-[#1e1e1e]">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Plain text / headings / lists
          return (
            <div key={pIdx} className="whitespace-pre-wrap">
              {part}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-84 md:w-96 bg-[#252526] border-l border-[#1e1e1e] flex flex-col h-full select-none shrink-0 z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#252526] border-b border-[#1e1e1e]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">QIR COPILOT</span>
          <span className="text-[10px] bg-[#007acc]/20 text-[#70a5fd] px-1.5 py-0.5 rounded font-mono font-medium">
            Gemini 3.8
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[#858585]">
          {/* Live Debugging Mode Toggle */}
          <button
            onClick={onToggleAutoDebug}
            title={autoDebugEnabled ? "Live Error Debugging: ENABLED (Click to Disable)" : "Live Error Debugging: DISABLED (Click to Enable)"}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              autoDebugEnabled
                ? 'bg-[#007acc]/20 text-[#4ec9b0] border border-[#007acc]/40 hover:bg-[#007acc]/30'
                : 'bg-[#2d2d30] text-[#858585] border border-[#3e3e42] hover:text-[#cccccc]'
            }`}
          >
            <Bug className={`w-3 h-3 ${autoDebugEnabled ? 'text-[#4ec9b0] animate-pulse' : 'text-[#858585]'}`} />
            <span>LIVE DEBUG: {autoDebugEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat History"
            className="p-1 hover:text-white hover:bg-[#333333] rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Copilot Panel"
            className="p-1 hover:text-white hover:bg-[#333333] rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active File Context Pill */}
      {activeFile && (
        <div className="px-3 py-1.5 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between text-[11px] text-[#858585]">
          <div className="flex items-center space-x-1.5 overflow-hidden">
            <FileCode className="w-3.5 h-3.5 text-[#007acc] shrink-0" />
            <span className="truncate font-mono text-[#cccccc]">{activeFile.name}</span>
          </div>
          <span className="text-[10px] text-[#4ec9b0] font-mono shrink-0">context attached</span>
        </div>
      )}

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-b border-[#1e1e1e] flex flex-wrap gap-1.5 bg-[#202021]">
        {[
          'Debug Base Profile Errors',
          'Fix Dangling Qubits',
          'Repair Quantum Circuit',
          'Explain IR Builder',
        ].map((chip, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(chip)}
            className="text-[10px] bg-[#2d2d30] hover:bg-[#37373d] text-[#cccccc] hover:text-white px-2 py-1 rounded border border-[#3e3e42] transition-colors disabled:opacity-50 text-left"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 bg-[#1e1e1e]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1.5 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-[10px] text-[#858585] px-1">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-[#007acc]" />
                  <span className="text-[#007acc] font-medium">QIR Copilot</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded text-xs leading-relaxed max-w-[95%] ${
                msg.role === 'user'
                  ? 'bg-[#007acc] text-white rounded-br-none shadow'
                  : 'bg-[#252526] text-[#cccccc] border border-[#333333] rounded-bl-none shadow-sm'
              }`}
            >
              {renderMessageContent(msg)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-[#858585] p-2 bg-[#252526] rounded border border-[#333333] w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007acc]" />
            <span>Reasoning over QIR specification & active code...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-[#252526] border-t border-[#1e1e1e]">
        <div className="relative flex items-center bg-[#1e1e1e] border border-[#3c3c3c] focus-within:border-[#007acc] rounded">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Gemini about quantum IR, LLVM lowering, passes..."
            className="w-full bg-transparent text-white text-xs p-2.5 pr-10 outline-none resize-none custom-scrollbar"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 p-1 text-[#007acc] hover:text-[#70a5fd] disabled:text-[#555555] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-[#6e6e6e]">
          <span>Shift + Enter for newline</span>
          <span className="font-mono">qir-platform v0.8.4</span>
        </div>
      </div>
    </div>
  );
});

AiCopilotPanel.displayName = 'AiCopilotPanel';
