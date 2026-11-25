"""Microsoft Outlook Calendar Integration Service (.ics RFC 5545, Outlook Web Deep Link & Graph API payload)."""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from typing import Any
from app.models import MeetingModel


def _parse_iso_to_utc(iso_str: str) -> datetime:
    try:
        cleaned = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc) + timedelta(hours=24)


def compute_end_iso(start_iso: str, duration_minutes: int) -> str:
    start_dt = _parse_iso_to_utc(start_iso)
    end_dt = start_dt + timedelta(minutes=max(15, duration_minutes))
    return end_dt.isoformat()


def build_outlook_web_deeplink(meeting: MeetingModel) -> str:
    """Build Microsoft 365 / Outlook Web compose deep link pre-filled with meeting details."""
    start_dt = _parse_iso_to_utc(meeting.startAt)
    end_dt = _parse_iso_to_utc(meeting.endAt) if meeting.endAt else start_dt + timedelta(minutes=meeting.durationMinutes)

    body_lines = [
        f"Réunion planifiée depuis Process Architect",
        f"Organisateur : {meeting.organizerName}",
    ]
    if meeting.projectId:
        body_lines.append(f"Projet lié : {meeting.projectId}")
    if meeting.processId:
        body_lines.append(f"Processus lié : {meeting.processId}")
    if meeting.agendaNotes:
        body_lines.append("")
        body_lines.append("Ordre du jour & Décisions :")
        body_lines.append(meeting.agendaNotes)

    params: dict[str, str] = {
        "path": "/calendar/action/compose",
        "rru": "addevent",
        "subject": meeting.title,
        "startdt": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "enddt": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "location": meeting.locationOrLink or "Microsoft Teams / Réunion Outlook",
        "body": "\n".join(body_lines),
    }
    if meeting.attendeeEmails:
        params["to"] = ",".join(e for e in meeting.attendeeEmails if e)

    return f"https://outlook.office.com/calendar/0/deeplink/compose?{urlencode(params)}"


def generate_ics_content(meeting: MeetingModel) -> str:
    """Generate RFC 5545 iCalendar (.ics) file content for Outlook Desktop / Office 365."""
    start_dt = _parse_iso_to_utc(meeting.startAt)
    end_dt = _parse_iso_to_utc(meeting.endAt) if meeting.endAt else start_dt + timedelta(minutes=meeting.durationMinutes)
    now_dt = datetime.now(timezone.utc)

    def fmt_ics_dt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    def escape_ics(text: str) -> str:
        return (
            (text or "")
            .replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\r\n", "\\n")
            .replace("\n", "\\n")
        )

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Process Architect SaaS//Outlook Connector FR//FR",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{meeting.id}@process-architect.local",
        f"DTSTAMP:{fmt_ics_dt(now_dt)}",
        f"DTSTART:{fmt_ics_dt(start_dt)}",
        f"DTEND:{fmt_ics_dt(end_dt)}",
        f"SUMMARY:{escape_ics(meeting.title)}",
        f"LOCATION:{escape_ics(meeting.locationOrLink)}",
        f"DESCRIPTION:{escape_ics(meeting.agendaNotes or 'Réunion Process Architect')}",
        f"ORGANIZER;CN={escape_ics(meeting.organizerName)}:mailto:organisation@process-architect.local",
    ]

    for email in meeting.attendeeEmails:
        if email and "@" in email:
            lines.append(
                f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{email.strip()}"
            )

    lines.extend([
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    return "\r\n".join(lines) + "\r\n"


def build_graph_api_event_payload(meeting: MeetingModel) -> dict[str, Any]:
    """Build Microsoft Graph API (/me/events) JSON payload for direct OAuth/Enterprise sync."""
    start_dt = _parse_iso_to_utc(meeting.startAt)
    end_dt = _parse_iso_to_utc(meeting.endAt) if meeting.endAt else start_dt + timedelta(minutes=meeting.durationMinutes)

    return {
        "subject": meeting.title,
        "body": {
            "contentType": "HTML",
            "content": f"<p><strong>Process Architect — Réunion Projet</strong></p><pre>{meeting.agendaNotes}</pre>",
        },
        "start": {
            "dateTime": start_dt.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": "UTC",
        },
        "location": {
            "displayName": meeting.locationOrLink,
        },
        "attendees": [
            {
                "emailAddress": {"address": email, "name": email.split("@")[0]},
                "type": "required",
            }
            for email in meeting.attendeeEmails
            if email
        ],
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness",
    }
