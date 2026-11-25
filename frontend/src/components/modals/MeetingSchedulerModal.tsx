import React, { useState, useEffect } from 'react';
import { X, Calendar, Sparkles, Check, Users, Clock, MapPin } from 'lucide-react';
import {
  Collaborator,
  Conversation,
  ProcessSummary,
  Project,
} from '../../types/process';

interface MeetingSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  processes: ProcessSummary[];
  collaborators: Collaborator[];
  activeCollaborator: Collaborator | null;
  activeConversation?: Conversation | null;
  defaultProjectId?: string | null;
  defaultProcessId?: string | null;
  onScheduleMeeting: (payload: {
    title: string;
    projectId?: string | null;
    processId?: string | null;
    conversationId?: string | null;
    organizerId?: string;
    organizerName?: string;
    attendeeIds: string[];
    attendeeEmails: string[];
    startAt: string;
    durationMinutes: number;
    locationOrLink: string;
    agendaNotes: string;
    postToConversation: boolean;
  }) => Promise<void>;
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  projects,
  processes,
  collaborators,
  activeCollaborator,
  activeConversation,
  defaultProjectId,
  defaultProcessId,
  onScheduleMeeting,
}) => {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [processId, setProcessId] = useState<string>('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [locationOrLink, setLocationOrLink] = useState('Microsoft Teams / Réunion Outlook');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [extraEmails, setExtraEmails] = useState('');
  const [agendaNotes, setAgendaNotes] = useState('');
  const [postToConversation, setPostToConversation] = useState(true);
  const [saving, setSaving] = useState(false);

  const humanCollaborators = collaborators.filter((c) => !c.isAi);

  useEffect(() => {
    if (!isOpen) return;
    const tomorrow = new Date(Date.now() + 86400000);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setDateStr(`${yyyy}-${mm}-${dd}`);
    setTimeStr('14:00');

    setProjectId(activeConversation?.projectId || defaultProjectId || '');
    setProcessId(activeConversation?.processId || defaultProcessId || '');

    if (activeConversation) {
      setTitle(`Réunion d'alignement — ${activeConversation.title}`);
      setSelectedAttendeeIds(
        humanCollaborators
          .filter((h) => activeConversation.participantIds.includes(h.id))
          .map((h) => h.id)
      );
      setPostToConversation(true);
    } else {
      setTitle('Comité de Revue & Validation Processus');
      setSelectedAttendeeIds(humanCollaborators.map((h) => h.id));
      setPostToConversation(false);
    }
  }, [isOpen, activeConversation, defaultProjectId, defaultProcessId]);

  if (!isOpen) return null;

  const handlePrefillBySecretaryAgent = () => {
    const msgs = activeConversation?.messages.slice(-5) || [];
    const lines = msgs.map(
      (m) => `• ${m.senderName} : ${m.content.replace(/\n/g, ' ').slice(0, 95)}`
    );
    const procName = processes.find((p) => p.id === processId)?.name || 'Processus cible';
    const generated = [
      `Ordre du jour préparé par 📅 Agent Secrétaire de Projet :`,
      `1. Revue du processus : ${procName}`,
      `2. Validation des règles de gestion et contrôles associés`,
      ...(lines.length > 0 ? [`3. Points issus de la conversation :`, ...lines] : []),
      `4. Décisions et prochaines étapes`,
    ].join('\n');
    setAgendaNotes(generated);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const isoStart = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      const selectedEmails = humanCollaborators
        .filter((h) => selectedAttendeeIds.includes(h.id) && h.email)
        .map((h) => h.email);
      const customEmails = extraEmails
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));

      await onScheduleMeeting({
        title: title.trim(),
        projectId: projectId || null,
        processId: processId || null,
        conversationId: activeConversation?.id || null,
        organizerId: activeCollaborator?.id || 'collab-user-main',
        organizerName: activeCollaborator?.name || 'Chef de Projet',
        attendeeIds: selectedAttendeeIds,
        attendeeEmails: Array.from(new Set([...selectedEmails, ...customEmails])),
        startAt: isoStart,
        durationMinutes,
        locationOrLink: locationOrLink.trim() || 'Microsoft Teams / Réunion Outlook',
        agendaNotes: agendaNotes.trim(),
        postToConversation: Boolean(activeConversation && postToConversation),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white border border-[#ECEEF0] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ECEEF0] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F93FF] text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-cw-620 text-[#1C2024]">
                Planifier une Réunion Microsoft Outlook
              </h2>
              <p className="text-[12px] text-[#60646C]">
                Synchronisation automatique via Deep Link Office 365 & invitation .ics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#60646C] hover:bg-[#ECEEF0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-[13px]">
          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
              Sujet de la réunion Outlook
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atelier de validation du processus..."
              className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] focus:outline-none focus:border-[#1F93FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">Date</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#DFE3E6] text-[12.5px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">Heure</label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#DFE3E6] text-[12.5px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Durée
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px]"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h 30</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Projet associé
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px]"
              >
                <option value="">Aucun projet spécifique</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
                Processus associé
              </label>
              <select
                value={processId}
                onChange={(e) => setProcessId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#DFE3E6] bg-white text-[12.5px]"
              >
                <option value="">Aucun processus spécifique</option>
                {processes.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1">
              Lieu ou lien visio (Microsoft Teams / Outlook)
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#8B8D98] absolute left-3 top-2.5" />
              <input
                type="text"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#DFE3E6] text-[12.5px]"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-[12px] font-cw-520 text-[#1C2024] mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#1F93FF]" />
              <span>Intervenants invités (Emails Outlook pré-remplis)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {humanCollaborators.map((hc) => {
                const checked = selectedAttendeeIds.includes(hc.id);
                return (
                  <button
                    key={hc.id}
                    type="button"
                    onClick={() => toggleAttendee(hc.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-cw-520 transition ${
                      checked
                        ? 'border-[#1F93FF] bg-[#EBF5FF] text-[#1F93FF]'
                        : 'border-[#ECEEF0] bg-[#FAFAFA] text-[#60646C]'
                    }`}
                  >
                    <span>{hc.name}</span>
                    <span className="text-[10px] opacity-75">({hc.email})</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              placeholder="Ajouter d'autres emails Outlook séparés par des virgules..."
              className="w-full px-3 py-1.5 rounded-lg border border-[#DFE3E6] text-[12px]"
            />
          </div>

          {/* Agenda Notes + AI Secretary Agent Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-cw-520 text-[#1C2024]">
                Ordre du jour & Décisions à préparer
              </label>
              <button
                type="button"
                onClick={handlePrefillBySecretaryAgent}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF5FF] hover:bg-[#1F93FF] text-[#1F93FF] hover:text-white text-[11px] font-cw-620 transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>Pré-remplir avec 📅 Agent Secrétaire</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={agendaNotes}
              onChange={(e) => setAgendaNotes(e.target.value)}
              placeholder="Ordre du jour qui sera inclus dans l'invitation Microsoft Outlook..."
              className="w-full px-3 py-2 rounded-lg border border-[#DFE3E6] text-[12.5px]"
            />
          </div>

          {activeConversation && (
            <label
              onClick={() => setPostToConversation((v) => !v)}
              className="flex items-center gap-2 cursor-pointer text-[12px] text-[#1C2024]"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center ${
                  postToConversation
                    ? 'bg-[#1F93FF] text-white'
                    : 'border border-[#DFE3E6] bg-white'
                }`}
              >
                {postToConversation && <Check className="w-3 h-3" />}
              </span>
              <span>
                Publier la carte d'invitation Outlook dans la conversation «{' '}
                <strong>{activeConversation.title}</strong> »
              </span>
            </label>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-[#ECEEF0] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-[12.5px] font-cw-520 text-[#60646C] hover:bg-[#F2F3F7]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[12.5px] font-cw-620 bg-[#1F93FF] hover:bg-[#007BE5] text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{saving ? 'Planification...' : 'Créer & Relier à Outlook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
