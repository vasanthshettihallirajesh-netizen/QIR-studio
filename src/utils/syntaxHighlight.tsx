import React from 'react';
import { SupportedLanguage } from '../types/workspace';

interface Token {
  text: string;
  type: 'keyword' | 'type' | 'function' | 'string' | 'number' | 'comment' | 'preprocessor' | 'variable' | 'attribute' | 'operator' | 'plain';
}

export function tokenizeCode(code: string, language: SupportedLanguage): Token[][] {
  const lines = code.split('\n');
  return lines.map(line => tokenizeLine(line, language));
}

function tokenizeLine(line: string, language: SupportedLanguage): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  // Comment check at beginning or mid-line
  if (language === 'llvm') {
    const semiIdx = line.indexOf(';');
    if (semiIdx !== -1 && !isInString(line, semiIdx)) {
      const before = line.slice(0, semiIdx);
      const comment = line.slice(semiIdx);
      tokens.push(...tokenizeCodePart(before, language));
      tokens.push({ text: comment, type: 'comment' });
      return tokens;
    }
  } else if (language === 'yaml' || language === 'shell' || language === 'python' || language === 'cmake') {
    const hashIdx = line.indexOf('#');
    if (hashIdx !== -1 && !isInString(line, hashIdx)) {
      const before = line.slice(0, hashIdx);
      const comment = line.slice(hashIdx);
      tokens.push(...tokenizeCodePart(before, language));
      tokens.push({ text: comment, type: 'comment' });
      return tokens;
    }
  } else if (language === 'cpp' || language === 'c') {
    const slashIdx = line.indexOf('//');
    if (slashIdx !== -1 && !isInString(line, slashIdx)) {
      const before = line.slice(0, slashIdx);
      const comment = line.slice(slashIdx);
      tokens.push(...tokenizeCodePart(before, language));
      tokens.push({ text: comment, type: 'comment' });
      return tokens;
    }
  }

  return tokenizeCodePart(remaining, language);
}

function isInString(line: string, index: number): boolean {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < index; i++) {
    if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) inDouble = !inDouble;
    if (line[i] === "'" && (i === 0 || line[i - 1] !== '\\')) inSingle = !inSingle;
  }
  return inDouble || inSingle;
}

function tokenizeCodePart(text: string, language: SupportedLanguage): Token[] {
  const tokens: Token[] = [];
  if (!text) return tokens;

  // Regex patterns for tokens
  // Order: strings, preprocessor, words, symbols, whitespace
  const tokenRegex = language === 'cpp' || language === 'c'
    ? /("(\\.|[^"\\])*"|'(\\.|[^'\\])*'|#\s*[a-zA-Z_]+|[a-zA-Z_][a-zA-Z0-9_]*|\d+(\.\d+)?|::|->|[{}()[\];,.<>!=+\-*/%&|^~?:]+|\s+)/g
    : language === 'llvm'
    ? /("(\\.|[^"\\])*"|%[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+|![a-zA-Z0-9_.]+|#[0-9]+|[a-zA-Z_][a-zA-Z0-9_]*|\d+|[{}()[\];,.<>!=+\-*:]+|\s+)/g
    : language === 'yaml'
    ? /("(\\.|[^"\\])*"|'(\\.|[^'\\])*'|[a-zA-Z_][a-zA-Z0-9_/-]*:|[a-zA-Z_][a-zA-Z0-9_/-]*|\d+(\.\d+)?|[{}()[\];,-]+|\s+)/g
    : language === 'cmake'
    ? /("(\\.|[^"\\])*"|\${[a-zA-Z0-9_]+}|[a-zA-Z_][a-zA-Z0-9_]*|\d+|[()]+|\s+)/g
    : /("(\\.|[^"\\])*"|'(\\.|[^'\\])*'|[a-zA-Z_][a-zA-Z0-9_]*|\d+(\.\d+)?|[{}()[\];,.<>!=+\-*/%&|^~?:]+|\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(text)) !== null) {
    const raw = match[0];
    tokens.push({
      text: raw,
      type: classifyToken(raw, language),
    });
  }

  if (tokens.length === 0 && text) {
    tokens.push({ text, type: 'plain' });
  }

  return tokens;
}

const CPP_KEYWORDS = new Set([
  'auto', 'const', 'constexpr', 'class', 'struct', 'enum', 'namespace', 'public', 'private', 'protected',
  'virtual', 'override', 'final', 'explicit', 'inline', 'template', 'typename', 'return', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'new', 'delete', 'throw', 'try',
  'catch', 'static', 'extern', 'friend', 'using', 'typedef', 'nullptr', 'true', 'false', 'operator', 'sizeof',
  // QuantumCode (.qc / .qua) keywords
  'circuit', 'gate', 'measure', 'qubit', 'qudit', 'ancilla', 'adj', 'invert', 'pulse', 'release', 'pragma'
]);

