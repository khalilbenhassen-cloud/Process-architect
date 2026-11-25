import React, { useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Plus,
  Sparkles,
  FolderKanban,
  Workflow,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  X,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Download,
  RefreshCw,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import {
  Collaborator,
  Meeting,
  ProcessSummary,
  Project,
} from '../../types/process';
import { getMeetingIcsUrl } from '../../services/api';
import { useStaggerReveal } from '../../utils/useStaggerReveal';

type AgendaTab = 'upcoming' | 'all' | 'past';

interface AgendaViewProps {
  meetings: Meeting[];
  projects: Project[];
  processes: ProcessSummary[];
  collaborators: Collaborator[];
  onOpenScheduleModal: () => void;
  onSyncOutlook: (meetingId: string) => Promise<void>;
  onDeleteMeeting: (meetingId: string) => Promise<void>;
  onOpenConversation: (conversationId: string) => void;
  onOpenProcessInStudio: (processId: string) => void;
  onDirectChatWithSecretary: () => void;
}

function getDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayGroupLabel(isoDate: string, now: Date = new Date()): {
  dayKey: string;
  label: string;
  isToday: boolean;
} {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { dayKey: 'unknown', label: 'Date non définie', isToday: false };
  }

  const todayKey = getDayKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getDayKey(tomorrow);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDayKey(yesterday);

  const key = getDayKey(date);
  const formattedFull = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capitalized = formattedFull.charAt(0).toUpperCase() + formattedFull.slice(1);

  if (key === todayKey) {
    return { dayKey: key, label: `Aujourd’hui · ${capitalized}`, isToday: true };
  }
  if (key === tomorrowKey) {
    return { dayKey: key, label: `Demain · ${capitalized}`, isToday: false };
  }
  if (key === yesterdayKey) {
    return { dayKey: key, label: `Hier · ${capitalized}`, isToday: false };
  }
  return { dayKey: key, label: capitalized, isToday: false };
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  meetings,
  projects,
  processes,
  onOpenScheduleModal,
  onSyncOutlook,
  onDeleteMeeting,
  onOpenConversation,
  onOpenProcessInStudio,
  onDirectChatWithSecretary,
}) => {
  const agendaRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AgendaTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});

  useStaggerReveal(agendaRef, '[data-testid^="agenda-meeting-card-"]', [
    activeTab,
    selectedProjectIds.join(','),
    searchQuery,
  ]);

  const startOfTodayMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const counts = useMemo(() => {
    let upcoming = 0;
    let past = 0;
    for (const m of meetings) {
      const ms = Date.parse(m.startAt);
      if (Number.isNaN(ms) || ms >= startOfTodayMs) upcoming += 1;
      else past += 1;
    }
    return { upcoming, all: meetings.length, past };
  }, [meetings, startOfTodayMs]);

  const filteredMeetings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return meetings
      .filter((m) => {
        const ms = Date.parse(m.startAt);
        const isPast = !Number.isNaN(ms) && ms < startOfTodayMs;
        if (activeTab === 'upcoming' && isPast) return false;
        if (activeTab === 'past' && !isPast) return false;

        if (selectedProjectIds.length > 0 && !selectedProjectIds.includes(m.projectId || '')) {
          return false;
        }
        if (!q) return true;
        const projName = projects.find((p) => p.id === m.projectId)?.name || '';
        return (
          m.title.toLowerCase().includes(q) ||
          (m.agendaNotes || '').toLowerCase().includes(q) ||
          (m.locationOrLink || '').toLowerCase().includes(q) ||
          projName.toLowerCase().includes(q) ||
          (m.attendeeEmails || []).some((e) => e.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ma = Date.parse(a.startAt) || 0;
        const mb = Date.parse(b.startAt) || 0;
        return activeTab === 'past' ? mb - ma : ma - mb;
      });
  }, [meetings, activeTab, selectedProjectIds, searchQuery, projects, startOfTodayMs]);

  // Option A: Chronological grouping by day
  const groupedDays = useMemo(() => {
    const groups: Array<{
      dayKey: string;
      label: string;
      isToday: boolean;
      items: Meeting[];
    }> = [];
    const indexByKey = new Map<string, number>();

    for (const m of filteredMeetings) {
      const info = getDayGroupLabel(m.startAt);
      const existingIdx = indexByKey.get(info.dayKey);
      if (existingIdx === undefined) {
        indexByKey.set(info.dayKey, groups.length);
        groups.push({ ...info, items: [m] });
      } else {
        groups[existingIdx].items.push(m);
      }
    }
    return groups;
  }, [filteredMeetings]);

  const handleSync = async (meetingId: string) => {
    if (syncingIds[meetingId]) return;
    setSyncingIds((prev) => ({ ...prev, [meetingId]: true }));
    try {
      await onSyncOutlook(meetingId);
    } finally {
      setSyncingIds((prev) => ({ ...prev, [meetingId]: false }));
    }
  };

  return (
    <div
      ref={agendaRef}
      className="flex-1 h-full flex flex-col bg-gradient-to-b from-[#F5F5F7] to-white text-[#1D1D1F] overflow-hidden apple-workspace-enter"
      onClick={() => setShowFilterMenu(false)}
    >
      {/* Studio-aligned Single-Row Apple HIG Toolbar */}
      <div className="h-[54px] px-5 bg-white/95 backdrop-blur-md border-b border-black/[0.07] shrink-0 flex items-center justify-between gap-3 relative z-30">
        {/* Left: Compact Title + Discreet Outlook Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <h1 className="text-[14px] font-semibold tracking-tight text-[#1D1D1F] truncate">
            Agenda
          </h1>
          <span
            title="Connecteur Outlook actif : Office 365 Web Deep Link, .ics RFC 5545 et Graph API"
            className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-medium text-[#6E6E73] shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            <span>Outlook actif</span>
          </span>
        </div>

        {/* Center: Apple Segmented Control (matching Studio's Modéliser / Auditer / Simuler / Recette) */}
        <div className="hidden md:flex items-center bg-[#F5F5F7] p-0.5 rounded-xl border border-black/[0.06]">
          {(
            [
              { id: 'upcoming', label: 'À venir', count: counts.upcoming },
              { id: 'all', label: 'Toutes', count: counts.all },
              { id: 'past', label: 'Passées', count: counts.past },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[9px] text-[12px] font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-white text-[#007AFF] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10.5px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-black/[0.05] text-[#8E8E93]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search + Project Filter + Agent Secrétaire + Primary CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Search */}
          <div className="relative hidden sm:block w-44 lg:w-52">
            <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher une réunion"
              className="w-full pl-8 pr-6 py-1.5 rounded-lg bg-[#F5F5F7] border border-black/[0.06] focus:border-[#007AFF] focus:bg-white text-[12px] text-[#1D1D1F] placeholder:text-[#8E8E93] outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Multi-select Project Filter Dropdown */}
          {projects.length > 0 && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowFilterMenu((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition cursor-pointer ${
                  selectedProjectIds.length > 0 || showFilterMenu
                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Projets</span>
                {selectedProjectIds.length > 0 && (
                  <span className="px-1.5 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                    {selectedProjectIds.length}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showFilterMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white/95 backdrop-blur-xl border border-black/[0.09] rounded-2xl shadow-xl p-2 space-y-1 z-50">
                  <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                    Filtrer par projet
                  </div>
                  {projects.map((p) => {
                    const active = selectedProjectIds.includes(p.id);
                    const count = meetings.filter((m) => m.projectId === p.id).length;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSelectedProjectIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id]
                          )
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] font-medium flex items-center justify-between gap-2 cursor-pointer transition ${
                          active
                            ? 'bg-[#007AFF]/10 text-[#007AFF] font-semibold'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <FolderKanban className="w-3.5 h-3.5 shrink-0 text-[#007AFF]" />
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10.5px] text-[#8E8E93] shrink-0">({count})</span>
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
                  {selectedProjectIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProjectIds([])}
                      className="w-full pt-1.5 mt-1 border-t border-black/[0.06] text-[11.5px] font-semibold text-[#007AFF] text-right cursor-pointer"
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Secondary: Agent Secrétaire */}
          <button
            type="button"
            onClick={onDirectChatWithSecretary}
            title="Demander à l'Agent Secrétaire de préparer une réunion"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[12px] font-semibold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden xl:inline">Agent Secrétaire</span>
          </button>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12px] font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Planifier</span>
          </button>
        </div>
      </div>

      {/* Scrollable Option A Chronological Day-Grouped Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mobile segmented tabs fallback */}
          <div className="flex md:hidden items-center bg-[#F5F5F7] p-0.5 rounded-xl border border-black/[0.06] w-fit">
            {(
              [
                { id: 'upcoming', label: 'À venir', count: counts.upcoming },
                { id: 'all', label: 'Toutes', count: counts.all },
                { id: 'past', label: 'Passées', count: counts.past },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-[9px] text-[12px] font-semibold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-[#007AFF] shadow-2xs'
                    : 'text-[#6E6E73]'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {groupedDays.length === 0 ? (
            <div className="bg-white/95 border border-black/[0.07] rounded-2xl p-12 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] text-[#8E8E93] flex items-center justify-center mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-[15px] font-semibold text-[#1D1D1F]">
                Aucune réunion planifiée
              </div>
              <p className="text-[12.5px] text-[#6E6E73] max-w-md mx-auto">
                Planifiez un atelier avec vos intervenants ou demandez à l’Agent Secrétaire de préparer l’ordre du jour.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onDirectChatWithSecretary}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[12.5px] font-semibold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Agent Secrétaire</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenScheduleModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12.5px] font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Planifier une réunion</span>
                </button>
              </div>
            </div>
          ) : (
            groupedDays.map((group) => (
              <section key={group.dayKey} className="space-y-3">
                {/* Chronological Day Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    {group.isToday && (
                      <span className="w-2 h-2 rounded-full bg-[#007AFF]" />
                    )}
                    <h2
                      className={`text-[12px] font-semibold uppercase tracking-wider ${
                        group.isToday ? 'text-[#007AFF]' : 'text-[#6E6E73]'
                      }`}
                    >
                      {group.label}
                    </h2>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/[0.05] text-[10.5px] font-semibold text-[#6E6E73]">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-black/[0.06]" />
                </div>

                {/* Meeting Cards for this Day */}
                <div className="space-y-3">
                  {group.items.map((m) => {
                    const proj = projects.find((p) => p.id === m.projectId);
                    const proc = processes.find((p) => p.id === m.processId);
                    const startDate = new Date(m.startAt);
                    const hasValidDate = !Number.isNaN(startDate.getTime());
                    const weekdayShort = hasValidDate
                      ? startDate
                          .toLocaleDateString('fr-FR', { weekday: 'short' })
                          .replace('.', '')
                          .toUpperCase()
                      : '---';
                    const dayNum = hasValidDate ? startDate.getDate() : '--';
                    const timeStr = hasValidDate
                      ? startDate.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : m.startAt;
                    const isSyncing = Boolean(syncingIds[m.id]);

                    const syncMeta =
                      m.outlookSyncStatus === 'synced'
                        ? { label: 'Synchronisé', dot: '#34C759' }
                        : m.outlookSyncStatus === 'ics_exported'
                        ? { label: '.ics exporté', dot: '#007AFF' }
                        : { label: 'Prêt pour Outlook', dot: '#FF9500' };

                    return (
                      <article
                        key={m.id}
                        data-testid={`agenda-meeting-card-${m.id}`}
                        className="bg-white/95 backdrop-blur-md border border-black/[0.07] hover:border-black/[0.13] rounded-2xl p-4 shadow-[0_2px_6px_rgba(0,0,0,0.03),0_8px_20px_rgba(0,0,0,0.03)] transition space-y-3"
                      >
                        {/* Top Row: Apple Date Badge + Title/Meta + Status & Delete */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Apple Calendar Day Squircle */}
                            <div className="w-11 h-11 rounded-xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col items-center justify-center shrink-0">
                              <span
                                className={`text-[9.5px] font-bold tracking-wider leading-none ${
                                  group.isToday ? 'text-[#FF3B30]' : 'text-[#007AFF]'
                                }`}
                              >
                                {weekdayShort}
                              </span>
                              <span className="text-[16px] font-bold text-[#1D1D1F] leading-tight mt-0.5">
                                {dayNum}
                              </span>
                            </div>

                            <div className="min-w-0 space-y-1">
                              <h3 className="text-[14px] font-semibold tracking-tight text-[#1D1D1F] leading-snug">
                                {m.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6E6E73]">
                                <span className="inline-flex items-center gap-1 font-medium text-[#1D1D1F]">
                                  <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
                                  {timeStr} · {m.durationMinutes} min
                                </span>
                                {m.locationOrLink && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-[#8E8E93]" />
                                    <span className="truncate max-w-[220px]">
                                      {m.locationOrLink}
                                    </span>
                                  </span>
                                )}
                                {m.attendeeEmails && m.attendeeEmails.length > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1"
                                    title={m.attendeeEmails.join(', ')}
                                  >
                                    <Users className="w-3.5 h-3.5 text-[#8E8E93]" />
                                    <span>
                                      {m.attendeeEmails.length} participant
                                      {m.attendeeEmails.length > 1 ? 's' : ''}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Status Pill + Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-semibold text-[#1D1D1F]">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: syncMeta.dot }}
                              />
                              <span>{syncMeta.label}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteMeeting(m.id)}
                              className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition cursor-pointer"
                              title="Supprimer cette réunion"
                              aria-label={`Supprimer ${m.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Agenda Notes */}
                        {m.agendaNotes && (
                          <div className="px-3 py-2.5 rounded-xl bg-[#F5F5F7]/85 border border-black/[0.05] text-[12px] text-[#6E6E73] whitespace-pre-line leading-relaxed">
                            {m.agendaNotes}
                          </div>
                        )}

                        {/* Footer: Context Links (Left) + Streamlined Outlook Actions (Right) */}
                        <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                            {proj && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.06] text-[11px] font-medium text-[#1D1D1F] max-w-[220px]">
                                <FolderKanban className="w-3 h-3 text-[#007AFF] shrink-0" />
                                <span className="truncate">{proj.name}</span>
                              </span>
                            )}
                            {proc && (
                              <button
                                type="button"
                                onClick={() => onOpenProcessInStudio(proc.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#007AFF]/10 hover:bg-[#007AFF] text-[#007AFF] hover:text-white text-[11px] font-semibold transition cursor-pointer"
                              >
                                <Workflow className="w-3 h-3 shrink-0" />
                                <span>Ouvrir dans Studio</span>
                                <ArrowUpRight className="w-3 h-3 shrink-0" />
                              </button>
                            )}
                            {m.conversationId && (
                              <button
                                type="button"
                                onClick={() => onOpenConversation(m.conversationId!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span>Conversation</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={getMeetingIcsUrl(m.id)}
                              download
                              title="Télécharger l'invitation Outlook (.ics)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[11.5px] font-semibold transition"
                            >
                              <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
                              <span>.ics</span>
                            </a>

                            {m.outlookSyncStatus !== 'synced' && (
                              <button
                                type="button"
                                disabled={isSyncing}
                                onClick={() => handleSync(m.id)}
                                title="Synchroniser via Microsoft Graph API"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/[0.08] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] text-[11.5px] font-semibold transition cursor-pointer disabled:opacity-60"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 text-[#007AFF] ${
                                    isSyncing ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>{isSyncing ? 'Synchro...' : 'Synchroniser'}</span>
                              </button>
                            )}

                            <a
                              href={m.outlookWebLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-[11.5px] font-semibold shadow-2xs transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ouvrir dans Outlook</span>
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
