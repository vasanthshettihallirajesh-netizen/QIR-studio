/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  buildInitialWorkspace, 
  getLanguageForFile 
} from './data/initialWorkspace';
import { 
  WorkspaceFile, 
  TabItem, 
  ActiveSidebarView, 
  BottomPanelTab, 
  TerminalLine, 
  DiagnosticItem 
} from './types/workspace';
import { ActivityBar } from './components/vscode/ActivityBar';
import { Sidebar } from './components/vscode/Sidebar';
import { EditorArea } from './components/vscode/EditorArea';
import { BottomPanel } from './components/vscode/BottomPanel';
import { AiCopilotPanel } from './components/vscode/AiCopilotPanel';
import { StatusBar } from './components/vscode/StatusBar';
import { TitleBar } from './components/vscode/TitleBar';

export default function App() {
  // 1. Workspace Files Tree State
  const [files, setFiles] = useState<Record<string, WorkspaceFile>>(() => buildInitialWorkspace());

  // 2. Open Tabs State - Pre-loaded with realistic starter code and simple quantum files
  const [openTabs, setOpenTabs] = useState<TabItem[]>([
    {
      id: 'ex_qc_simple',
      filePath: '/examples/simple_bell.qc',
      title: 'simple_bell.qc',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'ex_qua_simple',
      filePath: '/examples/teleport_kernel.qua',
      title: 'teleport_kernel.qua',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'inc_opt_fusion_direct',
      filePath: '/include/optimization/gate_fusion.h',
      title: 'gate_fusion.h',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'src_opt_fusion',
      filePath: '/src/optimization/gate_fusion.cpp',
      title: 'gate_fusion.cpp',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'inc_opt_pass_direct',
      filePath: '/include/optimization/pass.h',
      title: 'pass.h',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'test_unit_opt',
      filePath: '/tests/unit/test_optimizer.cpp',
      title: 'test_optimizer.cpp',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'tool_opt_main',
      filePath: '/tools/qir-opt/main.cpp',
      title: 'main.cpp (qir-opt)',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'inc_ir_inst_direct',
      filePath: '/include/ir/instruction.h',
      title: 'instruction.h',
      language: 'cpp',
      isDirty: false,
    },
    {
      id: 'src_ir_builder',
      filePath: '/src/ir/builder.cpp',
      title: 'builder.cpp',
      language: 'cpp',
      isDirty: false,
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('ex_qc_simple');

  // 3. UI Panels & Layout Visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarView, setActiveSidebarView] = useState<ActiveSidebarView>('explorer');
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('terminal');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [hideFilesAndDirectories, setHideFilesAndDirectories] = useState(true);
  const [autoDebugEnabled, setAutoDebugEnabled] = useState(true);

  // Copilot panel ref for live error debugging invocation
  const copilotRef = useRef<any>(null);

  // 4. Cursor position tracking
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // 5. Build & Terminal States
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([
    "[init] LLVM 17.0.6 (x86_64-unknown-linux-gnu)",
    "[init] QIR Base Profile toolchain loaded.",
    "[init] Core Instruction Set & IR Builder headers linked.",
    "[init] Optimization Subsystem: PassManager & GateFusionPass initialized."
  ]);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 't-1',
      type: 'info',
      text: 'Welcome to QIR Platform Dev Environment [Ubuntu 22.04 LTS / LLVM 17.0.6]',
    },
    {
      id: 't-2',
      type: 'progress',
      text: 'Workspace loaded: Core IR + Quantum Gate Fusion & Peephole Optimization Subsystem active.',
    },
    {
      id: 't-3',
      type: 'output',
      text: "Type 'make', './tools/qir-opt --passes=gate-fusion', 'ctest', or 'help' to run pipelines.",
    },
  ]);

  // Active File object
  const activeFile = useMemo(() => {
    return files[activeTabId] || null;
  }, [files, activeTabId]);

  // 6. Real-time QIR Diagnostics Validator
  const diagnostics = useMemo<DiagnosticItem[]>(() => {
    const list: DiagnosticItem[] = [];

    // Scan active file or core files for common QIR profile violations
    if (activeFile) {
      const content = activeFile.content;

      // Base Profile Rule 1: No dynamic branches
      if (content.includes('br i1 %') && (activeFile.name.endsWith('.ll') || activeFile.name.endsWith('.cpp'))) {
        list.push({
          id: 'diag-bp-1',
          filePath: activeFile.path,
          line: 8,
          column: 3,
          severity: 'error',
          code: 'QIR-BP-001',
          message: 'Dynamic control flow branch detected. QIR Base Profile strictly forbids conditional jumps on measurement outcomes.',
          source: 'QIR Validator',
        });
      }

      // Base Profile Rule 2: Qubit handle type safety
      if (content.includes('reinterpret_cast<void*>') && activeFile.name.endsWith('.cpp')) {
        list.push({
          id: 'diag-bp-2',
          filePath: activeFile.path,
          line: 32,
          column: 12,
          severity: 'warning',
          code: 'QIR-TYPE-004',
          message: 'Potentially unsafe pointer cast on quantum handle. Ensure %Qubit* remains opaque.',
          source: 'TypeChecker',
        });
      }

      // Instruction Verification for instruction.h / instruction.cpp
      if (activeFile.name === 'instruction.h' || activeFile.name === 'instruction.cpp') {
        const hasInstructionBase = content.includes('Instruction') && content.includes('Value');
        const hasSingleQubit = content.includes('H') && content.includes('X') && content.includes('Z') && content.includes('S');
        const hasMultiQubit = content.includes('CNOT') && content.includes('CZ');
        const hasMeasure = content.includes('Mz');
        const hasLifecycle = content.includes('QubitAllocate') && content.includes('QubitRelease');

        if (!hasInstructionBase) {
          list.push({
            id: 'diag-inst-base',
            filePath: activeFile.path,
            line: 45,
            column: 1,
            severity: 'error',
            code: 'QIR-IR-001',
            message: 'Instruction class must inherit from qir::Value to support SSA use-def chains.',
            source: 'QIR Validator',
          });
        }

        if (!hasSingleQubit || !hasMultiQubit || !hasMeasure || !hasLifecycle) {
          list.push({
            id: 'diag-inst-opcodes',
            filePath: activeFile.path,
            line: 25,
            column: 1,
            severity: 'warning',
            code: 'QIR-IR-002',
            message: 'Core instruction set incomplete: Ensure H, X, Z, S, CNOT, CZ, Mz, QubitAllocate, and QubitRelease are defined.',
            source: 'QIR Validator',
          });
        }
      }

      // Builder verification for builder.h / builder.cpp
      if (activeFile.name === 'builder.h' || activeFile.name === 'builder.cpp') {
        const hasCreateH = content.includes('CreateH');
        const hasCreateCNOT = content.includes('CreateCNOT');
        const hasCreateMeasure = content.includes('CreateMeasure') || content.includes('CreateMz');
        const hasCreateAlloc = content.includes('CreateQubitAllocate');
        const hasCreateRelease = content.includes('CreateQubitRelease');

        if (!hasCreateH || !hasCreateCNOT || !hasCreateMeasure || !hasCreateAlloc || !hasCreateRelease) {
          list.push({
            id: 'diag-bld-fluent',
            filePath: activeFile.path,
            line: 30,
            column: 1,
            severity: 'warning',
            code: 'QIR-BLD-001',
            message: 'QIRBuilder missing required fluent methods (CreateH, CreateCNOT, CreateMeasure/CreateMz, CreateQubitAllocate, CreateQubitRelease).',
            source: 'QIR Validator',
          });
        }
      }

      // Optimization Pass Verification for pass.h / pass.cpp
      if (activeFile.name === 'pass.h' || activeFile.name === 'pass.cpp') {
        const hasPassBase = content.includes('class Pass') && content.includes('PreservedAnalyses');
        const hasFunctionPass = content.includes('class FunctionPass') || content.includes('FunctionPass : public Pass');
        const hasAnalysisMgr = content.includes('AnalysisManager');

        if (!hasPassBase || !hasFunctionPass || !hasAnalysisMgr) {
          list.push({
            id: 'diag-pass-iface',
            filePath: activeFile.path,
            line: 20,
            column: 1,
            severity: 'warning',
            code: 'QIR-OPT-001',
            message: 'Pass infrastructure incomplete: Ensure Pass pure virtual base, FunctionPass adapter, and AnalysisManager are defined.',
            source: 'OptValidator',
          });
        }
      }

      // Gate Fusion & Peephole Pass Verification for gate_fusion.h / gate_fusion.cpp
      if (activeFile.name === 'gate_fusion.h' || activeFile.name === 'gate_fusion.cpp') {
        const hasPassClass = content.includes('class GateFusionPass') && content.includes('FunctionPass');
        const hasSelfInverse = content.includes('performSelfInverseCancellation');
        const hasRotMerge = content.includes('performRotationMerging');
        const hasMetrics = content.includes('GateFusionMetrics') && content.includes('gates_cancelled');

        if (!hasPassClass || !hasSelfInverse || !hasRotMerge || !hasMetrics) {
          list.push({
            id: 'diag-opt-fusion',
            filePath: activeFile.path,
            line: 35,
            column: 1,
            severity: 'warning',
            code: 'QIR-OPT-002',
            message: 'GateFusionPass incomplete: Ensure FunctionPass inheritance, self-inverse cancellation, rotation merging, and GateFusionMetrics tracking are implemented.',
            source: 'OptValidator',
          });
        } else {
          list.push({
            id: 'diag-opt-fusion-ok',
            filePath: activeFile.path,
            line: 1,
            column: 1,
            severity: 'info',
            code: 'QIR-OPT-100',
            message: 'GateFusionPass verified: Self-inverse pairs (H*H, X*X, CNOT*CNOT), rotation merging (Rz(θ1)+Rz(θ2)), and telemetry metrics operational.',
            source: 'OptValidator',
          });
        }
      }
    }

    // Default informative diagnostic if none
    if (list.length === 0) {
      list.push({
        id: 'diag-ok',
        filePath: activeFile?.path || '/include/optimization/gate_fusion.h',
        line: 1,
        column: 1,
        severity: 'info',
        code: 'QIR-SPEC-001',
        message: 'Core Instruction Set & Quantum Optimization Subsystem verified: All passes, builder APIs, and profile constraints conform to QIR Base Profile.',
        source: 'QIR Validator',
      });
    }

    return list;
  }, [activeFile]);

  // Dirty count
  const dirtyCount = useMemo(() => {
    return Object.values(files).filter(f => !f.isFolder && f.isDirty).length;
  }, [files]);

  // Global keyboard shortcuts (Ctrl+`, Ctrl+B, Ctrl+I)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle bottom terminal panel: Ctrl+` or Cmd+`
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setBottomPanelOpen(prev => !prev);
      }
      // Toggle sidebar: Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      // Toggle copilot: Ctrl+I or Cmd+I
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setCopilotOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Tab Selection & File Opening
  const handleSelectFile = useCallback((fileId: string) => {
    const targetFile = files[fileId];
    if (!targetFile || targetFile.isFolder) return;

    // Check if already in openTabs
    const existing = openTabs.find(t => t.id === fileId);
    if (!existing) {
      setOpenTabs(prev => [
        ...prev,
        {
          id: targetFile.id,
          filePath: targetFile.path,
          title: targetFile.name,
          language: targetFile.language,
          isDirty: !!targetFile.isDirty,
        },
      ]);
    }
    setActiveTabId(fileId);
    setHighlightLine(null);
  }, [files, openTabs]);

  const handleCloseTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const closeIndex = prev.findIndex(t => t.id === tabId);
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        if (filtered.length > 0) {
          const nextTab = filtered[closeIndex] || filtered[closeIndex - 1] || filtered[0];
          setActiveTabId(nextTab.id);
        } else {
          setActiveTabId('');
        }
      }
      return filtered;
    });
  }, [activeTabId]);

  // Content Modification in Editor
  const handleContentChange = useCallback((fileId: string, newContent: string) => {
    setFiles(prev => {
      const target = prev[fileId];
      if (!target) return prev;
      return {
        ...prev,
        [fileId]: {
          ...target,
          content: newContent,
          isDirty: true,
        },
      };
    });

    setOpenTabs(prev => prev.map(t => t.id === fileId ? { ...t, isDirty: true } : t));
  }, []);

  // Save File
  const handleSaveFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const target = prev[fileId];
      if (!target) return prev;
      return {
        ...prev,
        [fileId]: {
          ...target,
          isDirty: false,
        },
      };
    });

    setOpenTabs(prev => prev.map(t => t.id === fileId ? { ...t, isDirty: false } : t));

    setTerminalLines(prev => [
      ...prev,
      {
        id: `save-${Date.now()}`,
        type: 'info',
        text: `[SAVED] ${files[fileId]?.path || fileId}`,
      },
    ]);
  }, [files]);

  // Create File or Folder
  const handleCreateFile = useCallback((name: string, parentPath = '/', isFolder = false) => {
    const cleanParent = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
    const newPath = `${cleanParent}/${name}`;
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const lang = getLanguageForFile(name);

    // Find parent ID
    let parentId = 'root';
    Object.values(files).forEach(f => {
      if (f.isFolder && f.path === (cleanParent || '/')) {
        parentId = f.id;
      }
    });

    // Generate specialized starter template based on file type
    const getStarterContent = () => {
      if (isFolder) return '';
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'qc' || ext === 'qua') {
        const circuitName = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_') || 'MainCircuit';
        return `/**
 * @file ${newPath}
 * @brief QuantumCode (.${ext}) Source Module
 * Target: QIR Platform Enterprise
 */

#pragma qpu_target superconducting

@pulse(shape="DRAG", duration=20.0, amplitude=1.0, beta=0.18)
gate CustomHadamard(qubit q) {
    H(q);
}

circuit ${circuitName}() -> Result {
    // 1. Allocate linear-typed qubit registers
    qubit data[4];
    qubit ancilla;

    // 2. State preparation & superposition
    CustomHadamard(data[0]);
    CustomHadamard(data[1]);
    CustomHadamard(data[2]);
    CustomHadamard(data[3]);

    // 3. Oracle phase kickback & inversion
    X(ancilla);
    H(ancilla);
    MCX(data[0], data[1], data[2], data[3], ancilla);

    // 4. Automatic adjoint uncompute block
    adj {
        CustomHadamard(data[0]);
        CustomHadamard(data[1]);
        CustomHadamard(data[2]);
        CustomHadamard(data[3]);
    }

    // 5. Linear typed terminal measurement
    return measure(data);
}
`;
      }
      if (ext === 'h' || ext === 'hpp') {
        const guard = name.toUpperCase().replace(/[^A-Z0-9_]/g, '_') + '_';
        return `/**\n * @file ${newPath}\n */\n\n#pragma once\n\nnamespace qir {\n\n// TODO: Implement declarations\n\n} // namespace qir\n`;
      }
      if (ext === 'cpp') {
        return `/**\n * @file ${newPath}\n */\n\n#include <iostream>\n#include <vector>\n\nnamespace qir {\n\n// TODO: Implement definitions\n\n} // namespace qir\n`;
      }
      return `/**\n * @file ${newPath}\n * Quantum Intermediate Representation (QIR)\n */\n\n`;
    };

    const newFile: WorkspaceFile = {
      id,
      name,
      path: newPath,
      content: getStarterContent(),
      language: lang,
      isFolder,
      isOpen: true,
      parentId,
      children: isFolder ? [] : undefined,
    };

    setFiles(prev => {
      const next = { ...prev, [id]: newFile };
      if (next[parentId]) {
        next[parentId] = {
          ...next[parentId],
          children: [...(next[parentId].children || []), id],
        };
      }
      return next;
    });

    if (!isFolder) {
      setOpenTabs(prev => {
        if (prev.some(t => t.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            filePath: newPath,
            title: name,
            language: lang,
            isDirty: false,
          },
        ];
      });
      setActiveTabId(id);
      setHighlightLine(null);
    }
  }, [files]);

  // Delete File or Folder (recursive)
  const handleDeleteFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const next = { ...prev };
      const target = next[fileId];
      if (!target) return prev;

      // Recursively collect all descendant IDs to delete
      const idsToDelete = new Set<string>([fileId]);
      const collectChildren = (id: string) => {
        const item = next[id];
        if (item?.children) {
          item.children.forEach(cId => {
            idsToDelete.add(cId);
            collectChildren(cId);
          });
        }
      };
      if (target.isFolder) {
        collectChildren(fileId);
      }

      // Remove from parent's children list
      if (target.parentId && next[target.parentId]) {
        next[target.parentId] = {
          ...next[target.parentId],
          children: next[target.parentId].children?.filter(cId => cId !== fileId),
        };
      }

      // Delete all collected items
      idsToDelete.forEach(id => {
        delete next[id];
      });

      // Also close tabs for any deleted files
      setOpenTabs(prevTabs => {
        const remaining = prevTabs.filter(t => !idsToDelete.has(t.id));
        if (idsToDelete.has(activeTabId)) {
          setActiveTabId(remaining.length > 0 ? remaining[0].id : '');
        }
        return remaining;
      });

      return next;
    });
  }, [activeTabId]);

  // Rename File
  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    setFiles(prev => {
      const target = prev[fileId];
      if (!target) return prev;
      const pathParts = target.path.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      const newLang = getLanguageForFile(newName);
      return {
        ...prev,
        [fileId]: {
          ...target,
          name: newName,
          path: newPath,
          language: newLang,
        },
      };
    });

    setOpenTabs(prev => prev.map(t => {
      if (t.id === fileId) {
        const pathParts = t.filePath.split('/');
        pathParts[pathParts.length - 1] = newName;
        return {
          ...t,
          title: newName,
          filePath: pathParts.join('/'),
          language: getLanguageForFile(newName),
        };
      }
      return t;
    }));
  }, []);

  // Git Commit
  const handleCommitChanges = useCallback((message: string) => {
    setFiles(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k].isDirty) {
          next[k] = { ...next[k], isDirty: false };
        }
      });
      return next;
    });
    setOpenTabs(prev => prev.map(t => ({ ...t, isDirty: false })));

    setTerminalLines(prev => [
      ...prev,
      {
        id: `git-${Date.now()}`,
        type: 'success',
        text: `[git commit] [main ${Math.random().toString(16).substring(2, 9)}] ${message}`,
      },
    ]);
  }, []);

  // Insert code generated by Copilot
  const handleInsertCodeFromCopilot = useCallback((codeToInsert: string) => {
    if (!activeFile) return;
    const updated = activeFile.content + '\n\n' + codeToInsert;
    handleContentChange(activeFile.id, updated);
    setTerminalLines(prev => [
      ...prev,
      {
        id: `insert-${Date.now()}`,
        type: 'info',
        text: `[Copilot] Inserted code snippet into ${activeFile.name}`,
      },
    ]);
  }, [activeFile, handleContentChange]);

  // Diagnostic jump to line
  const handleSelectDiagnostic = useCallback((diag: DiagnosticItem) => {
    // Find file
    const file = Object.values(files).find(f => f.path === diag.filePath);
    if (file) {
      handleSelectFile(file.id);
      setHighlightLine(diag.line);
    }
  }, [files, handleSelectFile]);

  // Live Error Debugging Trigger
  const handleTriggerAiDebug = useCallback((diag: DiagnosticItem) => {
    // Find source file content if available
    const file = Object.values(files).find(f => f.path === diag.filePath);
    setCopilotOpen(true);
    if (copilotRef.current) {
      copilotRef.current.debugError({
        errorContext: `[${diag.code}] ${diag.message} (Source: ${diag.source})`,
        filePath: diag.filePath,
        fileContent: file?.content,
        line: diag.line,
        column: diag.column,
      });
    }
  }, [files]);

  // Simulated Asynchronous Compilation & Terminal Execution
  const executeCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();

    setTerminalLines(prev => [
      ...prev,
      {
        id: `input-${Date.now()}`,
        type: 'input',
        text: `user@qir-dev:~/qir-platform$ ${trimmed}`,
      },
    ]);

    if (trimmed === 'clear') {
      setTerminalLines([]);
      return;
    }

    if (trimmed === 'help') {
      setTerminalLines(prev => [
        ...prev,
        {
          id: `h-${Date.now()}`,
          type: 'output',
          text: `Supported qir-platform build commands:
  make / make -j8               - Compiles qir_core, qir-opt, qir-compile, qir-validate, qir-fuzz via CMake & Ninja
  ./scripts/build.sh            - Full automated pipeline with LLVM 17 toolchain checks
  ./tools/qir-opt --passes=clifford-t,routing,gate-fusion - Runs Bleeding-Edge compiler passes
  ./tools/qir-fuzz/qir-fuzz --iterations=1000 - Automated QIR profile fuzzer & invariant stress-tester
  ./tools/fuzz/qir_fuzzer       - Adversarial mutation fuzzer for deep QIR AST verification
  ./tests/unit/test_quantum_system_expansion - Runs 5-Phase Expansion suite (Live Reactivity, Pauli-Frame, LTO, Hypergraph, Lazy ORC)
  ./tests/unit/test_quantum_code_engine - Runs Phase I-IV QuantumCode & QDB test suite (Linear types, T-depth, joins, telemetry)
  ./tests/unit/test_quantum_db  - Runs Catch2 test suite for Enterprise Quantum Database (QDB) & QuantumCode
  ./tests/unit/test_enterprise_qllvm - Runs test suite for all 40 extended Enterprise QLLVM modules
  ./tests/unit/test_bleeding_edge - Runs test suite for all 20 bleeding-edge architectural modules
  ./tests/unit/test_optimizer   - Runs optimizer unit test suite (cancellation, fusion, commutation)
  ./tools/qir-compile/qir-compile <file.qasm> - Lowers OpenQASM 3 to LLVM QIR bitcode
  ./tools/qir-validate/qir-validate <file.ll> - Checks adherence to QIR Base Profile v1.0
  ./scripts/simulate_error.sh   - Simulates a quantum Base Profile runtime error & triggers live AI debugging
  ctest / ./scripts/test.sh     - Executes Catch2/CTest unit & integration suites
  python scripts/check_qir_conformance.py     - Runs automated QIR conformance test
  git status / ls / cat <file>  - Standard development environment utilities`,
        },
      ]);
      return;
    }

    if (trimmed === 'ls' || trimmed === 'ls -la') {
      setTerminalLines(prev => [
        ...prev,
        {
          id: `ls-${Date.now()}`,
          type: 'output',
          text: `CMakeLists.txt  Makefile  README.md  pyproject.toml  docs/  specs/  include/  src/  runtime/  backends/  tools/  examples/  tests/  scripts/`,
        },
      ]);
      return;
    }

    if (trimmed === 'pwd') {
      setTerminalLines(prev => [
        ...prev,
        { id: `pwd-${Date.now()}`, type: 'output', text: '/home/user/qir-platform' },
      ]);
      return;
    }

    if (trimmed.startsWith('cat ')) {
      const filename = trimmed.slice(4).trim();
      const matched = Object.values(files).find(f => f.name === filename || f.path.endsWith(filename));
      setTerminalLines(prev => [
        ...prev,
        {
          id: `cat-${Date.now()}`,
          type: 'output',
          text: matched ? matched.content.slice(0, 1000) : `cat: ${filename}: No such file or directory`,
        },
      ]);
      return;
    }

    if (trimmed === 'git status') {
      setTerminalLines(prev => [
        ...prev,
        {
          id: `gst-${Date.now()}`,
          type: 'output',
          text: `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  (use "git commit" to save workspace changes)\n` +
            (dirtyCount > 0
              ? Object.values(files).filter(f => f.isDirty).map(f => `\tmodified:   ${f.path}`).join('\n')
              : '\t(working tree clean)'),
        },
      ]);
      return;
    }

    // Large-scale asynchronous build: make / build.sh
    if (trimmed.startsWith('make') || trimmed === './scripts/build.sh' || trimmed.startsWith('cmake')) {
      setIsBuilding(true);
      setBottomPanelTab('terminal');

      const steps = [
        { delay: 80, text: '[cmake] Detecting C++ compiler: clang++-17 (std=c++20)...' },
        { delay: 200, text: '[cmake] Found LLVM 17.0.6 at /usr/lib/llvm-17/lib/cmake/llvm' },
        { delay: 350, text: '[  5%] Building CXX object src/core/context.cpp.o' },
        { delay: 500, text: '[ 11%] Building CXX object src/ir/type.cpp.o (Linear Logic & Dependent Registers)' },
        { delay: 650, text: '[ 18%] Building CXX object src/ir/value.cpp.o' },
        { delay: 800, text: '[ 25%] Building CXX object src/ir/instruction.cpp.o' },
        { delay: 950, text: '[ 32%] Building CXX object src/ir/builder.cpp.o' },
        { delay: 1100, text: '[ 39%] Building CXX object src/ir/hypergraph.cpp.o (QuantumHypergraph DAG Engine)' },
        { delay: 1250, text: '[ 46%] Building CXX object src/optimization/pass.cpp.o' },
        { delay: 1400, text: '[ 53%] Building CXX object src/optimization/gate_fusion.cpp.o' },
        { delay: 1550, text: '[ 60%] Building CXX object src/optimization/clifford_t.cpp.o (Phase Polynomial Synthesis)' },
        { delay: 1700, text: '[ 62%] Building CXX object src/optimization/scheduler.cpp.o (Sliding Window Scheduler)' },
        { delay: 1850, text: '[ 68%] Building CXX object src/mlir/passes/LoopUnrolling.cpp.o (Quantum MLIR Dialect)' },
        { delay: 2000, text: '[ 74%] Building CXX object src/fault_tolerance/magic_state.cpp.o (15-to-1 Distillation)' },
        { delay: 2150, text: '[ 80%] Building CXX object src/adapter/astar_router.cpp.o (A* Graph Router & DRAG Pulse)' },
        { delay: 2300, text: '[ 85%] Building CXX object src/validation/stabilizer_validator.cpp.o (Aaronson-Gottesman Tableau)' },
        { delay: 2450, text: '[ 89%] Linking CXX shared library build/lib/libqir_core.so' },
        { delay: 2550, text: '[ 92%] Building CXX executable build/bin/qir-compile' },
        { delay: 2650, text: '[ 94%] Building CXX executable build/bin/qir-validate' },
        { delay: 2750, text: '[ 96%] Building CXX executable build/bin/qir-opt' },
        { delay: 2850, text: '[ 97%] Building CXX executable build/bin/qir-fuzz' },
        { delay: 2950, text: '[ 98%] Building CXX executable build/bin/test_optimizer' },
        { delay: 3050, text: '[ 99%] Building CXX executable build/bin/test_bleeding_edge' },
        { delay: 3150, text: '[100%] Building CXX executable build/bin/test_enterprise_qllvm' },
        { delay: 3250, text: '[SUCCESS] Build finished successfully! 7 binaries and 1 shared library generated in ./build/', isFinal: true },
      ];

      steps.forEach(step => {
        setTimeout(() => {
          setTerminalLines(prev => [
            ...prev,
            {
              id: `step-${Date.now()}-${Math.random()}`,
              type: step.isFinal ? 'success' : 'progress',
              text: step.text,
            },
          ]);

          setBuildLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${step.text}`,
          ]);

          if (step.isFinal) {
            setIsBuilding(false);
          }
        }, step.delay);
      });
      return;
    }

    // Quantum Optimization Pass Runner: qir-opt
    if (trimmed.includes('qir-opt')) {
      setIsBuilding(true);
      const isGateFusion = trimmed.includes('gate-fusion') || trimmed.includes('--passes=');
      const isPrintStats = trimmed.includes('--print-stats') || trimmed.includes('--verbose') || isGateFusion;

      const optSteps = [
        { delay: 150, text: '[qir-opt] Initializing Quantum Optimization Pipeline [LLVM 17 / C++20]...', type: 'info' as const },
        { delay: 350, text: '  [LOAD] Input module: examples/bell_pair/bell_pair.ll (18 quantum instructions loaded)', type: 'progress' as const },
        { delay: 550, text: '  [PASS] Registering GateFusionPass (Peephole Optimization, Self-Inverse Cancellation, Rotation Merging)', type: 'progress' as const },
        { delay: 750, text: '  -> Iteration 1: Scanning adjacent self-inverse operations (H*H, X*X, Z*Z, CNOT*CNOT)...', type: 'output' as const },
        { delay: 950, text: '     [CANCEL] Found 2 adjacent H gates on %q0 -> Erased safely via iterator splicing (H*H = I)', type: 'progress' as const },
        { delay: 1150, text: '     [CANCEL] Found 2 adjacent CNOT gates on [%q0, %q1] -> Erased pair (CNOT*CNOT = I)', type: 'progress' as const },
        { delay: 1350, text: '     [CANCEL] Found 2 adjacent X gates on %q1 -> Erased pair (X*X = I)', type: 'progress' as const },
        { delay: 1550, text: '  -> Iteration 2: Scanning consecutive single-qubit rotations...', type: 'output' as const },
        { delay: 1750, text: '     [FUSE] Found Rz(0.7854) + Rz(0.7854) on %q0 -> Fused into Rz(1.5708) (pi/2)', type: 'progress' as const },
        { delay: 1950, text: '     [FUSE] Found Rz(3.1416) + Rz(3.1416) on %q1 -> Angle 2pi mod 2pi = 0.0 -> Identity eliminated', type: 'progress' as const },
        { delay: 2150, text: '  -> Iteration 3: Commutation barrier analysis confirmed no further reducible pairs. Fixpoint reached.', type: 'output' as const },
        { delay: 2350, text: `=== Quantum Gate Fusion Optimization Report ===
  Pass Name:                      quantum-gate-fusion
  Gates Cancelled (Self-Inverse): 6
  Rotations Merged:               2
  Total Quantum Gates (Before):   18
  Total Quantum Gates (After):    10
  Critical Latency Reduction:     44.44%
  Fixpoint Iterations:            3
===============================================`, type: 'info' as const },
        { delay: 2550, text: `{
  "pass": "quantum-gate-fusion",
  "status": "converged",
  "gates_cancelled": 6,
  "rotations_merged": 2,
  "total_gates_before": 18,
  "total_gates_after": 10,
  "latency_reduction_percentage": 44.44,
  "iterations_executed": 3
}`, type: 'success' as const },
        { delay: 2750, text: '[qir-opt] Pass pipeline completed successfully. Optimized bitcode emitted. PreservedAnalyses: none.', type: 'success' as const, isFinal: true },
      ];

      optSteps.forEach(step => {
        setTimeout(() => {
          setTerminalLines(prev => [
            ...prev,
            {
              id: `opt-${Date.now()}-${Math.random()}`,
              type: step.type,
              text: step.text,
            },
          ]);

          setBuildLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] [qir-opt] ${step.text.replace(/\n/g, ' ')}`,
          ]);

          if (step.isFinal) {
            setIsBuilding(false);
          }
        }, step.delay);
      });
      return;
    }

    // Optimizer Unit Test Suite runner
    if (trimmed.includes('test_optimizer')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `to-1`, type: 'info', text: '=== Running QIR Optimizer Unit Test Suite [Catch2 / C++20] ===' },
          { id: `to-2`, type: 'progress', text: '  [TEST 1/6] Self-inverse cancellation (H-H, X-X, Z-Z) ... PASSED (Cancelled 6 redundant gates)' },
          { id: `to-3`, type: 'progress', text: '  [TEST 2/6] Multi-qubit CNOT self-inverse cancellation ... PASSED (CNOT-CNOT cancelled safely)' },
          { id: `to-4`, type: 'progress', text: '  [TEST 3/6] Parameterized rotation merging (Rz(pi/4) + Rz(pi/4)) ... PASSED (Fused into Rz(pi/2))' },
          { id: `to-5`, type: 'progress', text: '  [TEST 4/6] Rotation annihilation to identity (Rz(pi) + Rz(pi) => I) ... PASSED (Annihilated to Identity)' },
          { id: `to-6`, type: 'progress', text: '  [TEST 5/6] Commutation awareness & barrier preservation ... PASSED (Disjoint gate commutes; H(q0) cancelled, X(q1) intact)' },
          { id: `to-7`, type: 'progress', text: '  [TEST 6/6] Structured JSON diagnostics serialization ... PASSED (Metrics schema validated)' },
          { id: `to-8`, type: 'success', text: '=== All 6 Optimizer Unit Tests Passed Successfully (0 failures, 0 warnings) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_optimizer: 6/6 tests passed.`,
        ]);
        setIsBuilding(false);
      }, 700);
      return;
    }

    // QIR Validation tool
    if (trimmed.includes('qir-validate')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qv-1`, type: 'info', text: 'qir-validate: Parsing QIR LLVM module bitcode and instruction graphs...' },
          { id: `qv-2`, type: 'progress', text: '  [CHECK] Verifying QIR Base Profile v1.0 specification...' },
          { id: `qv-3`, type: 'progress', text: '  [PASS] All %Qubit* handles dynamically allocated via __quantum__rt__qubit_allocate' },
          { id: `qv-4`, type: 'progress', text: '  [PASS] Single-qubit gates (H, X, Z, S) and multi-qubit gates (CNOT, CZ) conform to ABI' },
          { id: `qv-5`, type: 'progress', text: '  [PASS] Projective measurements (Mz) correctly recorded into output registers' },
          { id: `qv-6`, type: 'progress', text: '  [PASS] No illegal dynamic branches (br i1) inside quantum body' },
          { id: `qv-7`, type: 'success', text: '[VALIDATION PASSED] Circuit and core instructions strictly conform to QIR Base Profile v1.0.' },
        ]);
        setIsBuilding(false);
      }, 700);
      return;
    }

    // QIR Compile tool
    if (trimmed.includes('qir-compile')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qc-1`, type: 'info', text: 'qir-compile: Compiling OpenQASM 3 to LLVM QIR...' },
          { id: `qc-2`, type: 'progress', text: '  [AST] Parsed 2 qubits (q[0], q[1]), 2 classical bits (c[0], c[1])' },
          { id: `qc-3`, type: 'progress', text: '  [IRBuilder] Emitted __quantum__qis__h__body(%Qubit* %q0)' },
          { id: `qc-4`, type: 'progress', text: '  [IRBuilder] Emitted __quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q1)' },
          { id: `qc-5`, type: 'success', text: '[SUCCESS] Emitted canonical QIR bitcode: bell_pair.ll (Base Profile attributes attached)' },
        ]);
        setIsBuilding(false);
      }, 800);
      return;
    }

    // Specific test for IR Builder
    if (trimmed.includes('test_ir_builder')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `tib-1`, type: 'info', text: '[TEST] Running QIR Instruction Set & Fluent IRBuilder Test Suite...' },
          { id: `tib-2`, type: 'progress', text: '  [PASS] QubitAllocate / QubitRelease lifecycle tracking' },
          { id: `tib-3`, type: 'progress', text: '  [PASS] Single-qubit gates: H, X, Z, S, T opcode validation' },
          { id: `tib-4`, type: 'progress', text: '  [PASS] Multi-qubit gates: CNOT, CZ opcode & operand validation' },
          { id: `tib-5`, type: 'progress', text: '  [PASS] Measurement: Mz result handle generation' },
          { id: `tib-6`, type: 'progress', text: '  [PASS] Fluent method chaining (builder.H().CNOT().Barrier())' },
          { id: `tib-7`, type: 'success', text: '[PASS] All QIR Core Instruction Set and IRBuilder tests passed!' },
        ]);
        setIsBuilding(false);
      }, 600);
      return;
    }

    // CTest
    if (trimmed === 'ctest' || trimmed === './scripts/test.sh') {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `ct-1`, type: 'info', text: 'Running test suite via CTest...' },
          { id: `ct-2`, type: 'progress', text: '  Test #1: unit/test_types ............................................... Passed (0.01 sec)' },
          { id: `ct-3`, type: 'progress', text: '  Test #2: unit/test_ir_builder (H, X, Z, S, CNOT, CZ, Mz, Alloc/Rel) ... Passed (0.02 sec)' },
          { id: `ct-4`, type: 'progress', text: '  Test #3: unit/test_optimizer (Gate Fusion, Self-Inverse, Rotations) .... Passed (0.02 sec)' },
          { id: `ct-5`, type: 'progress', text: '  Test #4: unit/test_validator ........................................... Passed (0.03 sec)' },
          { id: `ct-6`, type: 'progress', text: '  Test #5: conformance/base_profile/conformance .......................... Passed (0.04 sec)' },
          { id: `ct-7`, type: 'progress', text: '  Test #6: unit/test_bleeding_edge (Parts I-V 20 modules verification) ... Passed (0.05 sec)' },
          { id: `ct-7b`, type: 'progress', text: '  Test #7: unit/test_enterprise_qllvm (Parts I-VI 40 modules verification) ... Passed (0.06 sec)' },
          { id: `ct-7c`, type: 'progress', text: '  Test #8: unit/test_quantum_db (QDB Catalog, Serializer, WAL, JIT & QuantumCode) ... Passed (0.04 sec)' },
          { id: `ct-7d`, type: 'progress', text: '  Test #9: unit/test_quantum_code_engine (Phases I-IV DSL, Matroid T-depth, QMC Pricer) ... Passed (0.05 sec)' },
          { id: `ct-7e`, type: 'progress', text: '  Test #10: unit/test_quantum_system_expansion (Phases I-V Live Reactivity, Pauli-Frame, LTO, Hypergraph, Lazy ORC) ... Passed (0.05 sec)' },
          { id: `ct-8`, type: 'success', text: '100% tests passed, 0 tests failed out of 10 (Total test time: 0.37 sec)' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] 10/10 test suites completed with 0 failures.`,
        ]);
        setIsBuilding(false);
      }, 750);
      return;
    }

    // Bleeding-Edge Architecture Unit Test Runner
    if (trimmed.includes('test_bleeding_edge')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `tbe-1`, type: 'info', text: '=== Running Bleeding-Edge Architecture Test Suite (Parts I-V) [Catch2 / C++20] ===' },
          { id: `tbe-2`, type: 'progress', text: '  [PART I: 1-4] Linear Logic, No-Cloning & Dependent Registers ... PASSED (Zero qubit leaks, [?N x %Qubit*] valid)' },
          { id: `tbe-3`, type: 'progress', text: '  [PART II: 5-8] Clifford+T Phase Synthesis & Sliding Window Buffer .. PASSED (50.0% T-count reduction)' },
          { id: `tbe-4`, type: 'progress', text: '  [PART III: 9-12] Quantum Hypergraph DAG & Quake Dialect Lowering .... PASSED (O(1) topological lookups verified)' },
          { id: `tbe-5`, type: 'progress', text: '  [PART IV: 13-15] Stabilizer Tableau Simulation & Hoare Invariants .. PASSED (2-qubit Bell tableau verified)' },
          { id: `tbe-6`, type: 'progress', text: '  [PART V: 16-20] Topology Routing & OpenPulse Microwave Schedules .... PASSED (HeavyHex token swap routed)' },
          { id: `tbe-7`, type: 'success', text: '=== All 20 Bleeding-Edge Architectural Modules Verified (5/5 Suites Passed, 0 Failures) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_bleeding_edge: 20/20 modules passed verification.`,
        ]);
        setIsBuilding(false);
      }, 750);
      return;
    }

    // Automatic QIR Profile Conformance Fuzzer
    if (trimmed.includes('qir-fuzz')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `fz-1`, type: 'info', text: '=== QIR Profile Conformance Fuzzer [LLVM 17 / C++20] ===' },
          { id: `fz-2`, type: 'progress', text: 'Generating 1,000 randomized edge-case QIR modules...' },
          { id: `fz-3`, type: 'progress', text: '  [FUZZ 250/1000] Testing unreleased qubit leaks & No-Cloning violations ... PASSED' },
          { id: `fz-4`, type: 'progress', text: '  [FUZZ 500/1000] Testing dynamic branching violations & live feed-forward ... PASSED' },
          { id: `fz-5`, type: 'progress', text: '  [FUZZ 750/1000] Testing deeply nested gate sequences & qudit transitions ... PASSED' },
          { id: `fz-6`, type: 'progress', text: '  [FUZZ 1000/1000] Testing classical feedback & mid-circuit reset recycling ... PASSED' },
          { id: `fz-7`, type: 'success', text: '[SUCCESS] 1000/1000 modules fuzz-tested: 0 crashes, 0 invariant breaches, 0 memory leaks.' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [qir-fuzz] 1,000 fuzz modules generated: 100% passed conformance.`,
        ]);
        setIsBuilding(false);
      }, 850);
      return;
    }

    // Extended 40 Enterprise Quantum Compiler & QLLVM Test Suite
    if (trimmed.includes('test_enterprise_qllvm')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `eq-1`, type: 'info', text: '=== Running Enterprise QLLVM 40-Module Verification Suite [Catch2 / C++20] ===' },
          { id: `eq-2`, type: 'progress', text: '  [PART I: 1-8] MLIR Dialect, Loop Unrolling, AST Transpiler & LTO ........ PASSED (QuantumDialect initialized)' },
          { id: `eq-3`, type: 'progress', text: '  [PART II: 9-16] Magic State Distillation, Lattice Surgery & Error Budget . PASSED (15-to-1 factory verified)' },
          { id: `eq-4`, type: 'progress', text: '  [PART III: 17-22] A* Heuristic Routing, DRAG Pulses & Crosstalk Sched ... PASSED (Zero crosstalk collisions)' },
          { id: `eq-5`, type: 'progress', text: '  [PART IV: 23-28] FPGA Conditioned Branching & Qubit Recycling ........... PASSED (Sub-microsecond feedback)' },
          { id: `eq-6`, type: 'progress', text: '  [PART V: 29-36] Hoare Logic Triples, Clifford Tableau & Memory Leaks ..... PASSED (0 unreleased handles)' },
          { id: `eq-7`, type: 'progress', text: '  [PART VI: 37-40] Hypergraph Subroutine Index, ORC JIT & Serialization ... PASSED (Cluster payload verified)' },
          { id: `eq-8`, type: 'success', text: '=== All 40 Enterprise Quantum Compiler & QLLVM Modules Verified (6/6 Suites Passed, 0 Failures) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_enterprise_qllvm: 40/40 modules passed verification.`,
        ]);
        setIsBuilding(false);
      }, 850);
      return;
    }

    // Adversarial Mutation Fuzzer
    if (trimmed.includes('qir_fuzzer')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qfz-1`, type: 'info', text: '=== QIR Adversarial Mutation Fuzzer [C++20 / LLVM 17] ===' },
          { id: `qfz-2`, type: 'progress', text: 'Synthesizing adversarial bitcode AST permutations...' },
          { id: `qfz-3`, type: 'progress', text: '  [MUTATION 1-500] Evaluating recursive block branches & dangling pointers ... PASSED' },
          { id: `qfz-4`, type: 'progress', text: '  [MUTATION 501-1000] Evaluating qudit dimensional bounds & phase gradients ... PASSED' },
          { id: `qfz-5`, type: 'success', text: '[PASS] 1,000 adversarial mutations executed with 0 crashes or UB.' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [qir_fuzzer] 1,000 adversarial mutations passed with zero errors.`,
        ]);
        setIsBuilding(false);
      }, 750);
      return;
    }

    // Enterprise Quantum Database (QDB) Test Runner
    if (trimmed.includes('test_quantum_db')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qdb-1`, type: 'info', text: '=== Running Enterprise Quantum Database (QDB) & QuantumCode Suite [Catch2 / C++20] ===' },
          { id: `qdb-2`, type: 'progress', text: '  [QDB Phase 1] QDBCatalog metadata tables & bytecode mapping ........... PASSED' },
          { id: `qdb-3`, type: 'progress', text: '  [QDB Phase 1] Record-to-State bitstring & amplitude serialization ...... PASSED' },
          { id: `qdb-4`, type: 'progress', text: '  [QDB Phase 1] QuantumHypergraph topological subroutine indexing ........ PASSED (Fingerprint match)' },
          { id: `qdb-5`, type: 'progress', text: '  [QDB Phase 1] Write-Ahead Log (WAL) ACID state persistence & recovery .. PASSED (LSN sequence verified)' },
          { id: `qdb-6`, type: 'progress', text: '  [QDB Phase 2] In-memory LLVM ORCv2 QDB JIT & result measurement decoding PASSED (94% solution confidence)' },
          { id: `qdb-7`, type: 'progress', text: '  [QDB Phase 3] Surface code lattice layout & defect boundary braiding ... PASSED (Rotated distance-3 patch)' },
          { id: `qdb-8`, type: 'progress', text: '  [QDB Phase 4] Distributed shard coordinator & cluster node routing ..... PASSED (Multi-QPU dispatched)' },
          { id: `qdb-9`, type: 'progress', text: '  [QDB Phase 5] QuantumCode (.qc) Linear Typing & AST-to-MLIR Lowering .. PASSED (No-Cloning strictly enforced)' },
          { id: `qdb-10`, type: 'success', text: '=== All QDB & QuantumCode Core Verification Checks Passed (10/10 Passed, 0 Failures) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_quantum_db: 10/10 test assertions passed.`,
        ]);
        setIsBuilding(false);
      }, 800);
      return;
    }

    // Phase I-IV QuantumCode & QDB Engine Test Runner
    if (trimmed.includes('test_quantum_code_engine')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qce-1`, type: 'info', text: '=== Running QuantumCode (.qc/.qua) & QDB Engine Phases I-IV [Catch2 / C++20] ===' },
          { id: `qce-2`, type: 'progress', text: '  [Phase I] Zero-Overhead Notebook Mount (.qua Live Stream) ............. PASSED' },
          { id: `qce-3`, type: 'progress', text: '  [Phase I] Affine Linear-Type Enforcement (No-Cloning compile abort) ... PASSED' },
          { id: `qce-4`, type: 'progress', text: '  [Phase I] Transparent C-Style Pointer Arithmetic (%Qubit* base offset)  PASSED' },
          { id: `qce-5`, type: 'progress', text: '  [Phase I] First-Class Adjoint Inversion Modifiers (adj uncomputation) . PASSED' },
          { id: `qce-6`, type: 'progress', text: '  [Phase I] Multi-State Qudit & Qutrit Primitives (qudit_d3 Weyl) ....... PASSED' },
          { id: `qce-7`, type: 'progress', text: '  [Phase I] Explicit Pulse-Shape Annotations (@pulse DRAG/Gaussian) ..... PASSED' },
          { id: `qce-8`, type: 'progress', text: '  [Phase II] Commutation-Aware Sliding Window Scheduling ................. PASSED' },
          { id: `qce-9`, type: 'progress', text: '  [Phase II] Matroid Phase Polynomial T-Depth Reduction (55% reduction) . PASSED' },
          { id: `qce-10`, type: 'progress', text: '  [Phase II] Multi-Stage Progressive Lowering (quantum.* to QIR bitcode) . PASSED' },
          { id: `qce-11`, type: 'progress', text: '  [Phase III] Entangled Multi-Table Superposition Joins (quantum-join) ... PASSED' },
          { id: `qce-12`, type: 'progress', text: '  [Phase III] Zero-Observation Deferred Transactions & Adjoint Rollback .. PASSED' },
          { id: `qce-13`, type: 'progress', text: '  [Phase III] Grover Amplitude-Accelerated Unstructured Search (O(sqrt(N))) PASSED' },
          { id: `qce-14`, type: 'progress', text: '  [Phase IV] LLVM ORC JIT In-Memory Hot-Swapping ......................... PASSED' },
          { id: `qce-15`, type: 'progress', text: '  [Phase IV] Sub-Microsecond Mid-Circuit Feed-Forward (br i1 FPGA) ....... PASSED' },
          { id: `qce-16`, type: 'progress', text: '  [Phase IV] Live Thermal Telemetry Routing (T1/T2 dynamic mapping) ...... PASSED (Defects bypassed)' },
          { id: `qce-17`, type: 'progress', text: '  [Phase IV] Quantum Monte Carlo Financial Pricer (qmc-pricer amplitude) . PASSED (Option price verified)' },
          { id: `qce-18`, type: 'success', text: '=== All 16 Phase I-IV Modules Verified (16/16 Passed, 0 Failures) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_quantum_code_engine: 16/16 test assertions passed.`,
        ]);
        setIsBuilding(false);
      }, 850);
      return;
    }

    // 5-Phase Quantum Platform Expansion Test Runner
    if (trimmed.includes('test_quantum_system_expansion')) {
      setIsBuilding(true);
      setTimeout(() => {
        setTerminalLines(prev => [
          ...prev,
          { id: `qse-1`, type: 'info', text: '=== Running 5-Phase Quantum Platform Expansion Suite [Catch2 / C++20] ===' },
          { id: `qse-2`, type: 'progress', text: '  [Phase I] Live-Reactivity UI Variable State Binding (.qua) ......... PASSED' },
          { id: `qse-3`, type: 'progress', text: '  [Phase I] Dependent Qubit Lifetime Scoping & Allocation Boundaries . PASSED' },
          { id: `qse-4`, type: 'progress', text: '  [Phase I] C-Style Raw Register Casting (void* to [?N x %Qubit*]*) .. PASSED' },
          { id: `qse-5`, type: 'progress', text: '  [Phase I] Macro-Level Hardware Pragmas (#pragma qpu_target) ........ PASSED' },
          { id: `qse-6`, type: 'progress', text: '  [Phase I] Zero-Copy Dense Matrix-to-Unitary Direct Mapping ......... PASSED' },
          { id: `qse-7`, type: 'progress', text: '  [Phase II] Cross-Dialect Polyhedral Loop Nesting (affine & quantum) . PASSED' },
          { id: `qse-8`, type: 'progress', text: '  [Phase II] Pauli-Frame Tracking & Clifford Propagation (H*X*H = Z) .. PASSED' },
          { id: `qse-9`, type: 'progress', text: '  [Phase II] Clifford Gate Path-Length Minimization (H*H = I, S^4 = I)  PASSED' },
          { id: `qse-10`, type: 'progress', text: '  [Phase II] Dynamic Phase Polynomial Factorization (Reed-Muller) .... PASSED' },
          { id: `qse-11`, type: 'progress', text: '  [Phase II] Commutation-Driven Dead Code Elimination ................ PASSED' },
          { id: `qse-12`, type: 'progress', text: '  [Phase III] QIR Opaque Pointer Type Abstraction (ptr %q_*) ......... PASSED' },
          { id: `qse-13`, type: 'progress', text: '  [Phase III] Target-Agnostic Profile Specialization (Base/Adaptive) .. PASSED' },
          { id: `qse-14`, type: 'progress', text: '  [Phase III] Asynchronous Runtime Event Hooks & LTO inlining ........ PASSED' },
          { id: `qse-15`, type: 'progress', text: '  [Phase III] Cross-Language Symbol Mangling Protection (extern "C") .. PASSED' },
          { id: `qse-16`, type: 'progress', text: '  [Phase IV] Entangled Hypergraph Edge Compression (symmetric nodes) . PASSED' },
          { id: `qse-17`, type: 'progress', text: '  [Phase IV] Non-Destructive Read Query Snapshots (ancilla entangled)  PASSED' },
          { id: `qse-18`, type: 'progress', text: '  [Phase IV] Phase-Amplified Range Scanning (proportional depth) ..... PASSED' },
          { id: `qse-19`, type: 'progress', text: '  [Phase IV] Deferred Transaction Conflict Resolution (<psi_A|psi_B>) PASSED' },
          { id: `qse-20`, type: 'progress', text: '  [Phase IV] Topological Surface-Code Index Sharding (planar grid) ... PASSED' },
          { id: `qse-21`, type: 'progress', text: '  [Phase V] LLVM ORCv2 In-Memory Lazy Materialization ................ PASSED' },
          { id: `qse-22`, type: 'progress', text: '  [Phase V] Sub-Microsecond FPGA Feed-Forward Loops (180ns latency) .. PASSED' },
          { id: `qse-23`, type: 'progress', text: '  [Phase V] Real-Time Thermal Decoherence Mitigation (re-route >25mK)  PASSED' },
          { id: `qse-24`, type: 'progress', text: '  [Phase V] Stabilizer Simulation Fast-Path Fallback (0 T-gates) ..... PASSED' },
          { id: `qse-25`, type: 'progress', text: '  [Phase V] Unified Host-Accelerator Binary Bundling (CPU/GPU/QIR) ... PASSED' },
          { id: `qse-26`, type: 'success', text: '=== All 25 Phase I-V Platform Features Verified (25/25 Passed, 0 Failures) ===' },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [ctest] tests/unit/test_quantum_system_expansion: 25/25 test assertions passed.`,
        ]);
        setIsBuilding(false);
      }, 900);
      return;
    }

    // Error Simulation & Live Embedded AI Debugging Runner
    if (trimmed.includes('simulate_error') || trimmed.includes('simulate-error')) {
      setIsBuilding(true);
      setTimeout(() => {
        const errorText = `[FATAL ERROR] /home/user/qir-platform/examples/bell_pair/bell_pair.ll:8:3:
error: invalid branch target in QIR Base Profile
  br i1 %outcome, label %apply_correction, label %exit
  ^
QIR Validator Error [QIR-BP-001]: Dynamic branching conditioned on measurement outcome '%outcome' is strictly forbidden in Base Profile v1.0. All qubit measurements must be terminal.
Compilation aborted with return code 1.`;

        setTerminalLines(prev => [
          ...prev,
          { id: `err-sim-1`, type: 'info', text: 'Executing test target: ./scripts/simulate_error.sh...' },
          { id: `err-sim-2`, type: 'error', text: errorText },
          { 
            id: `err-sim-3`, 
            type: autoDebugEnabled ? 'progress' : 'info', 
            text: autoDebugEnabled 
              ? '⚡ [LIVE AI DEBUGGER ACTIVE] Intercepted runtime error. Engaging Gemini 3.8 to synthesize code repair...' 
              : 'ℹ️ [LIVE AI DEBUGGER DISABLED] Enable Live Debugging in status bar or bottom panel to automatically repair errors.' 
          },
        ]);
        setBuildLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [qir-validate] FATAL ERROR: QIR-BP-001 dynamic branch forbidden in Base Profile.`,
        ]);
        setIsBuilding(false);

        // If Live AI Debugging is enabled, automatically invoke embedded AI debugger
        if (autoDebugEnabled) {
          setCopilotOpen(true);
          if (copilotRef.current) {
            copilotRef.current.debugError({
              errorContext: errorText,
              filePath: '/examples/bell_pair/bell_pair.ll',
              fileContent: activeFile?.content,
              command: './scripts/simulate_error.sh',
              line: 8,
              column: 3,
            });
          }
        }
      }, 700);
      return;
    }

    // Generic command fallback
    setTerminalLines(prev => [
      ...prev,
      {
        id: `unknown-${Date.now()}`,
        type: 'output',
        text: `Executed '${trimmed}' with return code 0.`,
      },
    ]);
  }, [files, dirtyCount]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans antialiased">
      {/* 1. VS Code Top Window / Title Bar */}
      <TitleBar
        onRunBuild={() => executeCommand('make -j8')}
        onRunValidation={() => executeCommand('./tools/qir-validate/qir-validate examples/bell_pair/bell_pair.ll')}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        bottomPanelOpen={bottomPanelOpen}
        setBottomPanelOpen={setBottomPanelOpen}
        copilotOpen={copilotOpen}
        setCopilotOpen={setCopilotOpen}
        activeFileName={activeFile?.name}
      />

      {/* 2. Middle Main Body: ActivityBar + Sidebar + EditorArea + AiCopilotPanel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Far Left Activity Bar */}
        <ActivityBar
          activeView={activeSidebarView}
          setActiveView={setActiveSidebarView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          copilotOpen={copilotOpen}
          setCopilotOpen={setCopilotOpen}
          bottomPanelOpen={bottomPanelOpen}
          setBottomPanelOpen={setBottomPanelOpen}
          dirtyCount={dirtyCount}
          diagnosticCount={diagnostics.filter(d => d.severity === 'error' || d.severity === 'warning').length}
        />

        {/* Collapsible File Explorer / Search / Git Sidebar */}
        {sidebarOpen && (
          <Sidebar
            activeView={activeSidebarView}
            files={files}
            openTabs={openTabs}
            activeFileId={activeTabId}
            onSelectFile={handleSelectFile}
            onCloseTab={handleCloseTab}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onCommitChanges={handleCommitChanges}
            hideFiles={hideFilesAndDirectories}
            onToggleHideFiles={() => setHideFilesAndDirectories(prev => !prev)}
          />
        )}

        {/* Center: Editor Area & Bottom Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <EditorArea
            activeFile={activeFile}
            openTabs={openTabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onContentChange={handleContentChange}
            onSaveFile={handleSaveFile}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
            highlightLine={highlightLine}
          />

          {/* Toggleable Bottom Panel (Terminal, Build Output, Diagnostics) */}
          <BottomPanel
            isOpen={bottomPanelOpen}
            onClose={() => setBottomPanelOpen(false)}
            activeTab={bottomPanelTab}
            setActiveTab={setBottomPanelTab}
            terminalLines={terminalLines}
            onExecuteCommand={executeCommand}
            onClearTerminal={() => setTerminalLines([])}
            diagnostics={diagnostics}
            onSelectDiagnostic={handleSelectDiagnostic}
            isBuilding={isBuilding}
            buildLogs={buildLogs}
            autoDebugEnabled={autoDebugEnabled}
            onToggleAutoDebug={() => setAutoDebugEnabled(prev => !prev)}
            onTriggerAiDebug={handleTriggerAiDebug}
          />
        </div>

        {/* Right: Gemini AI Copilot Assistant Drawer */}
        <AiCopilotPanel
          ref={copilotRef}
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          activeFile={activeFile}
          onInsertCode={handleInsertCodeFromCopilot}
          autoDebugEnabled={autoDebugEnabled}
          onToggleAutoDebug={() => setAutoDebugEnabled(prev => !prev)}
        />
      </div>

      {/* 3. VS Code Status Bar */}
      <StatusBar
        diagnostics={diagnostics}
        currentLine={cursorPos.line}
        currentCol={cursorPos.col}
        language={activeFile?.language || 'cpp'}
        isBuilding={isBuilding}
        onToggleBottomPanel={() => setBottomPanelOpen(prev => !prev)}
        onToggleCopilot={() => setCopilotOpen(prev => !prev)}
        autoDebugEnabled={autoDebugEnabled}
        onToggleAutoDebug={() => setAutoDebugEnabled(prev => !prev)}
      />
    </div>
  );
}
