import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Download,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Meeting } from '../../types/process';
import { getMeetingIcsUrl } from '../../services/api';

interface MeetingChatCardProps {
  meeting: Meeting;
  compact?: boolean;
  onSyncOutlook?: (meetingId: string) => Promise<void>;
  onDeleteMeeting?: (meetingId: string) => Promise<void>;
}

export const MeetingChatCard: React.FC<MeetingChatCardProps> = ({
  meeting,
  compact = false,
  onSyncOutlook,
  onDeleteMeeting,
}) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncOutlook || syncing) return;
    setSyncing(true);
    try {
      await onSyncOutlook(meeting.id);
    } finally {
      setSyncing(false);
    }
  };

  const formattedDate = (() => {
    try {
      return new Date(meeting.startAt).toLocaleString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return meeting.startAt;
    }
  })();

  return (
    <div
      className={`rounded-xl bg-white border border-[#DFE3E6] shadow-2xs text-[#1C2024] ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      {/* Top Row: Title + Outlook Sync Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] text-[#1F93FF] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-cw-620 text-[#1C2024] truncate">
              {meeting.title}
            </div>
            <div className="text-[11px] text-[#60646C] flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#1F93FF]" />
                {formattedDate} ({meeting.durationMinutes} min)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-cw-620 ${
              meeting.outlookSyncStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : meeting.outlookSyncStatus === 'ics_exported'
                ? 'bg-[#EBF5FF] text-[#1F93FF]'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>
              {meeting.outlookSyncStatus === 'synced'
                ? 'Synchronisé Outlook'
                : meeting.outlookSyncStatus === 'ics_exported'
                ? 'Invitation .ics exportée'
                : 'Prêt pour Outlook'}
            </span>
          </span>

          {onDeleteMeeting && (
            <button
              type="button"
              onClick={() => onDeleteMeeting(meeting.id)}
              className="p-1 rounded-md text-[#8B8D98] hover:text-rose-600 hover:bg-rose-50 transition"
              title="Supprimer cette réunion"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Location & Attendees */}
      <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#60646C]">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#8B8D98]" />
          <span>{meeting.locationOrLink}</span>
        </span>
        {meeting.attendeeEmails && meeting.attendeeEmails.length > 0 && (
          <span className="inline-flex items-center gap-1 truncate max-w-md">
            <Users className="w-3.5 h-3.5 text-[#8B8D98]" />
            <span className="truncate">{meeting.attendeeEmails.join(', ')}</span>
          </span>
        )}
      </div>

      {/* Agenda Notes */}
      {meeting.agendaNotes && (
        <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#ECEEF0] text-[12px] text-[#60646C] whitespace-pre-line">
          {meeting.agendaNotes}
        </div>
      )}

      {/* Action Buttons: Outlook Web Deep Link + .ics Download + Graph Sync */}
      <div className="flex items-center flex-wrap gap-2 pt-1">
        <a
          href={meeting.outlookWebLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-[12px] font-cw-620 shadow-2xs transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Ouvrir dans Outlook</span>
        </a>

        <a
          href={getMeetingIcsUrl(meeting.id)}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.08] bg-[#F5F5F7] hover:bg-[#EBEBF0] text-[#1D1D1F] text-[12px] font-cw-520 transition"
        >
          <Download className="w-3.5 h-3.5 text-[#007AFF]" />
          <span>Invitation .ics</span>
        </a>

        {onSyncOutlook && meeting.outlookSyncStatus !== 'synced' && (
          <button
            type="button"
            disabled={syncing}
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DFE3E6] bg-white hover:bg-[#EBF5FF] text-[#1F93FF] text-[11.5px] font-cw-520 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronisation...' : 'Synchroniser Graph API'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
