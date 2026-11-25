import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Copy,
  Download,
  Check,
  Clock,
  Save,
  Bell,
  Search,
  ChevronDown,
  Sparkles,
  Play,
  ShieldCheck,
  CheckSquare,
  Table2,
  Columns2,
  GitFork,
  FileText,
  Database,
  Undo2,
  Redo2,
  LayoutGrid,
  X,
} from 'lucide-react';
import {
  Collaborator,
  Process,
  ProcessNode,
  ProcessSummary,
  Project,
  ValidationResult,
} from '../types/process';

export type StudioViewMode = 'table' | 'split' | 'diagram';
export type StudioWorkbenchTab = 'model' | 'audit' | 'simulate' | 'recette';

interface NavbarProps {
  currentProcess: Process | null;
  projects?: Project[];
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  processes?: ProcessSummary[];
  onSelectProcess?: (processId: string) => void;
  onBackToLaunchpad?: () => void;
  onOpenStudioGallery?: () => void;
  collaborators?: Collaborator[];
  activeCollaborator?: Collaborator | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  publishedVersionCount?: number;
  onOpenPublishModal?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenList: () => void;
  onNewProcess: () => void;
  onDuplicate: () => void;
  onOpenExportImport: () => void;
  onToggleDrawer: (tab?: string) => void;
  drawerOpen: boolean;
  activeDrawerTab?: string;
  workbenchTab?: StudioWorkbenchTab;
  onChangeWorkbenchTab?: (tab: StudioWorkbenchTab) => void;
  onRunValidation?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  rulesCount?: number;
  onOpenRulesCatalog?: () => void;
  onOpenDataDocuments?: () => void;
  onFitView: () => void;
  onAutoLayout?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  searchNodes?: ProcessNode[];
  onSelectSearchNode?: (nodeId: string) => void;
  validationSummary?: ValidationResult['summary'] | null;
  studioMode?: StudioViewMode;
  onChangeStudioMode?: (mode: StudioViewMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProcess,
  projects = [],
  selectedProjectId,
  onSelectProject,
  processes = [],
  onSelectProcess,
  onBackToLaunchpad,
  onOpenStudioGallery,
  hasUnsavedChanges,
  isSaving,
  saveError,
  onSave,
  publishedVersionCount = 0,
  onOpenPublishModal,
  onOpenVersionHistory,
  onOpenList,
  onNewProcess,
  onDuplicate,
  onOpenExportImport,
  onToggleDrawer,
  drawerOpen,
  workbenchTab = 'model',
  onChangeWorkbenchTab,
  onRunValidation,
  rulesCount = 0,
  onOpenRulesCatalog,
  onOpenDataDocuments,
  onFitView,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  searchNodes = [],
  onSelectSearchNode,
  validationSummary,
  studioMode = 'split',
  onChangeStudioMode,
}) => {
  const [processMenuOpen, setProcessMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [stepSearchQuery, setStepSearchQuery] = useState('');
  const [stepSearchOpen, setStepSearchOpen] = useState(false);
  const processMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const stepSearchRef = useRef<HTMLDivElement>(null);
  const stepSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        processMenuRef.current &&
        !processMenuRef.current.contains(e.target as Node)
      ) {
        setProcessMenuOpen(false);
      }
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
      if (
        stepSearchRef.current &&
        !stepSearchRef.current.contains(e.target as Node)
      ) {
        setStepSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (stepSearchInputRef.current) {
          e.preventDefault();
          stepSearchInputRef.current.focus();
          setStepSearchOpen(true);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredSearchNodes = React.useMemo(() => {
    const q = stepSearchQuery.trim().toLowerCase();
    if (!q) return searchNodes.slice(0, 8);
    return searchNodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          (n.ownerRole || '').toLowerCase().includes(q) ||
          (n.application || '').toLowerCase().includes(q) ||
          (n.ruleIds || []).some((r) => r.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchNodes, stepSearchQuery]);

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  const shortProcessName = currentProcess?.name
    ? currentProcess.name.split('—')[0].trim()
    : 'Aucun processus';

  const rawVersion = currentProcess?.version
    ? String(currentProcess.version).replace(/^v/i, '').split('.')[0]
    : '';
  const versionShort = rawVersion || '1';

  const findingsCount = currentProcess ? (validationSummary?.totalFindings ?? 0) : 0;

  return (
    <div className="relative shrink-0 z-50 select-none">
      {/* ===================================================================
          ROW 1: Top Primary Studio Header Bar (harmonized with MacTopBar)
          =================================================================== */}
      <header
        aria-label="Barre principale du Studio"
        className="relative z-30 h-[42px] px-4 apple-glass-topbar flex items-center justify-between gap-3"
      >
        {/* Left: PA Logo + Projets Pill + Project / Process Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {onBackToLaunchpad && (
            <button
              type="button"
              onClick={onBackToLaunchpad}
              title="Retourner à l'accueil (Launchpad)"
              className="apple-pressable w-6 h-6 rounded-[6px] bg-[#1F93FF] text-white font-cw-620 text-[11px] flex items-center justify-center shadow-2xs hover:brightness-105 transition shrink-0 cursor-pointer"
            >
              PA
            </button>
          )}

          {onOpenStudioGallery && (
            <button
              type="button"
              onClick={onOpenStudioGallery}
              title="Revenir à la galerie des projets du Studio"
              className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EBF5FF] hover:bg-[#DDF0FF] text-[#1F93FF] text-[12px] font-cw-620 transition shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Projets</span>
            </button>
          )}

          <span className="hidden sm:inline text-[#DFE3E6]">/</span>

          {/* Project Dropdown Trigger (synced custom Apple HIG menu) */}
          <div
            ref={projectMenuRef}
            style={{ viewTransitionName: 'studio-morph-title' } as React.CSSProperties}
            className="hidden sm:block relative min-w-0"
          >
            {projects.length > 0 && onSelectProject ? (
              <>
                <button
                  type="button"
                  aria-label="Projet actif"
                  onClick={() => {
                    setProjectMenuOpen((v) => !v);
                    setProcessMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-black/5 transition cursor-pointer text-[#6E6E73] hover:text-[#1D1D1F] min-w-0"
                  title="Changer de projet actif"
                >
                  <Folder className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                  <span className="text-[12.5px] font-medium truncate max-w-[180px]">
                    {activeProject?.name?.split('—')[0].trim() || 'Projet actif'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                </button>

                {projectMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/[0.08] py-1.5 text-xs text-[#1D1D1F] z-50">
                    <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                      Projets disponibles
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {projects.map((p) => {
                        const isSelected = p.id === (selectedProjectId || activeProject?.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectProject(p.id);
                              setProjectMenuOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-[#EBF5FF] text-[#1F93FF] font-semibold'
                                : 'text-[#1D1D1F] font-medium'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#1F93FF] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-[#6E6E73] min-w-0">
                <Folder className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                <span className="text-[12.5px] font-medium truncate max-w-[180px]">
                  {activeProject?.name?.split('—')[0].trim() ||
                    'Refonte Épargne Retraite'}
                </span>
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-[#DFE3E6]">/</span>

          {/* Process Dropdown Trigger */}
          <div className="relative" ref={processMenuRef}>
            <button
              type="button"
              onClick={() => {
                setProcessMenuOpen((v) => !v);
                setProjectMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-black/5 transition cursor-pointer min-w-0"
              title="Changer de processus ou gérer le processus actif"
            >
              <span className="text-[12.5px] font-cw-620 text-[#1C2024] truncate max-w-[220px]">
                {shortProcessName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
            </button>

            {processMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/[0.08] py-1.5 text-xs text-[#1D1D1F] z-50">
                {processes.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                      Processus du projet
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {processes.map((proc) => (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={() => {
                            onSelectProcess?.(proc.id);
                            setProcessMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center justify-between gap-2 ${
                            proc.id === currentProcess?.id
                              ? 'bg-[#EBF5FF] text-[#1F93FF] font-semibold'
                              : 'text-[#1D1D1F] font-medium'
                          }`}
                        >
                          <span className="truncate">{proc.name}</span>
                          {proc.id === currentProcess?.id && (
                            <Check className="w-3.5 h-3.5 text-[#1F93FF] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="h-px bg-black/[0.06] my-1" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onNewProcess();
                    setProcessMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center gap-2.5 font-medium text-[#1D1D1F]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>Nouveau processus…</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenList();
                    setProcessMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center gap-2.5 font-medium text-[#1D1D1F]"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>Ouvrir la liste complète…</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDuplicate();
                    setProcessMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center gap-2.5 font-medium text-[#1D1D1F]"
                >
                  <Copy className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>Dupliquer ce processus</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenExportImport();
                    setProcessMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F5F5F7] flex items-center gap-2.5 font-medium text-[#1D1D1F]"
                >
                  <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>Exporter / Importer…</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: 4 Workbench Mode Tabs (Modéliser | Auditer 3 | Simuler | Recette) */}
        <div className="hidden lg:flex items-center bg-[#F5F5F7] p-0.5 rounded-lg border border-black/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onChangeWorkbenchTab) {
                onChangeWorkbenchTab('model');
              } else if (drawerOpen) {
                onToggleDrawer();
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
              workbenchTab === 'model' && !drawerOpen
                ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Modéliser</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onChangeWorkbenchTab) {
                onChangeWorkbenchTab('audit');
              } else {
                onToggleDrawer('validation');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
              workbenchTab === 'audit'
                ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditer</span>
            {findingsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FF3B30]/12 text-[#FF3B30]">
                {findingsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onChangeWorkbenchTab) {
                onChangeWorkbenchTab('simulate');
              } else {
                onToggleDrawer('simulation');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
              workbenchTab === 'simulate'
                ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simuler</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onChangeWorkbenchTab) {
                onChangeWorkbenchTab('recette');
              } else {
                onToggleDrawer('tests');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
              workbenchTab === 'recette'
                ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Recette</span>
          </button>
        </div>

        {/* Right: Export + Version History + Save/Publish + Bell */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {/* Explicit Export Button */}
          <button
            type="button"
            onClick={onOpenExportImport}
            aria-label="Exporter ou importer le processus"
            title="Exporter (Excel, MOA, JSON, CSV) ou Importer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-black/[0.08] bg-white text-[11.5px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
            <span className="hidden xl:inline">Exporter</span>
          </button>

          {/* Version History Pill (when a process is active in Modéliser) */}
          {workbenchTab === 'model' && currentProcess && onOpenVersionHistory && (
            <button
              type="button"
              onClick={onOpenVersionHistory}
              title={`Historique des versions (${publishedVersionCount} archivée${publishedVersionCount > 1 ? 's' : ''})`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-black/[0.08] bg-[#F5F5F7] hover:bg-black/[0.06] text-[11px] font-semibold text-[#1D1D1F] transition cursor-pointer"
            >
              <Clock className="w-3 h-3 text-[#6E6E73]" />
              <span>v{versionShort}</span>
              {publishedVersionCount > 0 && (
                <span className="px-1 py-0 rounded bg-white text-[10px] text-[#007AFF] border border-black/[0.06]">
                  {publishedVersionCount}
                </span>
              )}
            </button>
          )}

          {/* Primary Context Button (Enregistrer + Publier vX | Relancer l'audit | Relancer simulation | Exporter recette) */}
          {workbenchTab === 'audit' ? (
            <button
              type="button"
              onClick={onRunValidation}
              className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-cw-620 text-white bg-[#1F93FF] hover:bg-[#007BE5] shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Relancer l'audit</span>
            </button>
          ) : workbenchTab === 'simulate' ? (
            <button
              type="button"
              onClick={onFitView}
              className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-cw-620 text-white bg-[#1F93FF] hover:bg-[#007BE5] shadow-2xs transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Relancer la simulation</span>
            </button>
          ) : workbenchTab === 'recette' ? (
            <button
              type="button"
              onClick={onOpenExportImport}
              className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-cw-620 text-white bg-[#1F93FF] hover:bg-[#007BE5] shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter la recette</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              {/* Save Progress Button (draft save OR choice v1/v2 if already published) */}
              <button
                type="button"
                onClick={onSave}
                disabled={!currentProcess || isSaving}
                aria-label="Enregistrer l'avancement"
                title={
                  !currentProcess
                    ? 'Sélectionnez un processus'
                    : saveError
                    ? `Erreur : ${saveError}`
                    : hasUnsavedChanges
                    ? "Enregistrer l'avancement en cours (Ctrl+S)"
                    : 'Toutes les modifications sont enregistrées'
                }
                className={`apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition ${
                  !currentProcess
                    ? 'bg-[#F5F5F7] text-[#8E8E93] border-black/[0.06] cursor-not-allowed'
                    : hasUnsavedChanges
                    ? 'bg-white text-[#1D1D1F] border-[#007AFF]/40 hover:bg-[#007AFF]/[0.06] cursor-pointer'
                    : 'bg-[#F5F5F7] text-[#6E6E73] border-black/[0.06] hover:bg-black/[0.06] cursor-pointer'
                }`}
              >
                {hasUnsavedChanges ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0" />
                ) : (
                  <Save className="w-3 h-3 text-[#34C759]" />
                )}
                <span>
                  {isSaving
                    ? 'Sauvegarde…'
                    : hasUnsavedChanges
                    ? 'Enregistrer'
                    : 'Enregistré'}
                </span>
              </button>

              {/* Publish / Close Version Button */}
              <button
                type="button"
                onClick={onOpenPublishModal || onSave}
                disabled={!currentProcess || isSaving}
                aria-label="Publier et clôturer la version"
                title={
                  !currentProcess
                    ? 'Créez ou sélectionnez un processus pour publier'
                    : currentProcess.lifecycleState === 'approved'
                    ? `Version v${versionShort} publiée — cliquer pour mettre à jour ou créer v${Number(versionShort) + 1}`
                    : `Clôturer les travaux et publier la version v${versionShort}`
                }
                className={`apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-cw-620 text-white shadow-2xs transition ${
                  !currentProcess
                    ? 'bg-[#1F93FF]/45 cursor-not-allowed'
                    : 'bg-[#1F93FF] hover:bg-[#007BE5] cursor-pointer'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {!currentProcess
                    ? 'Publier'
                    : currentProcess.lifecycleState === 'approved'
                    ? `Publier v${Number(versionShort) + 1}`
                    : `Publier v${versionShort}`}
                </span>
              </button>
            </div>
          )}

          {/* Notification Bell */}
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5 transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ===================================================================
          ROW 2: Secondary Studio Toolbar (Shown in Model Mode)
          =================================================================== */}
      {workbenchTab === 'model' && (
        <div
          aria-label="Barre d'outils secondaire du Studio"
          className="relative z-10 h-[40px] px-4 border-b border-black/[0.07] bg-white/90 backdrop-blur-md flex items-center justify-between gap-2"
        >
          {/* Left: 3-Way View Switcher + Rules + Data + Step Search */}
          <div className="flex items-center gap-2 min-w-0">
            {/* 3-Way View Switcher: Tableau | Divisé | Diagramme */}
            <div className="inline-flex items-center bg-[#F5F5F7] p-0.5 rounded-lg border border-black/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => onChangeStudioMode?.('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
                  studioMode === 'table'
                    ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                    : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Tableau</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeStudioMode?.('split')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
                  studioMode === 'split'
                    ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                    : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Divisé</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeStudioMode?.('diagram')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] transition cursor-pointer ${
                  studioMode === 'diagram'
                    ? 'bg-white text-[#1F93FF] font-semibold shadow-2xs'
                    : 'text-[#6E6E73] font-medium hover:text-[#1D1D1F]'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Diagramme</span>
              </button>
            </div>

            {/* Règles métier [5] */}
            {onOpenRulesCatalog && (
              <button
                type="button"
                onClick={onOpenRulesCatalog}
                className="apple-pressable inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[11.5px] font-medium text-[#1D1D1F] shadow-2xs transition cursor-pointer shrink-0"
                title="Consulter et gérer le catalogue complet des règles métier du processus"
              >
                <FileText className="w-3.5 h-3.5 text-[#6E6E73]" />
                <span>Règles métier</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EBF5FF] text-[#1F93FF]">
                  {rulesCount ?? 0}
                </span>
              </button>
            )}

            {/* Données & documents */}
            <button
              type="button"
              onClick={onOpenDataDocuments}
              className="apple-pressable hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[11.5px] font-medium text-[#1D1D1F] shadow-2xs transition cursor-pointer shrink-0"
              title="Consulter et gérer les pièces justificatives, données entrantes/sortantes et applications SI du processus"
            >
              <Database className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Données & documents</span>
            </button>

            {/* Step Search Input with Ctrl K (moved from Row 1 next to Données & documents) */}
            <div ref={stepSearchRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#F5F5F7] border border-black/[0.06] focus-within:border-[#1F93FF] focus-within:bg-white text-[11.5px] text-[#8E8E93] w-56 transition">
                <Search className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                <input
                  ref={stepSearchInputRef}
                  type="text"
                  value={stepSearchQuery}
                  onFocus={() => setStepSearchOpen(true)}
                  onChange={(e) => {
                    setStepSearchQuery(e.target.value);
                    setStepSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredSearchNodes.length > 0) {
                      onSelectSearchNode?.(filteredSearchNodes[0].id);
                      setStepSearchOpen(false);
                      setStepSearchQuery('');
                    } else if (e.key === 'Escape') {
                      setStepSearchOpen(false);
                      stepSearchInputRef.current?.blur();
                    }
                  }}
                  placeholder="Rechercher une étape..."
                  aria-label="Rechercher une étape du processus"
                  className="bg-transparent text-[#1D1D1F] placeholder-[#8E8E93] text-[11.5px] w-full focus:outline-none"
                />
                {stepSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStepSearchQuery('');
                      stepSearchInputRef.current?.focus();
                    }}
                    aria-label="Effacer la recherche d'étape"
                    className="text-[#8E8E93] hover:text-[#1D1D1F] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <kbd className="px-1 py-0.2 text-[9.5px] font-semibold text-[#6E6E73] bg-white rounded border border-black/[0.08]">
                      Ctrl
                    </kbd>
                    <kbd className="px-1 py-0.2 text-[9.5px] font-semibold text-[#6E6E73] bg-white rounded border border-black/[0.08]">
                      K
                    </kbd>
                  </div>
                )}
              </div>

              {stepSearchOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/[0.08] py-1.5 text-xs text-[#1D1D1F] z-50">
                  <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Étapes du processus ({filteredSearchNodes.length})
                  </div>
                  {filteredSearchNodes.length === 0 ? (
                    <div className="px-3.5 py-3 text-[11.5px] text-[#8E8E93] italic">
                      Aucune étape trouvée pour « {stepSearchQuery} »
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSearchNodes.map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => {
                            onSelectSearchNode?.(node.id);
                            setStepSearchOpen(false);
                            setStepSearchQuery('');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#EBF5FF] hover:text-[#1F93FF] flex items-center justify-between gap-2 transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium truncate">
                              {node.label}
                            </div>
                            {(node.ownerRole || node.application) && (
                              <div className="text-[10.5px] text-[#8E8E93] truncate">
                                {[node.ownerRole, node.application].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-[#6E6E73] shrink-0">
                            {node.estimatedDurationMinutes || 0} min
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Undo, Redo */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Annuler la dernière modification"
              title={canUndo ? 'Annuler (Ctrl+Z)' : 'Rien à annuler'}
              className={`p-1.5 rounded-md transition ${
                canUndo
                  ? 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5 cursor-pointer'
                  : 'text-[#C7C7CC] cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Rétablir la modification annulée"
              title={canRedo ? 'Rétablir (Ctrl+Y)' : 'Rien à rétablir'}
              className={`p-1.5 rounded-md transition ${
                canRedo
                  ? 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5 cursor-pointer'
                  : 'text-[#C7C7CC] cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
