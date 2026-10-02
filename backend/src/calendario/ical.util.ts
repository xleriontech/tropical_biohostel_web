/**
 * Utilidades iCal mínimas para sincronización de disponibilidad
 * (compatible con los feeds de Airbnb, Booking, Vrbo/Google Calendar).
 * Todo se maneja a granularidad de DÍA en rangos [desde, hasta).
 */

export interface Bloqueo {
  desde: string; // YYYY-MM-DD (check-in / inicio, inclusivo)
  hasta: string; // YYYY-MM-DD (check-out / fin, exclusivo)
  fuente: string;
}

const DAY = 86400000;

export function toDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key: string, n: number): string {
  return toDayKey(new Date(dayKeyToDate(key).getTime() + n * DAY));
}

/** ¿Se traslapan [aStart,aEnd) y [bStart,bEnd)? */
export function rangosSeTraslapan(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Une rangos traslapados o adyacentes. */
export function fusionarRangos(bloqueos: Bloqueo[]): Bloqueo[] {
  const sorted = [...bloqueos].sort((a, b) =>
    a.desde === b.desde ? (a.hasta < b.hasta ? -1 : 1) : a.desde < b.desde ? -1 : 1,
  );
  const out: Bloqueo[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && b.desde <= last.hasta) {
      if (b.hasta > last.hasta) last.hasta = b.hasta;
      if (!last.fuente.includes(b.fuente)) last.fuente = `${last.fuente} + ${b.fuente}`;
    } else {
      out.push({ ...b });
    }
  }
  return out;
}

function unfoldLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (/^[ \t]/.test(raw) && out.length > 0) out[out.length - 1] += raw.slice(1);
    else out.push(raw);
  }
  return out;
}

interface IcalDate {
  dayKey: string;
  isDateOnly: boolean;
}

/** Parsea DTSTART/DTEND/DUE en sus variantes (DATE, UTC con Z, flotante, TZID). */
function parseIcalDate(prop: string): IcalDate | null {
  const m = prop.match(/^([A-Z-]+)(;[^:]*)?:(.*)$/);
  if (!m) return null;
  const value = m[3].trim();
  const params = (m[2] || '').toUpperCase();
  // DATE: 20260115
  let d = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d || params.includes('VALUE=DATE')) {
    d = d || [ '', value.slice(0, 4), value.slice(4, 6), value.slice(6, 8) ];
    return { dayKey: `${d[1]}-${d[2]}-${d[3]}`, isDateOnly: true };
  }
  // DATE-TIME: 20260115T143000(Z)?
  const t = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!t) return null;
  // Para bloqueo por noches basta el día (en UTC si trae Z, si no se asume igual)
  return { dayKey: `${t[1]}-${t[2]}-${t[3]}`, isDateOnly: false };
}

function addDuration(dayKey: string, dur: string): string | null {
  // P[n]DT[n]H... solo nos importan los días (y semanas)
  const m = dur.match(/^P(?:(\d+)W)?(?:(\d+)D)?/);
  if (!m) return null;
  const days = (m[1] ? parseInt(m[1], 10) * 7 : 0) + (m[2] ? parseInt(m[2], 10) : 0);
  if (days <= 0) return null;
  return addDays(dayKey, days);
}

function expandRrule(startKey: string, rrule: string, maxUntilKey: string): string[] {
  // Soporte básico: FREQ=DAILY|WEEKLY con INTERVAL/COUNT/UNTIL
  const params: Record<string, string> = {};
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) params[k.trim().toUpperCase()] = v.trim().toUpperCase();
  }
  const step = params.FREQ === 'WEEKLY' ? 7 * (parseInt(params.INTERVAL || '1', 10) || 1) : parseInt(params.INTERVAL || '1', 10) || 1;
  if (params.FREQ !== 'DAILY' && params.FREQ !== 'WEEKLY') return [];
  const out: string[] = [];
  let cur = startKey;
  let count = params.COUNT ? parseInt(params.COUNT, 10) : 730;
  count = Math.min(isNaN(count) ? 730 : count, 730);
  let until = maxUntilKey;
  if (params.UNTIL) {
    const u = parseIcalDate(`DTSTART:${params.UNTIL}`);
    if (u) until = u.dayKey < until ? until : u.dayKey;
  }
  for (let i = 0; i < count && cur <= until; i++) {
    out.push(cur);
    cur = addDays(cur, step);
  }
  return out;
}

