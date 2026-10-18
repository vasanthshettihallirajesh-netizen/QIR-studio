export type SupportedLanguage = 
  | 'cpp' 
  | 'c' 
  | 'cmake' 
  | 'yaml' 
  | 'json' 
  | 'markdown' 
  | 'python' 
  | 'shell' 
  | 'llvm' 
  | 'plaintext';

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage;
  isFolder: boolean;
  isOpen?: boolean;
  isDirty?: boolean;
  parentId?: string;
  children?: string[]; // IDs of children if folder
}

export interface TabItem {
  id: string;
  filePath: string;
  title: string;
  language: SupportedLanguage;
  isDirty: boolean;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'progress';
  text: string;
  timestamp?: string;
}

export interface DiagnosticItem {
  id: string;
  filePath: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  source: 'QIR Validator' | 'Clangd' | 'TypeChecker' | 'OptValidator';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
  };
}

export type ActiveSidebarView = 
  | 'explorer' 
  | 'search' 
  | 'source-control' 
  | 'debug' 
  | 'pass-debugger'
  | 'extensions' 
  | 'quantum-circuit' 
  | 'settings';

export type BottomPanelTab = 'terminal' | 'build-output' | 'diagnostics';

export interface WorkspaceConfig {
  hideFilesAndDirectories: boolean;
  explorerCollapsed: boolean;
}
