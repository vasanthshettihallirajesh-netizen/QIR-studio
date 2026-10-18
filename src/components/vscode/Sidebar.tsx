import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen, 
  FilePlus, 
  FolderPlus, 
  RefreshCw, 
  ChevronsDownUp, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  FileCode, 
  FileText, 
  Terminal, 
  Settings, 
  Atom, 
  Cpu, 
  GitCommit, 
  Play, 
  RotateCcw,
  Boxes,
  Zap,
  Split,
  Eye,
  EyeOff
} from 'lucide-react';
import { WorkspaceFile, TabItem, ActiveSidebarView } from '../../types/workspace';
import { PassDebuggerPanel } from './PassDebuggerPanel';
import { COMPILER_PASS_STEPS } from '../../data/passDebuggerData';

interface SidebarProps {
  activeView: ActiveSidebarView;
  files: Record<string, WorkspaceFile>;
  openTabs: TabItem[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onCreateFile: (name: string, parentPath?: string, isFolder?: boolean) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onCommitChanges: (message: string) => void;
  currentPassIndex?: number;
  onSelectPass?: (index: number) => void;
  diffViewOpen?: boolean;
  onToggleDiffView?: () => void;
  onExecuteCommand?: (cmd: string) => void;
  hideFiles?: boolean;
  onToggleHideFiles?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  files,
  openTabs,
  activeFileId,
  onSelectFile,
  onCloseTab,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onCommitChanges,
  currentPassIndex = 1,
  onSelectPass,
  diffViewOpen = false,
  onToggleDiffView,
  onExecuteCommand,
  hideFiles = true,
  onToggleHideFiles,
}) => {
  // Explorer states - All collapsed and hidden out of view by default
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.values(files).forEach(f => {
      if (f.isFolder) {
        initial[f.id] = true;
      }
    });
    return initial;
  });
  const [openEditorsCollapsed, setOpenEditorsCollapsed] = useState(true);
  const [qirPlatformCollapsed, setQirPlatformCollapsed] = useState(true);
  const [passDebuggerSectionCollapsed, setPassDebuggerSectionCollapsed] = useState(false);
  
  // Creation modal/input states
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newTargetParentId, setNewTargetParentId] = useState<string>('root');
  const [newItemName, setNewItemName] = useState('');
  
  // Renaming state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Global search states
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  // Git state
  const [commitMessage, setCommitMessage] = useState('');

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const collapseAllFolders = () => {
    const allCollapsed: Record<string, boolean> = {};
    Object.values(files).forEach(f => {
      if (f.isFolder && f.id !== 'root') {
        allCollapsed[f.id] = true;
      }
    });
    setCollapsedFolders(allCollapsed);
  };

  const handleStartCreate = (isFolder: boolean, parentId = 'root') => {
    setNewTargetParentId(parentId);
    if (parentId !== 'root') {
      setCollapsedFolders(prev => ({
        ...prev,
        [parentId]: false,
      }));
    }
    if (isFolder) {
      setIsCreatingFolder(true);
      setIsCreatingFile(false);
    } else {
      setIsCreatingFile(true);
      setIsCreatingFolder(false);
    }
    setNewItemName('');
  };

  const submitCreate = () => {
    if (!newItemName.trim()) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }
    const parent = files[newTargetParentId];
    const parentPath = parent ? parent.path : '/';
    onCreateFile(newItemName.trim(), parentPath, isCreatingFolder);
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setNewItemName('');
  };

  const handleStartRename = (file: WorkspaceFile) => {
    setEditingFileId(file.id);
    setEditName(file.name);
  };

  const submitRename = () => {
    if (editingFileId && editName.trim()) {
      onRenameFile(editingFileId, editName.trim());
    }
    setEditingFileId(null);
    setEditName('');
  };

  // Search matches
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    const results: Array<{ file: WorkspaceFile; lineNum: number; text: string }> = [];

    Object.values(files).forEach(f => {
      if (!f.isFolder && f.content) {
        const lines = f.content.split('\n');
        lines.forEach((line, idx) => {
          const comp = matchCase ? line : line.toLowerCase();
          if (comp.includes(query)) {
            results.push({
              file: f,
              lineNum: idx + 1,
              text: line.trim(),
            });
          }
        });
      }
    });
    return results;
  }, [files, searchQuery, matchCase]);

  // Dirty files for Git
  const dirtyFiles = useMemo(() => {
    return Object.values(files).filter(f => !f.isFolder && f.isDirty);
  }, [files]);

  // File Icon Helper
  const renderFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'qc' || ext === 'qua') {
      // White Trishula (Trident) logo for QuantumCode (.qc / .qua)
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
    if (ext === 'h' || ext === 'hpp') {
      return <span className="text-[#519aba] text-[11px] font-bold font-mono px-0.5">.h</span>;
    }
    if (ext === 'cpp' || ext === 'cc') {
      return <span className="text-[#00599c] text-[11px] font-bold font-mono px-0.5">C++</span>;
    }
    if (ext === 'yaml' || ext === 'yml') {
      return <span className="text-[#cb171e] text-[11px] font-bold font-mono px-0.5">YML</span>;
    }
    if (ext === 'json') {
      return <span className="text-[#cbcb41] text-[11px] font-bold font-mono px-0.5">{}</span>;
    }
    if (ext === 'md') {
      return <FileText className="w-3.5 h-3.5 text-[#42a5f5]" />;
    }
    if (ext === 'll') {
      return <span className="text-[#d7ba7d] text-[11px] font-bold font-mono px-0.5">LL</span>;
    }
    if (ext === 'qasm') {
      return <Atom className="w-3.5 h-3.5 text-[#4ec9b0]" />;
    }
    if (ext === 'cmake' || fileName.includes('CMakeLists')) {
      return <span className="text-[#008f88] text-[11px] font-bold font-mono px-0.5">CM</span>;
    }
    if (ext === 'py') {
      return <span className="text-[#3572A5] text-[11px] font-bold font-mono px-0.5">PY</span>;
    }
    if (ext === 'sh' || fileName === 'Makefile') {
      return <Terminal className="w-3.5 h-3.5 text-[#4caf50]" />;
    }
    return <File className="w-3.5 h-3.5 text-[#858585]" />;
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (fileId: string, depth = 0): React.ReactNode => {
    if (hideFiles) {
      return null;
    }

    const file = files[fileId];
    if (!file) return null;

    const isFolder = file.isFolder;
    const isCollapsed = !!collapsedFolders[file.id];
    const isSelected = activeFileId === file.id;

    if (isFolder) {
      if (file.id === 'root') {
        // Root children only
        return (
          <div key={file.id} className="flex flex-col">
            {file.children?.map(childId => renderTreeNode(childId, depth))}
          </div>
        );
      }

      return (
        <div key={file.id} className="flex flex-col select-none">
          <div
            onClick={() => toggleFolder(file.id)}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            className="group flex items-center justify-between py-1 pr-2 hover:bg-[#2a2d2e] cursor-pointer text-[#cccccc] text-xs transition-colors"
          >
            <div className="flex items-center space-x-1.5 overflow-hidden">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-[#858585] shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#858585] shrink-0" />
              )}
              {isCollapsed ? (
                <Folder className="w-4 h-4 text-[#dcb67a] shrink-0 fill-[#dcb67a]/20" />
              ) : (
                <FolderOpen className="w-4 h-4 text-[#dcb67a] shrink-0 fill-[#dcb67a]/30" />
              )}
              <span className="truncate font-medium">{file.name}</span>
            </div>

            {/* Folder action buttons */}
            <div className="hidden group-hover:flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCreate(false, file.id);
                }}
                title="New File in Folder"
                className="p-0.5 hover:text-white text-[#858585]"
              >
                <FilePlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartCreate(true, file.id);
                }}
                title="New Subfolder"
                className="p-0.5 hover:text-white text-[#858585]"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                title="Delete Folder"
                className="p-0.5 hover:text-[#f48771] text-[#858585]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Child nodes */}
          {!isCollapsed && (
            <div className="flex flex-col">
              {/* If creating in this folder */}
              {(isCreatingFile || isCreatingFolder) && newTargetParentId === file.id && (
                <div
                  style={{ paddingLeft: `${(depth + 1) * 14 + 6}px` }}
                  className="flex items-center py-1 pr-2 bg-[#2a2d2e]"
                >
                  {isCreatingFolder ? (
                    <Folder className="w-4 h-4 text-[#dcb67a] mr-1.5 shrink-0" />
                  ) : newItemName.endsWith('.qc') || newItemName.endsWith('.qua') ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5 mr-1.5 shrink-0"
                    >
                      <title>QuantumCode Trishula</title>
                      <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2.2" />
                      <polyline points="10,5 12,2 14,5" strokeWidth="2" fill="white" />
                      <path d="M5 8 C5 14, 12 15, 12 15 C12 15, 19 14, 19 8" strokeWidth="1.8" />
                      <polyline points="3.5,9.5 5,7.5 6.5,9.5" strokeWidth="1.8" fill="white" />
                      <polyline points="17.5,9.5 19,7.5 20.5,9.5" strokeWidth="1.8" fill="white" />
                      <line x1="9" y1="16" x2="15" y2="16" strokeWidth="2" />
                    </svg>
                  ) : (
                    <File className="w-3.5 h-3.5 text-[#858585] mr-1.5 shrink-0" />
                  )}
                  <input
                    type="text"
                    autoFocus
                    placeholder={isCreatingFolder ? "folder-name" : "algorithm.qc or file.cpp"}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCreate();
                      if (e.key === 'Escape') {
                        setIsCreatingFile(false);
                        setIsCreatingFolder(false);
                      }
                    }}
                    onBlur={submitCreate}
                    className="bg-[#3c3c3c] text-white text-xs px-1.5 py-0.5 outline-none border border-[#007acc] rounded-xs w-full"
                  />
                </div>
              )}

              {file.children?.map(childId => renderTreeNode(childId, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Single File Node
    return (
      <div
        key={file.id}
        onClick={() => onSelectFile(file.id)}
        style={{ paddingLeft: `${depth * 14 + 18}px` }}
        className={`group flex items-center justify-between py-1 pr-2 cursor-pointer text-xs transition-colors select-none ${
          isSelected
            ? 'bg-[#37373d] text-white font-medium'
            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-1.5 overflow-hidden">
          {renderFileIcon(file.name)}
          {editingFileId === file.id ? (
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setEditingFileId(null);
              }}
              onBlur={submitRename}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#3c3c3c] text-white text-xs px-1 outline-none border border-[#007acc] rounded-xs"
            />
          ) : (
            <span className="truncate">{file.name}</span>
          )}
          {file.isDirty && (
            <span className="w-2 h-2 rounded-full bg-[#007acc] shrink-0" title="Unsaved changes" />
          )}
        </div>

        {/* Action icons on hover */}
        <div className="hidden group-hover:flex items-center space-x-1 text-[#858585]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartRename(file);
            }}
            title="Rename"
            className="p-0.5 hover:text-white"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(file.id);
            }}
            title="Delete File"
            className="p-0.5 hover:text-[#f48771]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 bg-[#252526] h-full flex flex-col border-r border-[#1e1e1e] select-none text-[#cccccc] shrink-0">
      {/* View 1: File Explorer */}
      {activeView === 'explorer' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wider text-[#858585] uppercase border-b border-[#1e1e1e]">
            <span>Explorer</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  onToggleHideFiles?.();
                }}
                title={hideFiles ? "Files & Directories Hidden (Click to Reveal)" : "Hide All Files & Directories"}
                className={`p-1 rounded-xs transition-colors ${
                  hideFiles
                    ? 'text-[#f48771] hover:text-[#f48771] bg-[#37373d]'
                    : 'text-[#858585] hover:text-white hover:bg-[#37373d]'
                }`}
              >
                {hideFiles ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleStartCreate(false, 'root')}
                title="New File"
                className="p-1 hover:text-white hover:bg-[#37373d] rounded-xs transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStartCreate(true, 'root')}
                title="New Folder"
                className="p-1 hover:text-white hover:bg-[#37373d] rounded-xs transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={collapseAllFolders}
                title="Collapse All Folders"
                className="p-1 hover:text-white hover:bg-[#37373d] rounded-xs transition-colors"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Open Editors Section */}
            <div className="border-b border-[#1e1e1e]">
              <div
                onClick={() => setOpenEditorsCollapsed(!openEditorsCollapsed)}
                className="flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-[#858585] hover:text-[#cccccc] cursor-pointer"
              >
                {openEditorsCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span>OPEN EDITORS</span>
                <span className="text-[10px] text-[#6e6e6e] ml-1 font-normal">
                  ({hideFiles ? 0 : openTabs.length})
                </span>
              </div>

              {!openEditorsCollapsed && (
                <div className="py-1">
                  {hideFiles ? (
                    <div className="px-4 py-2 text-[11px] text-[#858585] italic select-none">
                      (Open editors hidden)
                    </div>
                  ) : (
                    openTabs.map(tab => (
                      <div
                        key={tab.id}
                        onClick={() => onSelectFile(tab.id)}
                        className={`group flex items-center justify-between px-4 py-1 text-xs cursor-pointer ${
                          activeFileId === tab.id
                            ? 'bg-[#37373d] text-white'
                            : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 overflow-hidden">
                          {renderFileIcon(tab.title)}
                          <span className="truncate">{tab.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {tab.isDirty && (
                            <span className="w-2 h-2 rounded-full bg-[#007acc]" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseTab(tab.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-white text-[#858585]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* QIR Platform Workspace Section */}
            <div>
              <div
                onClick={() => setQirPlatformCollapsed(!qirPlatformCollapsed)}
                className="flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-[#858585] hover:text-[#cccccc] cursor-pointer"
              >
                {qirPlatformCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span>QIR-PLATFORM</span>
                <span className="text-[10px] text-[#4ec9b0] ml-1.5 font-mono">
                  [v0.8.4]
                </span>
              </div>

              {!qirPlatformCollapsed && (
                <div className="py-1">
                  {hideFiles ? (
                    <div className="px-4 py-2.5 text-[11px] text-[#858585] italic select-none">
                      (All files and directories hidden)
                    </div>
                  ) : (
                    <>
                      {/* Root creation input */}
                      {(isCreatingFile || isCreatingFolder) && newTargetParentId === 'root' && (
                        <div className="flex items-center py-1 px-4 bg-[#2a2d2e]">
                          {isCreatingFolder ? (
                            <Folder className="w-4 h-4 text-[#dcb67a] mr-1.5 shrink-0" />
                          ) : newItemName.endsWith('.qc') || newItemName.endsWith('.qua') ? (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3.5 h-3.5 mr-1.5 shrink-0"
                            >
                              <title>QuantumCode Trishula</title>
                              <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2.2" />
                              <polyline points="10,5 12,2 14,5" strokeWidth="2" fill="white" />
                              <path d="M5 8 C5 14, 12 15, 12 15 C12 15, 19 14, 19 8" strokeWidth="1.8" />
                              <polyline points="3.5,9.5 5,7.5 6.5,9.5" strokeWidth="1.8" fill="white" />
                              <polyline points="17.5,9.5 19,7.5 20.5,9.5" strokeWidth="1.8" fill="white" />
                              <line x1="9" y1="16" x2="15" y2="16" strokeWidth="2" />
                            </svg>
                          ) : (
                            <File className="w-3.5 h-3.5 text-[#858585] mr-1.5 shrink-0" />
                          )}
                          <input
                            type="text"
                            autoFocus
                            placeholder={isCreatingFolder ? "new_folder" : "kernel.qc or new_file.cpp"}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitCreate();
                              if (e.key === 'Escape') {
                                setIsCreatingFile(false);
                                setIsCreatingFolder(false);
                              }
                            }}
                            onBlur={submitCreate}
                            className="bg-[#3c3c3c] text-white text-xs px-1.5 py-0.5 outline-none border border-[#007acc] rounded-xs w-full"
                          />
                        </div>
                      )}

                      {/* Render the full tree */}
                      {renderTreeNode('root')}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pass Debugger Quick Toggle Section */}
            <div className="border-t border-[#1e1e1e]">
              <div
                onClick={() => setPassDebuggerSectionCollapsed(!passDebuggerSectionCollapsed)}
                className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-[#858585] hover:text-[#cccccc] cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  {passDebuggerSectionCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span>PASS DEBUGGER</span>
                </div>
                <span className="text-[10px] text-[#007acc] font-mono">
                  {COMPILER_PASS_STEPS[currentPassIndex]?.shortName || 'Active'}
                </span>
              </div>

              {!passDebuggerSectionCollapsed && (
                <div className="p-2 space-y-1.5 bg-[#1e1e1e]/40 border-b border-[#1e1e1e]">
                  <div className="flex items-center justify-between text-[11px] text-[#858585]">
                    <span>Current Pass:</span>
                    <span className="text-white font-mono font-semibold">{currentPassIndex} / {COMPILER_PASS_STEPS.length - 1}</span>
                  </div>
                  <div className="text-xs text-white font-medium truncate">
                    {COMPILER_PASS_STEPS[currentPassIndex]?.passName}
                  </div>
                  <div className="flex items-center space-x-1 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPass?.(Math.max(0, currentPassIndex - 1));
                      }}
                      disabled={currentPassIndex === 0}
                      className="flex-1 py-1 bg-[#2d2d30] hover:bg-[#3e3e42] disabled:opacity-30 rounded-xs text-[10px] text-[#cccccc] font-medium"
                    >
                      Prev
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPass?.(Math.min(COMPILER_PASS_STEPS.length - 1, currentPassIndex + 1));
                      }}
                      disabled={currentPassIndex === COMPILER_PASS_STEPS.length - 1}
                      className="flex-1 py-1 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-30 rounded-xs text-[10px] text-white font-semibold"
                    >
                      Next
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDiffView?.();
                      }}
                      className={`px-2.5 py-1 rounded-xs text-[10px] font-semibold flex items-center space-x-1 ${
                        diffViewOpen ? 'bg-[#4ec9b0] text-black' : 'bg-[#2d2d30] text-[#4ec9b0] hover:bg-[#3e3e42]'
                      }`}
                    >
                      <Split className="w-3 h-3" />
                      <span>{diffViewOpen ? 'Diff' : 'Open Diff'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* View 2: Search in Files */}
      {activeView === 'search' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            Search Workspace
          </div>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search across files (e.g. QubitType, __quantum)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#3c3c3c] text-white text-xs px-2.5 py-1.5 pr-8 outline-none border border-transparent focus:border-[#007acc] rounded-xs"
              />
              <button
                onClick={() => setMatchCase(!matchCase)}
                title="Match Case (Alt+C)"
                className={`absolute right-1.5 top-1.5 px-1 py-0.5 text-[10px] font-mono rounded ${
                  matchCase ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-white'
                }`}
              >
                Aa
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-[11px] text-[#858585] mb-2 font-medium">
              {searchResults.length} results in workspace
            </div>
            {searchResults.map((res, i) => (
              <div
                key={i}
                onClick={() => onSelectFile(res.file.id)}
                className="py-1.5 px-2 hover:bg-[#2a2d2e] cursor-pointer rounded-xs text-xs mb-1"
              >
                <div className="flex items-center space-x-1.5 text-white font-medium">
                  {renderFileIcon(res.file.name)}
                  <span>{res.file.name}</span>
                  <span className="text-[#858585] text-[10px]">:{res.lineNum}</span>
                </div>
                <div className="text-[#858585] font-mono text-[11px] truncate mt-0.5 pl-4">
                  {res.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 3: Source Control / Git */}
      {activeView === 'source-control' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            <span>Source Control: Git</span>
            <span className="text-[#007acc] font-mono">branch: main</span>
          </div>

          <div className="space-y-2">
            <textarea
              placeholder="Commit message (e.g. Implement opaque %Qubit* handle builder)"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="w-full bg-[#3c3c3c] text-white text-xs p-2 outline-none border border-transparent focus:border-[#007acc] rounded-xs resize-none"
            />
            <button
              onClick={() => {
                if (commitMessage.trim() || dirtyFiles.length > 0) {
                  onCommitChanges(commitMessage || 'Updated quantum intermediate representation files');
                  setCommitMessage('');
                }
              }}
              className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-semibold py-1.5 rounded-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Commit ({dirtyFiles.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-[11px] font-bold text-[#858585] mb-2 uppercase">
              Changes ({dirtyFiles.length})
            </div>
            {dirtyFiles.length === 0 ? (
              <div className="text-xs text-[#858585] italic">No modified files. Working tree clean.</div>
            ) : (
              dirtyFiles.map(f => (
                <div
                  key={f.id}
                  onClick={() => onSelectFile(f.id)}
                  className="flex items-center justify-between py-1 px-2 hover:bg-[#2a2d2e] cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-1.5">
                    {renderFileIcon(f.name)}
                    <span>{f.name}</span>
                  </div>
                  <span className="text-[#e2c08d] font-bold text-[10px]">M</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View 4: Run & Debug */}
      {activeView === 'debug' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            Run & Debug Targets
          </div>

          <div className="space-y-2">
            <div className="p-2 bg-[#2d2d30] border border-[#3e3e42] rounded-xs space-y-2">
              <div className="text-xs font-semibold text-white flex items-center justify-between">
                <span>qir-validate (Base Profile)</span>
                <span className="text-[10px] text-[#4caf50]">Ready</span>
              </div>
              <p className="text-[11px] text-[#858585]">
                Validates current IR module against QIR Base Profile v1.0 specifications.
              </p>
            </div>

            <div className="p-2 bg-[#2d2d30] border border-[#3e3e42] rounded-xs space-y-2">
              <div className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Statevector Simulator</span>
                <span className="text-[10px] text-[#007acc]">30 Qubits max</span>
              </div>
              <p className="text-[11px] text-[#858585]">
                Executes compiled QIR bytecode against high-fidelity unitary simulator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View 5: Quantum Circuit & IR Visualizer */}
      {activeView === 'quantum-circuit' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585] flex items-center justify-between">
            <span>Circuit Preview</span>
            <span className="text-[#4ec9b0] text-[10px] font-mono">Bell Pair |Φ+⟩</span>
          </div>

          <p className="text-[11px] text-[#858585]">
            Interactive graphical representation of quantum gates lowered into QIR LLVM instructions:
          </p>

          {/* SVG Circuit Diagram */}
          <div className="bg-[#1e1e1e] p-3 rounded border border-[#333333] space-y-4">
            <svg viewBox="0 0 220 120" className="w-full">
              {/* Qubit wire 0 */}
              <text x="5" y="34" fill="#858585" fontSize="10" fontFamily="monospace">q[0]</text>
              <line x1="32" y1="30" x2="210" y2="30" stroke="#444444" strokeWidth="2" />

              {/* Qubit wire 1 */}
              <text x="5" y="84" fill="#858585" fontSize="10" fontFamily="monospace">q[1]</text>
              <line x1="32" y1="80" x2="210" y2="80" stroke="#444444" strokeWidth="2" />

              {/* H Gate on q[0] */}
              <rect x="55" y="16" width="28" height="28" fill="#2d2d30" stroke="#007acc" strokeWidth="1.5" rx="3" />
              <text x="64" y="34" fill="#569cd6" fontSize="12" fontWeight="bold" fontFamily="monospace">H</text>

              {/* CX Gate between q[0] and q[1] */}
              <line x1="110" y1="30" x2="110" y2="80" stroke="#4ec9b0" strokeWidth="2" />
              <circle cx="110" cy="30" r="4" fill="#4ec9b0" />
              <circle cx="110" cy="80" r="9" fill="#2d2d30" stroke="#4ec9b0" strokeWidth="1.5" />
              <line x1="104" y1="80" x2="116" y2="80" stroke="#4ec9b0" strokeWidth="1.5" />
              <line x1="110" y1="74" x2="110" y2="86" stroke="#4ec9b0" strokeWidth="1.5" />

              {/* Measurement M on q[0] and q[1] */}
              <rect x="155" y="16" width="26" height="28" fill="#2d2d30" stroke="#cca700" strokeWidth="1.5" rx="3" />
              <text x="162" y="34" fill="#cca700" fontSize="11" fontWeight="bold" fontFamily="monospace">M</text>

              <rect x="155" y="66" width="26" height="28" fill="#2d2d30" stroke="#cca700" strokeWidth="1.5" rx="3" />
              <text x="162" y="84" fill="#cca700" fontSize="11" fontWeight="bold" fontFamily="monospace">M</text>
            </svg>

            <div className="text-[10px] text-[#cccccc] font-mono bg-[#252526] p-2 rounded border border-[#333333]">
              <div className="text-[#6a9955]">// Emitted QIR Call:</div>
              <div>call void @__quantum__qis__h__body(%Qubit* %q0)</div>
              <div>call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q1)</div>
            </div>
          </div>
        </div>
      )}

      {/* View 6: Extensions */}
      {activeView === 'extensions' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            Installed Extensions
          </div>

          <div className="space-y-2">
            {[
              { name: "QIR Syntax & Profiles", version: "v1.0.4", publisher: "qir-alliance", desc: "Base and Adaptive Profile validator and syntax highlighting." },
              { name: "LLVM 17 Language Server", version: "v17.0.6", publisher: "llvm", desc: "Clangd C++20 LSP and LLVM bitcode analysis." },
              { name: "CMake Tools", version: "v1.14.0", publisher: "microsoft", desc: "Integrated Ninja / CMake build pipeline." },
              { name: "Gemini QIR Copilot", version: "v3.8.0", publisher: "google", desc: "Quantum compiler assistant & test generator." },
            ].map((ext, idx) => (
              <div key={idx} className="p-2 bg-[#2d2d30] rounded-xs border border-[#3e3e42] space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>{ext.name}</span>
                  <span className="text-[10px] text-[#858585]">{ext.version}</span>
                </div>
                <div className="text-[10px] text-[#007acc] font-mono">{ext.publisher}</div>
                <p className="text-[11px] text-[#858585]">{ext.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 7: Settings */}
      {activeView === 'settings' && (
        <div className="flex-1 flex flex-col p-3 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            Workspace Settings
          </div>
          <div className="text-xs space-y-3">
            <div>
              <label className="text-[11px] text-[#858585] block mb-1">C++ Standard</label>
              <select className="w-full bg-[#3c3c3c] text-white p-1.5 rounded-xs outline-none border border-transparent focus:border-[#007acc]">
                <option>C++20 (LLVM 17+)</option>
                <option>C++23</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#858585] block mb-1">QIR Profile Target</label>
              <select className="w-full bg-[#3c3c3c] text-white p-1.5 rounded-xs outline-none border border-transparent focus:border-[#007acc]">
                <option>Base Profile (Static QPU)</option>
                <option>Adaptive Profile (Fast Feedback)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#858585] block mb-1">Tab Indentation</label>
              <input
                type="number"
                defaultValue={4}
                className="w-full bg-[#3c3c3c] text-white p-1.5 rounded-xs outline-none border border-transparent focus:border-[#007acc]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
