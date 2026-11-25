import React, { useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  ArrowRight,
  Workflow,
  FolderKanban,
  X,
  Filter,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { Category, ProcessSummary, Project } from '../types/process';
import { useStaggerReveal } from '../utils/useStaggerReveal';

export interface StudioProjectGalleryProps {
  projects: Project[];
  processes: ProcessSummary[];
  categories: Category[];
  activeMorphProjectId?: string | null;
  onOpenProjectProcess: (projectId: string, processId: string | null) => void;
  onGoToProjectsManager: () => void;
}

const STATUS_META: Record<Project['status'], { label: string; dot: string }> = {
  draft: { label: 'Brouillon', dot: '#8E8E93' },
  active: { label: 'Actif', dot: '#34C759' },
  review: { label: 'En revue', dot: '#FF9500' },
  completed: { label: 'Terminé', dot: '#007AFF' },
  archived: { label: 'Archivé', dot: '#8E8E93' },
};

/**
 * Returns the most recent activity timestamp (ms) across the project itself and all its linked processes.
 */
export function getProjectLastActivityTimestamp(
  project: Project,
  linkedProcesses: ProcessSummary[]
): number {
  const candidates: string[] = [];
  if (project.updatedAt) candidates.push(project.updatedAt);
  else if (project.createdAt) candidates.push(project.createdAt);
  for (const pr of linkedProcesses) {
    if (pr.updatedAt) candidates.push(pr.updatedAt);
  }
  let maxMs = 0;
  for (const iso of candidates) {
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms;
    }
  }
  return maxMs;
}

/**
 * Formats a timestamp as relative time when < 24h ("À l’instant", "Il y a 5 min", "Il y a 3 h"),
 * and switches to a fixed date/time ("20 nov. 2026 · 14:30") once >= 24h have elapsed.
 */
export function formatLastUpdatedLabel(
  timestampMs: number,
  nowMs: number = Date.now()
): { label: string; exact: string } {
  if (!timestampMs) {
    return { label: 'Non enregistré', exact: '' };
  }
  const date = new Date(timestampMs);
  const exact = date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const diffMs = Math.max(0, nowMs - timestampMs);
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMs < 60_000) {
    return { label: 'À l’instant', exact };
  }
  if (diffMinutes < 60) {
    return { label: `Il y a ${diffMinutes} min`, exact };
  }
  if (diffHours < 24) {
    return { label: `Il y a ${diffHours} h`, exact };
  }

  const fixedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const fixedTime = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { label: `${fixedDate} · ${fixedTime}`, exact };
}