const CPP_TYPES = new Set([
  'void', 'int', 'bool', 'char', 'float', 'double', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
  'int8_t', 'int16_t', 'int32_t', 'int64_t', 'string', 'vector', 'unique_ptr', 'shared_ptr', 'string_view',
  'Type', 'TypeKind', 'TypeContext', 'QubitType', 'ResultType', 'IntegerType', 'DoubleType', 'FunctionType',
  'Value', 'Constant', 'ConstantInt', 'ConstantDouble', 'QubitValue', 'ResultValue', 'Instruction', 'BasicBlock',
  'Module', 'Function', 'QIRBuilder', 'QuantumOpcode', 'Status', 'Diagnostic',
  'Pass', 'FunctionPass', 'ModulePass', 'GateFusionPass', 'PreservedAnalyses', 'AnalysisManager', 'GateFusionMetrics',
  // Quantum types & primitives
  'Qubit', 'Result', 'qudit_d3', 'qureg', 'QubitHandle'
]);

const LLVM_KEYWORDS = new Set([
  'define', 'declare', 'call', 'ret', 'br', 'target', 'datalayout', 'triple', 'type', 'opaque', 'attributes',
  'source_filename', 'null', 'inttoptr', 'to', 'global', 'constant', 'label'
]);

const CMAKE_KEYWORDS = new Set([
  'cmake_minimum_required', 'project', 'set', 'find_package', 'message', 'include_directories', 'add_definitions',
  'file', 'add_library', 'target_include_directories', 'add_executable', 'target_link_libraries', 'enable_testing',
  'add_subdirectory', 'STATUS', 'REQUIRED', 'CONFIG', 'SHARED', 'PUBLIC', 'PRIVATE', 'VERSION', 'LANGUAGES'
]);

function classifyToken(text: string, language: SupportedLanguage): Token['type'] {
  if (/^\s+$/.test(text)) return 'plain';
  if (text.startsWith('"') || text.startsWith("'")) return 'string';
  if (/^\d+(\.\d+)?$/.test(text)) return 'number';
  if (text.startsWith('//') || text.startsWith('/*') || text.startsWith('#') && language !== 'cpp' && language !== 'c' || text.startsWith(';')) {
    return 'comment';
  }

  if (language === 'cpp' || language === 'c') {
    if (text.startsWith('#')) return 'preprocessor';
    if (CPP_KEYWORDS.has(text)) return 'keyword';
    if (CPP_TYPES.has(text) || /^[A-Z][a-zA-Z0-9_]*$/.test(text)) return 'type';
    if (text.endsWith('_')) return 'variable'; // Member variable convention
    return 'plain';
  }

  if (language === 'llvm') {
    if (text.startsWith('%')) return 'variable';
    if (text.startsWith('@')) return 'function';
    if (text.startsWith('!')) return 'attribute';
    if (LLVM_KEYWORDS.has(text)) return 'keyword';
    if (text === 'void' || text.startsWith('i') && /^\d+$/.test(text.slice(1))) return 'type';
    return 'plain';
  }

  if (language === 'cmake') {
    if (text.startsWith('${')) return 'variable';
    if (CMAKE_KEYWORDS.has(text) || CMAKE_KEYWORDS.has(text.toUpperCase())) return 'keyword';
    return 'plain';
  }

  if (language === 'yaml') {
    if (text.endsWith(':')) return 'type';
    if (text === 'true' || text === 'false' || text === 'null') return 'keyword';
    return 'plain';
  }

  return 'plain';
}

export function renderToken(token: Token, idx: number): React.ReactNode {
  let colorClass = 'text-[#d4d4d4]';

  switch (token.type) {
    case 'keyword':
      colorClass = 'text-[#569cd6] font-medium'; // VS Code blue
      break;
    case 'type':
      colorClass = 'text-[#4ec9b0]'; // VS Code teal
      break;
    case 'function':
      colorClass = 'text-[#dcdcaa]'; // VS Code yellow
      break;
    case 'string':
      colorClass = 'text-[#ce9178]'; // VS Code orange-brown
      break;
    case 'number':
      colorClass = 'text-[#b5cea8]'; // VS Code light green
      break;
    case 'comment':
      colorClass = 'text-[#6a9955] italic'; // VS Code green
      break;
    case 'preprocessor':
      colorClass = 'text-[#c586c0]'; // VS Code purple
      break;
    case 'variable':
      colorClass = 'text-[#9cdcfe]'; // VS Code light blue
      break;
    case 'attribute':
      colorClass = 'text-[#d7ba7d]'; // VS Code golden
      break;
    case 'operator':
      colorClass = 'text-[#d4d4d4]';
      break;
    default:
      colorClass = 'text-[#d4d4d4]';
      break;
  }

  return (
    <span key={idx} className={colorClass}>
      {token.text}
    </span>
  );
}
