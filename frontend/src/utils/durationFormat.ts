export type DurationUnit = 'min' | 'h' | 'j';

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440; // 24h calendaires

/**
 * Formate une durée stockée en minutes en libellé métier lisible (min, h, j).
 * Exemples : 0 -> "0 min", 45 -> "45 min", 120 -> "2 h", 90 -> "1 h 30", 4320 -> "3 j".
 */
export function formatDuration(minutes?: number | null): string {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  if (safe === 0) return '0 min';

  if (safe >= MINUTES_PER_DAY) {
    const days = Math.floor(safe / MINUTES_PER_DAY);
    const remHours = Math.floor((safe % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
    return remHours > 0 ? `${days} j ${remHours} h` : `${days} j`;
  }

  if (safe >= MINUTES_PER_HOUR) {
    const hours = Math.floor(safe / MINUTES_PER_HOUR);
    const remMins = safe % MINUTES_PER_HOUR;
    return remMins > 0 ? `${hours} h ${remMins}` : `${hours} h`;
  }

  return `${safe} min`;
}

/**
 * Décompose une durée en minutes en (valeur, unité) pour l'édition dans un champ avec sélecteur min | h | j.
 */
export function splitDurationForInput(minutes?: number | null): {
  value: number;
  unit: DurationUnit;
} {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  if (safe > 0 && safe % MINUTES_PER_DAY === 0) {
    return { value: safe / MINUTES_PER_DAY, unit: 'j' };
  }
  if (safe > 0 && safe % MINUTES_PER_HOUR === 0) {
    return { value: safe / MINUTES_PER_HOUR, unit: 'h' };
  }
  return { value: safe, unit: 'min' };
}

/**
 * Convertit une valeur + unité (min | h | j) en minutes pour le stockage.
 */
export function toDurationMinutes(value: number, unit: DurationUnit): number {
  const safe = Math.max(0, Math.round(Number(value) || 0));
  if (unit === 'j') return safe * MINUTES_PER_DAY;
  if (unit === 'h') return safe * MINUTES_PER_HOUR;
  return safe;
}