export const StudioProjectGallery: React.FC<StudioProjectGalleryProps> = ({
  projects,
  processes,
  categories,
  activeMorphProjectId,
  onOpenProjectProcess,
  onGoToProjectsManager,
}) => {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useStaggerReveal(galleryRef, '[data-testid^="studio-project-card-"]', [
    selectedCatIds.join(','),
    searchQuery,
    projects.length,
  ]);

  const sortedFilteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects
      .map((project) => {
        const linkedProcs = processes.filter(
          (pr) => project.processIds.includes(pr.id) || pr.projectId === project.id
        );
        const lastActivityMs = getProjectLastActivityTimestamp(project, linkedProcs);
        return { project, linkedProcs, lastActivityMs };
      })
      .filter(({ project, linkedProcs }) => {
        if (selectedCatIds.length > 0 && !selectedCatIds.includes(project.categoryId || '')) {
          return false;
        }
        if (!q) return true;
        return (
          project.name.toLowerCase().includes(q) ||
          (project.description || '').toLowerCase().includes(q) ||
          linkedProcs.some((pr) => pr.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.lastActivityMs - a.lastActivityMs);
  }, [projects, processes, searchQuery, selectedCatIds]);

  return (
    <div
      ref={galleryRef}
      className="flex-1 h-full bg-gradient-to-b from-[#F5F5F7] to-white overflow-y-auto px-6 py-8 pb-28 text-[#1D1D1F]"
      onClick={() => setShowFilterMenu(false)}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
              Ouvrir un projet dans le Studio
            </h1>
            <p className="text-[13px] text-[#6E6E73]">
              Sélectionnez un projet ou cliquez directement sur un processus pour le modéliser.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToProjectsManager}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12.5px] font-semibold shadow-xs transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau projet</span>
          </button>
        </div>

        {/* Single-row Search + Category Filter */}
        <div className="relative z-30 bg-white/95 backdrop-blur-md border border-black/[0.07] rounded-2xl px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un projet ou un processus..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] focus:border-[#007AFF] focus:bg-white text-[12.5px] text-[#1D1D1F] placeholder:text-[#8E8E93] outline-none transition"
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

          {categories.length > 0 && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowFilterMenu((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition cursor-pointer ${
                  selectedCatIds.length > 0 || showFilterMenu
                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtres</span>
                {selectedCatIds.length > 0 && (
                  <span className="px-1.5 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                    {selectedCatIds.length}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showFilterMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-2xl shadow-xl p-2.5 space-y-1 z-50">
                  {categories.map((cat) => {
                    const active = selectedCatIds.includes(cat.id);
                    const count = projects.filter((p) => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setSelectedCatIds((prev) =>
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
                          <span className="text-[10.5px] text-[#8E8E93]">({count})</span>
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
                  {selectedCatIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCatIds([])}
                      className="w-full pt-1.5 mt-1 border-t border-black/[0.06] text-[11.5px] font-semibold text-[#007AFF] text-right cursor-pointer"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {sortedFilteredProjects.length === 0 ? (
          <div className="bg-white/95 border border-black/[0.07] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
            <FolderKanban className="w-10 h-10 text-[#8E8E93] mx-auto" />
            <div className="text-[15px] font-semibold text-[#1D1D1F]">
              Aucun projet disponible
            </div>
            <p className="text-[12.5px] text-[#6E6E73]">
              Modifiez votre recherche ou créez un nouveau projet pour démarrer dans le Studio.
            </p>
            <button
              type="button"
              onClick={onGoToProjectsManager}
              className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-[12.5px] font-semibold hover:bg-[#0062CC] cursor-pointer"
            >
              Gérer les projets
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedFilteredProjects.map(({ project: proj, linkedProcs, lastActivityMs }) => {
              const cat = categories.find((c) => c.id === proj.categoryId);
              const primaryProc =
                linkedProcs.find((p) => p.modelState === 'to_be') ||
                linkedProcs[0] ||
                null;
              const statusMeta = STATUS_META[proj.status] || {
                label: proj.status,
                dot: '#8E8E93',
              };
              const isMorphTarget = activeMorphProjectId === proj.id;
              const lastUpdated = formatLastUpdatedLabel(lastActivityMs);

              return (
                <div
                  key={proj.id}
                  data-testid={`studio-project-card-${proj.id}`}
                  onClick={() => {
                    onOpenProjectProcess(proj.id, primaryProc ? primaryProc.id : null);
                  }}
                  style={
                    isMorphTarget
                      ? ({ viewTransitionName: 'studio-morph-shell' } as React.CSSProperties)
                      : undefined
                  }
                  className="group bg-white/95 backdrop-blur-md border border-black/[0.07] hover:border-[#007AFF]/50 rounded-2xl p-4 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_10px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,122,255,0.08),0_14px_30px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer flex flex-col gap-3"
                >
                  {/* Category & Status pills */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {cat ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[10.5px] font-semibold text-[#6E6E73] truncate max-w-[65%]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/[0.08] text-[10.5px] font-semibold text-[#1D1D1F] shrink-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: statusMeta.dot }}
                      />
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Title & 2-line description */}
                  <div className="space-y-1">
                    <h2
                      style={
                        isMorphTarget
                          ? ({ viewTransitionName: 'studio-morph-title' } as React.CSSProperties)
                          : undefined
                      }
                      className="text-[14.5px] font-semibold tracking-tight text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors line-clamp-2"
                    >
                      {proj.name}
                    </h2>
                    {proj.description && (
                      <p className="text-[12px] text-[#6E6E73] line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Last updated timestamp */}
                  <div
                    title={lastUpdated.exact ? `Dernière mise à jour : ${lastUpdated.exact}` : undefined}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6E6E73]"
                  >
                    <Clock className="w-3 h-3 text-[#8E8E93] shrink-0" />
                    <span>Mis à jour · {lastUpdated.label}</span>
                  </div>

                  {/* Clickable Processes list */}
                  <div className="mt-auto pt-2.5 border-t border-black/[0.06] space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1">
                      <Workflow className="w-3 h-3 text-[#007AFF]" />
                      <span>Processus ({linkedProcs.length})</span>
                    </div>
                    {linkedProcs.length === 0 ? (
                      <p className="text-[11.5px] text-[#8E8E93] italic">
                        Aucun processus rattaché
                      </p>
                    ) : (
                      linkedProcs.map((proc) => (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProjectProcess(proj.id, proc.id);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#F5F5F7]/80 hover:bg-[#007AFF] text-[#1D1D1F] hover:text-white border border-black/[0.05] flex items-center justify-between gap-2 text-left transition cursor-pointer group/proc"
                        >
                          <div className="min-w-0">
                            <div className="text-[11.5px] font-semibold truncate">
                              {proc.modelState === 'as_is' ? 'AS-IS' : 'TO-BE'} · {proc.name.split('—')[0].trim()}
                            </div>
                            <div className="text-[10px] text-[#6E6E73] group-hover/proc:text-white/80">
                              {proc.nodeCount} étapes · {proc.ruleCount} règles
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#007AFF] group-hover/proc:text-white shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
