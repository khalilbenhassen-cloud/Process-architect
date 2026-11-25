import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Workflow,
  MessageSquare,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  GitCompare,
  Layers,
  Users,
  Search,
  SlidersHorizontal,
  Pencil,
  X,
  MoreHorizontal,
  Sparkles,
  Filter,
  ChevronDown,
} from 'lucide-react';
import {
  ApprovalGate,
  Category,
  Collaborator,
  ProcessSummary,
  Project,
  TagItem,
} from '../../types/process';
import { ProcessCompareModal } from '../modals/ProcessCompareModal';

export interface ProjectsWorkspaceViewProps {
  projects: Project[];
  processes: ProcessSummary[];
  categories: Category[];
  tags: TagItem[];
  collaborators: Collaborator[];
  approvals: ApprovalGate[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (payload: {
    name: string;
    description: string;
    categoryId?: string | null;
    tags: string[];
    processIds: string[];
    memberIds: string[];
    initialApprovals?: string[];
  }) => Promise<void>;
  onUpdateProject: (projectId: string, payload: Partial<Project>) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onOpenProcessInStudio: (processId: string) => void;
  onRestoreProcessVersionInStudio?: (processId: string, versionId: string) => void;
  onOpenNewProcessModal: () => void;
  onOpenProjectConversation: (project: Project) => void;
  onOpenScheduleMeeting: (projectId?: string) => void;
  onResetWorkspaceBlank: () => Promise<void>;
  onResetWorkspaceDemo?: () => Promise<void>;
  onCreateApproval?: (projectId: string, processId: string, label: string) => Promise<void>;
  onToggleApproval?: (approval: ApprovalGate) => Promise<void>;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6'];

const STATUS_META: Record<Project['status'], { label: string; dot: string }> = {
  draft: { label: 'Brouillon', dot: '#8E8E93' },
  active: { label: 'Actif', dot: '#34C759' },
  review: { label: 'En revue', dot: '#FF9500' },
  completed: { label: 'Terminé', dot: '#007AFF' },
  archived: { label: 'Archivé', dot: '#8E8E93' },
};

export const ProjectsWorkspaceView: React.FC<ProjectsWorkspaceViewProps> = ({
  projects,
  processes,
  categories,
  tags,
  collaborators,
  approvals,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateCategory,
  onDeleteCategory,
  onCreateTag,
  onDeleteTag,
  onOpenProcessInStudio,
  onRestoreProcessVersionInStudio,
  onOpenNewProcessModal,
  onOpenProjectConversation,
  onOpenScheduleMeeting,
  onResetWorkspaceBlank,
  onResetWorkspaceDemo,
  onCreateApproval,
  onToggleApproval,
}) => {
  // Filters & view toggles (multi-select categories & tags)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilters, setSelectedCatFilters] = useState<string[]>([]);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [showManageDrawer, setShowManageDrawer] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Floating Read-Only Process Compare Modal state
  const [compareModalState, setCompareModalState] = useState<{
    projectName: string;
    processes: ProcessSummary[];
  } | null>(null);

  // Apple-style confirmation modal for destructive actions (delete project / detach process / reset)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Unified Create / Edit Project form state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCategory, setProjCategory] = useState('');
  const [projStatus, setProjStatus] = useState<Project['status']>('active');
  const [projTags, setProjTags] = useState<string[]>([]);
  const [projProcesses, setProjProcesses] = useState<string[]>([]);
  const [projMembers, setProjMembers] = useState<string[]>([]);
  const [projInitialApprovals, setProjInitialApprovals] = useState<string[]>([]);
  const [projApprovalDraft, setProjApprovalDraft] = useState('');
  const [processPickerTab, setProcessPickerTab] = useState<'free' | 'attached' | null>(null);
  const [processPickerSearch, setProcessPickerSearch] = useState('');

  // Category & Tag quick creator
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#007AFF');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#34C759');

  // Inline approval gate creator per project
  const [addingApprovalForProjectId, setAddingApprovalForProjectId] = useState<string | null>(null);
  const [newApprovalLabel, setNewApprovalLabel] = useState('');

  // Clear orphaned filters if a category or tag was deleted
  useEffect(() => {
    setSelectedCatFilters((prev) =>
      prev.filter((id) => categories.some((c) => c.id === id))
    );
  }, [categories]);

  useEffect(() => {
    setSelectedTagFilters((prev) =>
      prev.filter((name) => tags.some((t) => t.name === name))
    );
  }, [tags]);

  const openCreateProjectForm = () => {
    setEditingProjectId(null);
    setProjName('');
    setProjDesc('');
    setProjCategory(selectedCatFilters[0] || '');
    setProjStatus('active');
    setProjTags(selectedTagFilters.length > 0 ? [...selectedTagFilters] : []);
    setProjProcesses([]);
    setProjMembers([]);
    setProjInitialApprovals([]);
    setProjApprovalDraft('');
    setShowProjectForm(true);
  };

  const openEditProjectForm = (proj: Project) => {
    setEditingProjectId(proj.id);
    setProjName(proj.name);
    setProjDesc(proj.description || '');
    setProjCategory(proj.categoryId || '');
    setProjStatus(proj.status || 'active');
    setProjTags(proj.tags || []);
    setProjProcesses(proj.processIds || []);
    setProjMembers(proj.memberIds || []);
    setShowProjectForm(true);
  };

  const handleProjectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    if (editingProjectId) {
      await onUpdateProject(editingProjectId, {
        name: projName.trim(),
        description: projDesc.trim(),
        categoryId: projCategory || null,
        status: projStatus,
        tags: projTags,
        processIds: projProcesses,
        memberIds: projMembers,
      });
    } else {
      const finalApprovals = projApprovalDraft.trim()
        ? [...projInitialApprovals, projApprovalDraft.trim()]
        : projInitialApprovals;
      await onCreateProject({
        name: projName.trim(),
        description: projDesc.trim(),
        categoryId: projCategory || null,
        tags: projTags,
        processIds: projProcesses,
        memberIds: projMembers,
        initialApprovals: finalApprovals,
      });
    }
    setShowProjectForm(false);
    setEditingProjectId(null);
  };

  // Map each processId -> parent project name(s) for clear visual distinction between free vs already-attached processes
  const parentProjectByProcessId = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((proj) => {
      (proj.processIds || []).forEach((pid) => {
        const list = map.get(pid) || [];
        list.push(proj);
        map.set(pid, list);
      });
    });
    processes.forEach((proc) => {
      if (proc.projectId) {
        const ownerProj = projects.find((p) => p.id === proc.projectId);
        if (ownerProj) {
          const list = map.get(proc.id) || [];
          if (!list.some((p) => p.id === ownerProj.id)) {
            list.push(ownerProj);
            map.set(proc.id, list);
          }
        }
      }
    });
    return map;
  }, [projects, processes]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (
        selectedCatFilters.length > 0 &&
        !selectedCatFilters.includes(p.categoryId || '')
      ) {
        return false;
      }
      if (
        selectedTagFilters.length > 0 &&
        !selectedTagFilters.every((t) => (p.tags || []).includes(t))
      ) {
        return false;
      }
      if (!q) return true;
      const inName = p.name.toLowerCase().includes(q);
      const inDesc = (p.description || '').toLowerCase().includes(q);
      const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const inProcs = processes
        .filter((pr) => p.processIds.includes(pr.id) || pr.projectId === p.id)
        .some((pr) => pr.name.toLowerCase().includes(q));
      return inName || inDesc || inTags || inProcs;
    });
  }, [projects, processes, selectedCatFilters, selectedTagFilters, searchQuery]);

  const activeFilterCount = selectedCatFilters.length + selectedTagFilters.length;
  const hasActiveFilter = Boolean(searchQuery.trim() || activeFilterCount > 0);

  return (
    <div
      className="flex-1 h-full bg-[#F5F5F7] overflow-y-auto p-6 pb-28 text-[#1D1D1F] apple-workspace-enter"
      onClick={() => {
        setShowMoreMenu(false);
        setShowFilterMenu(false);
      }}
    >
      <div className="max-w-6xl mx-auto space-y-5">
        {/* TOP WORKSPACE HEADER (Single clean Apple HIG row) */}
        <div className="relative z-40 bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl px-5 py-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-black/[0.07] text-[#1D1D1F] flex items-center justify-center shrink-0">
              <FolderKanban className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F] truncate">
              Projets &amp; Processus
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenNewProcessModal}
              className="px-3 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Workflow className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Nouveau processus</span>
            </button>

            <button
              type="button"
              onClick={openCreateProjectForm}
              className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau projet</span>
            </button>

            {/* Discreet Workspace Reset / Demo Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Options de l'espace"
                onClick={() => setShowMoreMenu((v) => !v)}
                className="p-2 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                title="Options de l'espace"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-xl shadow-xl py-1.5 z-40">
                  {onResetWorkspaceDemo && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setPendingConfirm({
                          title: 'Restaurer la démonstration ?',
                          message:
                            'Le projet pilote de démonstration (Demande de Rachat Partiel TO-BE + AS-IS) sera restauré.',
                          confirmLabel: 'Restaurer',
                          onConfirm: () => onResetWorkspaceDemo(),
                        });
                      }}
                      className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>Restaurer la démo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setPendingConfirm({
                        title: 'Réinitialiser en Espace vierge ?',
                        message:
                          'Toutes les catégories, projets, tags et exemples de démonstration seront vidés pour repartir de zéro.',
                        confirmLabel: 'Réinitialiser',
                        onConfirm: () => onResetWorkspaceBlank(),
                      });
                    }}
                    className="w-full px-3.5 py-2 text-left text-[12px] font-medium text-[#C41E1A] hover:bg-[#FF3B30]/[0.06] flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réinitialiser (Espace vierge)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SINGLE-ROW SEARCH & DROPDOWN FILTER BAR */}
        <div className="relative z-30 bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un projet, un processus ou un tag..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] focus:border-[#007AFF] focus:bg-white text-[12px] text-[#1D1D1F] placeholder:text-[#8E8E93] outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1D1D1F] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Compact Multi-Select Filter Dropdown Button */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowFilterMenu((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition cursor-pointer ${
                    activeFilterCount > 0 || showFilterMenu
                      ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                      : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtres</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showFilterMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showFilterMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-2xl shadow-xl p-3 space-y-3 z-50">
                    {/* Categories Section (Multi-select) */}
                    <div>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                          Catégories ({categories.length})
                        </span>
                        {selectedCatFilters.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCatFilters([])}
                            className="text-[10.5px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                          >
                            Toutes
                          </button>
                        )}
                      </div>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto">
                        {categories.map((cat) => {
                          const active = selectedCatFilters.includes(cat.id);
                          const countInCat = projects.filter(
                            (p) => p.categoryId === cat.id
                          ).length;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() =>
                                setSelectedCatFilters((prev) =>
                                  prev.includes(cat.id)
                                    ? prev.filter((id) => id !== cat.id)
                                    : [...prev, cat.id]
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] font-medium flex items-center justify-between gap-2 cursor-pointer transition ${
                                active
                                  ? 'bg-[#007AFF]/10 text-[#007AFF] font-semibold'
                                  : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="truncate">{cat.name}</span>
                                <span className="text-[10.5px] text-[#8E8E93] shrink-0">
                                  ({countInCat})
                                </span>
                              </span>
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  active
                                    ? 'bg-[#007AFF] text-white'
                                    : 'border border-black/15 bg-white text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tags Section (Multi-select) */}
                    {tags.length > 0 && (
                      <div className="pt-2 border-t border-black/[0.06]">
                        <div className="flex items-center justify-between px-1 mb-1.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                            Tags ({tags.length})
                          </span>
                          {selectedTagFilters.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedTagFilters([])}
                              className="text-[10.5px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                            >
                              Tous
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tg) => {
                            const active = selectedTagFilters.includes(tg.name);
                            return (
                              <button
                                key={tg.id}
                                type="button"
                                onClick={() =>
                                  setSelectedTagFilters((prev) =>
                                    prev.includes(tg.name)
                                      ? prev.filter((n) => n !== tg.name)
                                      : [...prev, tg.name]
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition cursor-pointer ${
                                  active
                                    ? 'border-[#007AFF] bg-[#007AFF] text-white font-semibold'
                                    : 'border-black/[0.07] bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]'
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-[2px] shrink-0"
                                  style={{
                                    backgroundColor: active ? '#FFFFFF' : tg.color,
                                  }}
                                />
                                <span>#{tg.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeFilterCount > 0 && (
                      <div className="pt-2 border-t border-black/[0.06] flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCatFilters([]);
                            setSelectedTagFilters([]);
                          }}
                          className="text-[11.5px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                        >
                          Tout effacer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowManageDrawer((v) => !v)}
                className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  showManageDrawer
                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  Catégories ({categories.length}) &amp; Tags ({tags.length})
                </span>
              </button>
            </div>
          </div>

          {/* Active multi-select filter chips (only shown when filters are active!) */}
          {activeFilterCount > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-black/[0.05]">
              {selectedCatFilters.map((catId) => {
                const activeCat = categories.find((c) => c.id === catId);
                if (!activeCat) return null;
                return (
                  <span
                    key={catId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[11.5px] font-semibold text-[#007AFF]"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeCat.color }}
                    />
                    <span>{activeCat.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCatFilters((prev) =>
                          prev.filter((id) => id !== catId)
                        )
                      }
                      className="hover:text-[#FF3B30] cursor-pointer"
                      aria-label={`Retirer catégorie ${activeCat.name}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {selectedTagFilters.map((tName) => (
                <span
                  key={tName}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[11.5px] font-semibold text-[#007AFF]"
                >
                  <span>#{tName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTagFilters((prev) =>
                        prev.filter((n) => n !== tName)
                      )
                    }
                    className="hover:text-[#FF3B30] cursor-pointer"
                    aria-label={`Retirer tag ${tName}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCatFilters([]);
                  setSelectedTagFilters([]);
                }}
                className="text-[11px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F] ml-1 cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE CATEGORIES & TAGS MANAGEMENT DRAWER */}
        {showManageDrawer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Categories Manager */}
            <div className="bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#007AFF]" />
                  <span>Gérer les Catégories ({categories.length})</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-black/[0.07] bg-[#F5F5F7] text-[12px] font-medium text-[#1D1D1F]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCatFilters((prev) => prev.filter((id) => id !== cat.id));
                        onDeleteCategory(cat.id);
                      }}
                      className="ml-1 text-[#8E8E93] hover:text-[#FF3B30] cursor-pointer"
                      title="Supprimer cette catégorie"
                      aria-label={`Supprimer catégorie ${cat.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCatName.trim()) return;
                  await onCreateCategory(newCatName.trim(), newCatColor);
                  setNewCatName('');
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nouvelle catégorie..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-black/[0.10] focus:border-[#007AFF] text-[12px] outline-none"
                />
                <div className="flex items-center gap-1">
                  {COLORS.slice(0, 4).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCatColor(col)}
                      className={`w-4 h-4 rounded-full cursor-pointer ${
                        newCatColor === col ? 'ring-2 ring-offset-1 ring-[#1D1D1F]' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-[12px] font-semibold hover:bg-[#0062CC] cursor-pointer"
                >
                  Ajouter
                </button>
              </form>
            </div>

            {/* Tags Manager */}
            <div className="bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#007AFF]" />
                  <span>Gérer les Tags ({tags.length})</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tags.map((tg) => (
                  <span
                    key={tg.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F5F7] border border-black/[0.07] text-[12px] font-medium text-[#1D1D1F]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-[3px]"
                      style={{ backgroundColor: tg.color }}
                    />
                    <span>{tg.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTagFilters((prev) => prev.filter((n) => n !== tg.name));
                        onDeleteTag(tg.id);
                      }}
                      className="ml-1 text-[#8E8E93] hover:text-[#FF3B30] cursor-pointer"
                      title="Supprimer ce tag"
                      aria-label={`Supprimer tag ${tg.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTagName.trim()) return;
                  await onCreateTag(newTagName.trim(), newTagColor);
                  setNewTagName('');
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nouveau tag..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-black/[0.10] focus:border-[#007AFF] text-[12px] outline-none"
                />
                <div className="flex items-center gap-1">
                  {COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewTagColor(col)}
                      className={`w-4 h-4 rounded-[3px] cursor-pointer ${
                        newTagColor === col ? 'ring-2 ring-offset-1 ring-[#1D1D1F]' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-[12px] font-semibold hover:bg-[#0062CC] cursor-pointer"
                >
                  Ajouter
                </button>
              </form>
            </div>
          </div>
        )}

        {/* UNIFIED CREATE / EDIT PROJECT FORM */}
        {showProjectForm && (
          <form
            onSubmit={handleProjectFormSubmit}
            className="bg-white/95 backdrop-blur-md border border-[#007AFF]/50 rounded-2xl p-5 shadow-[0_8px_28px_rgba(0,122,255,0.10)] space-y-4 text-[13px]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                {editingProjectId ? 'Modifier le projet' : 'Créer un nouveau projet'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(false);
                  setEditingProjectId(null);
                }}
                className="text-[#8E8E93] hover:text-[#1D1D1F] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-1">
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1">
                  Nom du projet
                </label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Ex: Transformation Épargne..."
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.10] focus:border-[#007AFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1">
                  Catégorie
                </label>
                <select
                  value={projCategory}
                  onChange={(e) => setProjCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.10] bg-white outline-none"
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1">
                  Statut
                </label>
                <select
                  value={projStatus}
                  onChange={(e) =>
                    setProjStatus(e.target.value as Project['status'])
                  }
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.10] bg-white outline-none"
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="review">En revue</option>
                  <option value="completed">Terminé</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Objectifs et périmètre du projet..."
                className="w-full px-3 py-2 rounded-xl border border-black/[0.10] focus:border-[#007AFF] outline-none"
              />
            </div>

            {/* Tags selector (FIXED: was missing!) */}
            {tags.length > 0 && (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1.5">
                  Étiquettes / Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tg) => {
                    const selected = projTags.includes(tg.name);
                    return (
                      <button
                        key={tg.id}
                        type="button"
                        onClick={() =>
                          setProjTags((prev) =>
                            prev.includes(tg.name)
                              ? prev.filter((x) => x !== tg.name)
                              : [...prev, tg.name]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium transition cursor-pointer ${
                          selected
                            ? 'bg-[#007AFF] text-white border-[#007AFF]'
                            : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.07]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-[2px]"
                          style={{ backgroundColor: selected ? '#FFFFFF' : tg.color }}
                        />
                        <span>#{tg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compact Processus Picker (2 clickable buttons -> floating picker modal to save space) */}
            {processes.length > 0 && (() => {
              const unattachedProcs = processes.filter((pr) => {
                const owners = (parentProjectByProcessId.get(pr.id) || []).filter(
                  (p) => p.id !== editingProjectId
                );
                return owners.length === 0;
              });
              const attachedElsewhereProcs = processes.filter((pr) => {
                const owners = (parentProjectByProcessId.get(pr.id) || []).filter(
                  (p) => p.id !== editingProjectId
                );
                return owners.length > 0;
              });
              const selectedFreeCount = unattachedProcs.filter((p) =>
                projProcesses.includes(p.id)
              ).length;
              const selectedAttachedCount = attachedElsewhereProcs.filter((p) =>
                projProcesses.includes(p.id)
              ).length;

              return (
                <div className="space-y-2">
                  <label className="block text-[11.5px] font-semibold text-[#6E6E73]">
                    Processus à rattacher ({projProcesses.length} sélectionné{projProcesses.length > 1 ? 's' : ''})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProcessPickerSearch('');
                        setProcessPickerTab('free');
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[12px] font-semibold text-[#1D1D1F] transition cursor-pointer"
                    >
                      <Workflow className="w-3.5 h-3.5 text-[#007AFF]" />
                      <span>Processus libres ({unattachedProcs.length})</span>
                      {selectedFreeCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                          {selectedFreeCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProcessPickerSearch('');
                        setProcessPickerTab('attached');
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[12px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#8E8E93]" />
                      <span>Processus déjà rattachés ({attachedElsewhereProcs.length})</span>
                      {selectedAttachedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                          {selectedAttachedCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {projProcesses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {projProcesses.map((pid) => {
                        const pr = processes.find((p) => p.id === pid);
                        if (!pr) return null;
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[11.5px] font-semibold text-[#007AFF]"
                          >
                            <span>{pr.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setProjProcesses((prev) => prev.filter((x) => x !== pid))
                              }
                              className="hover:text-[#FF3B30] cursor-pointer"
                              aria-label={`Retirer ${pr.name}`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Members selector */}
            {collaborators.length > 0 && (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1.5">
                  Intervenants &amp; Agents IA ({projMembers.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {collaborators.map((c) => {
                    const selected = projMembers.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setProjMembers((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition cursor-pointer ${
                          selected
                            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                            : 'bg-[#F5F5F7] text-[#6E6E73] border-black/[0.07]'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: c.avatarColor }}
                        >
                          {c.avatarInitials}
                        </span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Initial Approval Gates (when creating a new project) */}
            {!editingProjectId && (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6E6E73] mb-1.5">
                  Jalons d&apos;approbation initiaux (optionnel)
                </label>
                {projInitialApprovals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {projInitialApprovals.map((lbl, idx) => (
                      <span
                        key={`${lbl}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#FF9500]/45 text-[11.5px] font-medium text-[#1D1D1F]"
                      >
                        <Clock className="w-3 h-3 text-[#FF9500]" />
                        <span>{lbl}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setProjInitialApprovals((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-[#8E8E93] hover:text-[#FF3B30] cursor-pointer"
                          aria-label={`Retirer jalon ${lbl}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={projApprovalDraft}
                    onChange={(e) => setProjApprovalDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && projApprovalDraft.trim()) {
                        e.preventDefault();
                        setProjInitialApprovals((prev) => [
                          ...prev,
                          projApprovalDraft.trim(),
                        ]);
                        setProjApprovalDraft('');
                      }
                    }}
                    placeholder="Ex: Validation Métier, Visa Conformité, Recette QA..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-black/[0.10] focus:border-[#007AFF] text-[12px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!projApprovalDraft.trim()) return;
                      setProjInitialApprovals((prev) => [
                        ...prev,
                        projApprovalDraft.trim(),
                      ]);
                      setProjApprovalDraft('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-black/[0.09] bg-[#F5F5F7] hover:bg-black/[0.06] text-[12px] font-semibold text-[#1D1D1F] cursor-pointer"
                  >
                    + Ajouter jalon
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(false);
                  setEditingProjectId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-[#6E6E73] hover:bg-[#F5F5F7] font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#007AFF] text-white font-semibold hover:bg-[#0062CC] cursor-pointer"
              >
                {editingProjectId ? 'Enregistrer' : 'Créer le projet'}
              </button>
            </div>
          </form>
        )}

        {/* PROJECTS CARDS LIST */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl p-10 text-center space-y-3 shadow-2xs">
            <FolderKanban className="w-10 h-10 text-[#8E8E93] mx-auto" />
            <div className="text-[15px] font-semibold text-[#1D1D1F]">
              {hasActiveFilter
                ? 'Aucun projet ne correspond à ces filtres'
                : 'Votre espace projet est vierge'}
            </div>
            <p className="text-[12.5px] text-[#6E6E73] max-w-md mx-auto">
              {hasActiveFilter
                ? 'Modifiez votre recherche ou réinitialisez les filtres actifs.'
                : 'Créez votre premier projet ou restaurez le projet pilote de démonstration.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCatFilters([]);
                    setSelectedTagFilters([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-[12.5px] font-semibold hover:bg-[#0062CC] cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openCreateProjectForm}
                    className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-[12.5px] font-semibold hover:bg-[#0062CC] cursor-pointer"
                  >
                    Créer mon premier projet
                  </button>
                  {onResetWorkspaceDemo && (
                    <button
                      type="button"
                      onClick={onResetWorkspaceDemo}
                      className="px-4 py-2 rounded-xl bg-white border border-black/[0.09] text-[#1D1D1F] text-[12.5px] font-semibold hover:bg-[#F5F5F7] cursor-pointer"
                    >
                      Restaurer la démo
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProjects.map((proj) => {
              const cat = categories.find((c) => c.id === proj.categoryId);
              const linkedProcs = processes.filter(
                (p) => proj.processIds.includes(p.id) || p.projectId === proj.id
              );
              const projApprovals = approvals.filter(
                (a) => a.projectId === proj.id || proj.processIds.includes(a.processId)
              );
              const projectMembers = collaborators.filter((c) =>
                (proj.memberIds || []).includes(c.id)
              );
              const statusMeta = STATUS_META[proj.status] || {
                label: proj.status,
                dot: '#8E8E93',
              };
              const isExpanded = expandedProjectIds.has(proj.id);

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj.id);
                    toggleProjectExpanded(proj.id);
                  }}
                  className={`bg-white/95 backdrop-blur-md border rounded-2xl transition cursor-pointer ${
                    isExpanded
                      ? 'p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)]'
                      : 'px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white'
                  } ${
                    isExpanded && selectedProjectId === proj.id
                      ? 'border-[#007AFF] ring-2 ring-[#007AFF]/15'
                      : 'border-black/[0.07] hover:border-black/[0.16]'
                  }`}
                >
                  {!isExpanded ? (
                    /* MINIMIZED ROW: Project Name + Status + Chevron */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <h2 className="text-[14.5px] font-semibold tracking-tight text-[#1D1D1F] truncate">
                          {proj.name}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-[11px] font-semibold text-[#1D1D1F] shrink-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusMeta.dot }}
                          />
                          {statusMeta.label}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-[#8E8E93] shrink-0" />
                    </div>
                  ) : (
                    <>
                  {/* EXPANDED FULL PROJECT CARD */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        {cat && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.07] text-[11px] font-semibold text-[#1D1D1F]">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        )}
                        <h2 className="text-[16px] font-semibold tracking-tight text-[#1D1D1F]">
                          {proj.name}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-[11px] font-semibold text-[#1D1D1F]">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusMeta.dot }}
                          />
                          {statusMeta.label}
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-[12.5px] text-[#6E6E73] leading-relaxed">
                          {proj.description}
                        </p>
                      )}

                      {/* Project Tags */}
                      {proj.tags && proj.tags.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                          {proj.tags.map((tName) => {
                            const tagObj = tags.find((t) => t.name === tName);
                            return (
                              <span
                                key={tName}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTagFilters((prev) =>
                                    prev.includes(tName)
                                      ? prev.filter((n) => n !== tName)
                                      : [...prev, tName]
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-[2px]"
                                  style={{ backgroundColor: tagObj?.color || '#8E8E93' }}
                                />
                                #{tName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProjectConversation(proj);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#007AFF]/[0.08] hover:bg-[#007AFF] text-[#007AFF] hover:text-white text-[12px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Conversations</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenScheduleMeeting(proj.id);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[12px] font-semibold text-[#1D1D1F] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>Réunion</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditProjectForm(proj);
                        }}
                        className="p-1.5 rounded-xl border border-black/[0.08] bg-white text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                        title="Modifier ce projet"
                        aria-label={`Modifier ${proj.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingConfirm({
                            title: 'Supprimer ce projet ?',
                            message: `Voulez-vous vraiment supprimer définitivement le projet « ${proj.name} » ? Cette action est irréversible.`,
                            confirmLabel: 'Supprimer le projet',
                            onConfirm: () => onDeleteProject(proj.id),
                          });
                        }}
                        className="p-1.5 rounded-xl border border-black/[0.08] bg-white text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.06] transition cursor-pointer"
                        title="Supprimer ce projet"
                        aria-label={`Supprimer ${proj.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectExpanded(proj.id);
                        }}
                        className="p-1.5 rounded-xl border border-black/[0.08] bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                        title="Réduire la carte"
                        aria-label={`Réduire ${proj.name}`}
                      >
                        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Linked Processes + Approvals & Members */}
                  <div className="mt-4 pt-4 border-t border-black/[0.06] grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left: Linked Processes */}
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                        <span className="text-[12px] font-semibold text-[#1D1D1F] flex items-center gap-1.5 shrink-0">
                          <Workflow className="w-3.5 h-3.5 text-[#007AFF]" />
                          <span>Processus rattachés ({linkedProcs.length})</span>
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0 max-w-full flex-wrap">
                          {linkedProcs.length >= 2 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompareModalState({
                                  projectName: proj.name,
                                  processes: linkedProcs,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.09] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[11px] font-semibold transition cursor-pointer"
                            >
                              <GitCompare className="w-3 h-3 text-[#007AFF]" />
                              <span>Comparer</span>
                            </button>
                          )}
                          <select
                            value=""
                            aria-label={`Rattacher un processus à ${proj.name}`}
                            onChange={(e) => {
                              const pid = e.target.value;
                              if (pid && !proj.processIds.includes(pid)) {
                                onUpdateProject(proj.id, {
                                  processIds: [...proj.processIds, pid],
                                });
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] px-2 py-1 rounded-lg border border-black/[0.09] bg-[#F5F5F7] text-[#007AFF] font-semibold outline-none cursor-pointer max-w-[185px] truncate"
                          >
                            <option value="">+ Rattacher un processus...</option>
                            {processes
                              .filter((p) => !proj.processIds.includes(p.id))
                              .map((p) => {
                                const otherOwners = (parentProjectByProcessId.get(p.id) || [])
                                  .filter((op) => op.id !== proj.id)
                                  .map((op) => op.name);
                                return (
                                  <option key={p.id} value={p.id}>
                                    {otherOwners.length > 0
                                      ? `${p.name} (Dans : ${otherOwners.join(', ')})`
                                      : p.name}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {linkedProcs.length === 0 ? (
                          <p className="text-[12px] text-[#8E8E93] italic py-2">
                            Aucun processus rattaché à ce projet.
                          </p>
                        ) : (
                          linkedProcs.map((proc) => (
                            <div
                              key={proc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenProcessInStudio(proc.id);
                              }}
                              className="p-2.5 rounded-xl bg-[#F5F5F7]/75 hover:bg-[#007AFF]/[0.05] border border-black/[0.06] hover:border-[#007AFF]/35 flex items-center justify-between gap-2 transition"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[12.5px] font-semibold text-[#1D1D1F] truncate">
                                    {proc.name}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                      proc.lifecycleState === 'approved'
                                        ? 'bg-[#34C759]/10 text-[#1E7E34] border-[#34C759]/25'
                                        : 'bg-black/[0.04] text-[#6E6E73] border-black/[0.06]'
                                    }`}
                                  >
                                    v{(proc.version || '1.0.0').replace(/^v/i, '').split('.')[0]} ·{' '}
                                    {proc.lifecycleState === 'approved' ? 'Publié' : 'Brouillon'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#6E6E73]">
                                  {proc.nodeCount} étapes · {proc.ruleCount} règle{proc.ruleCount > 1 ? 's' : ''}
                                </div>
                                {proc.publishedVersions && proc.publishedVersions.length > 0 && (
                                  <div
                                    className="flex items-center gap-1 flex-wrap pt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-[10px] font-medium text-[#8E8E93]">
                                      Versions :
                                    </span>
                                    {proc.publishedVersions.map((ver) => {
                                      const shortV = `v${(ver.version || '1.0.0').replace(/^v/i, '').split('.')[0]}`;
                                      const isActiveVer = ver.version === proc.version;
                                      return (
                                        <button
                                          key={ver.id}
                                          type="button"
                                          title={
                                            ver.note
                                              ? `${shortV} — ${ver.note} (cliquer pour ouvrir/restaurer)`
                                              : `${shortV} — cliquer pour ouvrir/restaurer dans le Studio`
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isActiveVer || !onRestoreProcessVersionInStudio) {
                                              onOpenProcessInStudio(proc.id);
                                              return;
                                            }
                                            setPendingConfirm({
                                              title: `Restaurer la version ${shortV} ?`,
                                              message: `Voulez-vous restaurer « ${proc.name} » à l'état archivé ${shortV}${ver.note ? ` (« ${ver.note} »)` : ''} et l'ouvrir dans le Studio ?`,
                                              confirmLabel: `Ouvrir ${shortV}`,
                                              onConfirm: () =>
                                                onRestoreProcessVersionInStudio(proc.id, ver.id),
                                            });
                                          }}
                                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                                            isActiveVer
                                              ? 'bg-[#007AFF] text-white border-[#007AFF]'
                                              : 'bg-white text-[#1D1D1F] border-black/[0.1] hover:border-[#007AFF]/50 hover:text-[#007AFF]'
                                          }`}
                                        >
                                          {shortV}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2.5 py-1 rounded-lg bg-[#007AFF] text-white text-[11px] font-semibold">
                                  Ouvrir Studio →
                                </span>
                                {proj.processIds.includes(proc.id) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingConfirm({
                                        title: 'Retirer ce processus du projet ?',
                                        message: `Voulez-vous vraiment détacher « ${proc.name} » du projet « ${proj.name} » ? Le processus restera disponible dans la plateforme.`,
                                        confirmLabel: 'Retirer du projet',
                                        onConfirm: () =>
                                          onUpdateProject(proj.id, {
                                            processIds: proj.processIds.filter(
                                              (id) => id !== proc.id
                                            ),
                                          }),
                                      });
                                    }}
                                    className="p-1 rounded-lg text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] transition cursor-pointer"
                                    title="Retirer ce processus du projet"
                                    aria-label={`Détacher ${proc.name}`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: Interactive Approval Gates & Real Project Members */}
                    <div className="space-y-4 min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[12px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                            <span>Jalons d&apos;approbation ({projApprovals.length})</span>
                          </span>
                          {onCreateApproval && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingApprovalForProjectId((prev) =>
                                  prev === proj.id ? null : proj.id
                                );
                                setNewApprovalLabel('');
                              }}
                              className="text-[11px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                            >
                              + Jalon
                            </button>
                          )}
                        </div>

                        {addingApprovalForProjectId === proj.id && onCreateApproval && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 mb-2"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={newApprovalLabel}
                              onChange={(e) => setNewApprovalLabel(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newApprovalLabel.trim()) {
                                  e.preventDefault();
                                  const procId =
                                    linkedProcs[0]?.id || processes[0]?.id || 'demo-rachat-partiel';
                                  await onCreateApproval(proj.id, procId, newApprovalLabel.trim());
                                  setNewApprovalLabel('');
                                  setAddingApprovalForProjectId(null);
                                }
                              }}
                              placeholder="Nom du jalon (ex: Visa RSSI)..."
                              className="flex-1 px-2.5 py-1 rounded-lg border border-black/[0.10] focus:border-[#007AFF] text-[11.5px] outline-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newApprovalLabel.trim()) return;
                                const procId =
                                  linkedProcs[0]?.id || processes[0]?.id || 'demo-rachat-partiel';
                                await onCreateApproval(proj.id, procId, newApprovalLabel.trim());
                                setNewApprovalLabel('');
                                setAddingApprovalForProjectId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#007AFF] text-white text-[11px] font-semibold hover:bg-[#0062CC] cursor-pointer"
                            >
                              Ajouter
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {projApprovals.length === 0 ? (
                            <span className="text-[11.5px] text-[#8E8E93] italic">
                              Aucun jalon défini.
                            </span>
                          ) : (
                            projApprovals.map((ap) => {
                              const isApproved = ap.status === 'approved';
                              return (
                                <button
                                  key={ap.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleApproval?.(ap);
                                  }}
                                  title={
                                    onToggleApproval
                                      ? isApproved
                                        ? 'Cliquer pour remettre en attente'
                                        : 'Cliquer pour approuver ce jalon'
                                      : undefined
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition ${
                                    onToggleApproval ? 'cursor-pointer hover:shadow-2xs' : ''
                                  } ${
                                    isApproved
                                      ? 'bg-white border-[#34C759]/50 text-[#1D1D1F]'
                                      : 'bg-white border-[#FF9500]/50 text-[#1D1D1F]'
                                  }`}
                                >
                                  {isApproved ? (
                                    <CheckCircle2 className="w-3 h-3 text-[#34C759] shrink-0" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-[#FF9500] shrink-0" />
                                  )}
                                  <span>{ap.label}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[12px] font-semibold text-[#1D1D1F] flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5 text-[#007AFF]" />
                          <span>
                            Intervenants &amp; Agents IA ({projectMembers.length})
                          </span>
                        </span>
                        <div className="flex items-center flex-wrap gap-1.5">
                          {projectMembers.length === 0 ? (
                            <span className="text-[11.5px] text-[#8E8E93] italic">
                              Aucun intervenant affecté.
                            </span>
                          ) : (
                            projectMembers.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-medium text-[#1D1D1F]"
                              >
                                <span
                                  className="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-semibold"
                                  style={{ backgroundColor: c.avatarColor }}
                                >
                                  {c.avatarInitials}
                                </span>
                                <span>{c.name}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Process Picker Modal (Free vs Already Attached) */}
      {processPickerTab && (() => {
        const list = processes.filter((pr) => {
          const owners = (parentProjectByProcessId.get(pr.id) || []).filter(
            (p) => p.id !== editingProjectId
          );
          const matchesTab =
            processPickerTab === 'free' ? owners.length === 0 : owners.length > 0;
          if (!matchesTab) return false;
          if (!processPickerSearch.trim()) return true;
          const q = processPickerSearch.trim().toLowerCase();
          return (
            pr.name.toLowerCase().includes(q) ||
            owners.some((o) => o.name.toLowerCase().includes(q))
          );
        });

        return (
          <div
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setProcessPickerTab(null)}
            role="dialog"
            aria-modal="true"
            aria-label={
              processPickerTab === 'free'
                ? 'Sélectionner des processus libres'
                : 'Sélectionner des processus déjà rattachés'
            }
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[75vh] bg-white/95 backdrop-blur-xl border border-black/[0.10] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-black/[0.07] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {processPickerTab === 'free' ? (
                    <Workflow className="w-4 h-4 text-[#007AFF] shrink-0" />
                  ) : (
                    <Layers className="w-4 h-4 text-[#6E6E73] shrink-0" />
                  )}
                  <h3 className="text-[14px] font-semibold text-[#1D1D1F] truncate">
                    {processPickerTab === 'free'
                      ? 'Processus libres (non rattachés)'
                      : 'Processus déjà rattachés à un autre projet'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProcessPickerTab(null)}
                  className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-black/[0.08] text-[#6E6E73] flex items-center justify-center cursor-pointer"
                  aria-label="Fermer la sélection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-5 py-2.5 border-b border-black/[0.06] bg-[#F5F5F7]/70">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={processPickerSearch}
                    onChange={(e) => setProcessPickerSearch(e.target.value)}
                    placeholder="Filtrer par nom de processus ou projet..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-black/[0.08] focus:border-[#007AFF] text-[12px] outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {list.length === 0 ? (
                  <p className="text-[12px] text-[#8E8E93] italic text-center py-6">
                    {processPickerTab === 'free'
                      ? 'Aucun processus libre pour le moment. Vous pourrez en créer un directement après la création du projet.'
                      : 'Aucun processus correspondant.'}
                  </p>
                ) : (
                  list.map((pr) => {
                    const selected = projProcesses.includes(pr.id);
                    const ownerNames = (parentProjectByProcessId.get(pr.id) || [])
                      .filter((p) => p.id !== editingProjectId)
                      .map((p) => p.name)
                      .join(', ');
                    return (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() =>
                          setProjProcesses((prev) =>
                            prev.includes(pr.id)
                              ? prev.filter((x) => x !== pr.id)
                              : [...prev, pr.id]
                          )
                        }
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                          selected
                            ? 'bg-[#007AFF]/[0.06] border-[#007AFF]'
                            : 'bg-[#F5F5F7]/60 border-black/[0.07] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[12.5px] font-semibold text-[#1D1D1F] truncate">
                            {pr.name}
                          </div>
                          <div className="text-[11px] text-[#6E6E73] flex items-center flex-wrap gap-1.5">
                            <span>
                              {pr.nodeCount} étapes · {pr.ruleCount} règles · v{pr.version}
                            </span>
                            {ownerNames && (
                              <span className="px-1.5 py-0.2 rounded bg-white border border-black/[0.07] text-[10px] text-[#6E6E73]">
                                Dans : {ownerNames}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            selected
                              ? 'bg-[#007AFF] text-white'
                              : 'border border-black/20 bg-white text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-black/[0.07] bg-white flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setProcessPickerTab(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Valider ({projProcesses.length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Apple macOS Confirmation Modal (Delete Project / Detach Process / Reset) */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-[110] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPendingConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-label={pendingConfirm.title}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-black/[0.10] rounded-2xl shadow-2xl p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                {pendingConfirm.title}
              </h3>
              <p className="text-[12.5px] text-[#6E6E73] leading-relaxed">
                {pendingConfirm.message}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-black/[0.08] text-[#1D1D1F] text-[12px] font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  await action();
                }}
                className="px-4 py-1.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-white text-[12px] font-semibold transition cursor-pointer"
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Read-Only Process Compare Modal */}
      {compareModalState && (
        <ProcessCompareModal
          isOpen={true}
          onClose={() => setCompareModalState(null)}
          projectName={compareModalState.projectName}
          processes={compareModalState.processes}
        />
      )}
    </div>
  );
};