/** Parsea un .ics y devuelve bloqueos [desde,hasta) con la fuente indicada. */
export function parseIcs(text: string, fuente: string): Bloqueo[] {
  const bloqueos: Bloqueo[] = [];
  const lines = unfoldLines(text || '');

  let cur: Record<string, string> = {};
  let inEvent = false;
  const pushEvent = (e: Record<string, string>) => {
    if ((e.STATUS || '').toUpperCase() === 'CANCELLED') return;
    const s = e.DTSTART ? parseIcalDate(`DTSTART:${e.DTSTART}`) : null;
    if (!s) return;
    let ends: string[] = [];
    if (e.DTEND) {
      const en = parseIcalDate(`DTEND:${e.DTEND}`);
      if (en && en.dayKey > s.dayKey) ends = [en.dayKey];
      else if (en) ends = [addDays(s.dayKey, 1)];
    } else if (e.DURATION) {
      const en = addDuration(s.dayKey, e.DURATION);
      ends = [en || addDays(s.dayKey, 1)];
    } else {
      ends = [addDays(s.dayKey, 1)];
    }
    const rrule = e.RRULE;
    if (rrule) {
      const maxUntil = addDays(toDayKey(new Date()), 730);
      for (const occ of expandRrule(s.dayKey, rrule, maxUntil)) {
        const lenDays = Math.max(
          1,
          Math.round((dayKeyToDate(ends[0]).getTime() - dayKeyToDate(s.dayKey).getTime()) / DAY),
        );
        bloqueos.push({ desde: occ, hasta: addDays(occ, lenDays), fuente });
      }
    } else {
      bloqueos.push({ desde: s.dayKey, hasta: ends[0], fuente });
    }
  };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      cur = {};
    } else if (line === 'END:VEVENT') {
      if (inEvent) pushEvent(cur);
      inEvent = false;
      cur = {};
    } else if (inEvent) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const namePart = line.slice(0, idx);
        const name = namePart.split(';')[0].toUpperCase();
        if (['DTSTART', 'DTEND', 'DURATION', 'RRULE', 'STATUS', 'SUMMARY', 'UID'].includes(name)) {
          cur[name] = line.slice(idx + 1);
        }
      }
    }
  }
  return fusionarRangos(bloqueos);
}

/** Genera un .ics con los bloqueos (para pegar en Airbnb/Booking). Sin datos personales. */
export function buildIcs(propiedadNombre: string, bloqueos: Bloqueo[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TROPICAL BIOHOSTEL//Disponibilidad//ES',
    `X-WR-CALNAME:TROPICAL BIOHOSTEL - ${propiedadNombre}`,
  ];
  bloqueos.forEach((b, i) => {
    const from = b.desde.replace(/-/g, '');
    const to = b.hasta.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:tropical-${Date.now()}-${i}@plataforma`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${from}`,
      `DTEND;VALUE=DATE:${to}`,
      'SUMMARY:Reservado - TROPICAL BIOHOSTEL',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Etiqueta legible según el dominio del calendario externo. */
export function etiquetaFuente(url: string, i: number): string {
  const u = url.toLowerCase();
  if (u.includes('airbnb')) return 'Airbnb';
  if (u.includes('booking')) return 'Booking';
  if (u.includes('vrbo') || u.includes('homeaway')) return 'Vrbo';
  if (u.includes('google')) return 'Google Calendar';
  return `Calendario externo ${i + 1}`;
}
