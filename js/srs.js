// Repaso espaciado (cajas de Leitner): cada palabra o frase vuelve justo antes de que se olvide.
// La técnica con más respaldo para fijar vocabulario es recordar de memoria (no solo volver a leer) con
// repasos cada vez más separados. Aquí cada acierto sin ayuda pasa la tarjeta a la caja siguiente y
// aleja el próximo repaso (mañana, 3 días, una semana, 2 semanas, un mes…); un fallo la devuelve atrás.
// Sin dependencias: se prueba con node.

export const DAY = 86400000;
// Días hasta el próximo repaso según la caja (0 = nueva o recién fallada).
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];
export const MAX_BOX = INTERVALS.length - 1;

// Medianoche local de hoy + n días (así «toca hoy» vale para todo el día y respeta el horario de verano).
export function dayStart(now = Date.now(), plusDays = 0) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + plusDays).getTime();
}

// Caja de la tarjeta. Las guardadas antes de esta versión no tienen caja: se deduce de su familiaridad.
export function boxOf(v) {
  if (Number.isInteger(v.box)) return Math.max(0, Math.min(MAX_BOX, v.box));
  const s = v.score || 0;
  return s >= 85 ? 4 : s >= 50 ? 2 : s >= 25 ? 1 : 0;
}

// Cuándo toca. Las antiguas sin fecha: desde su último repaso (o uso) más el intervalo de su caja.
export function dueOf(v) {
  if (typeof v.due === 'number') return v.due;
  const base = v.lastReviewed || v.lastUsed || 0;
  return base ? dayStart(base, INTERVALS[boxOf(v)]) : 0;
}

export const isActive = v => !v.noReview && !v.archived;
export const isDue = (v, now = Date.now()) => isActive(v) && dueOf(v) <= now;

// Nuevo estado tras responder (solo la primera respuesta de la sesión; el segundo intento es práctica).
//  right: acierto sin ayuda → caja siguiente, intervalo más largo.
//  hint:  acierto con ayuda → misma caja, la mitad del intervalo (mínimo mañana).
//  wrong: fallo → baja 2 cajas y vuelve mañana (y hoy mismo se repite una vez al final, con ayuda).
export function schedule(v, outcome, now = Date.now()) {
  const b = boxOf(v);
  let box = b, days;
  if (outcome === 'right') { box = Math.min(MAX_BOX, b + 1); days = INTERVALS[box]; }
  else if (outcome === 'hint') days = Math.max(1, Math.round(INTERVALS[b] / 2));
  else { box = Math.max(0, b - 2); days = 1; }
  return { box, due: dayStart(now, days), days, reps: (v.reps || 0) + 1, lapses: (v.lapses || 0) + (outcome === 'wrong' ? 1 : 0) };
}

// Las que tocan hoy: primero las más atrasadas, a igual fecha las menos conocidas.
export function dueItems(vocab, now = Date.now()) {
  return vocab.filter(v => isDue(v, now)).sort((a, b) => (dueOf(a) - dueOf(b)) || ((a.score || 0) - (b.score || 0)));
}

export function dueCount(vocab, now = Date.now()) { return vocab.filter(v => isDue(v, now)).length; }

// Próximo repaso cuando ya está al día: { at, count } (cuántas tocan ese mismo día).
export function nextDue(vocab, now = Date.now()) {
  const future = vocab.filter(isActive).map(dueOf).filter(t => t > now);
  if (!future.length) return null;
  const at = Math.min(...future);
  return { at, count: future.filter(t => dayStart(t) === dayStart(at)).length };
}

// «mañana», «en 3 días», «en 2 semanas»… para explicar cuándo vuelve.
export function whenLabel(at, now = Date.now()) {
  const d = Math.round((dayStart(at) - dayStart(now)) / DAY);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d < 14) return `en ${d} días`;
  if (d < 60) return `en ${Math.round(d / 7)} semanas`;
  return `en ${Math.round(d / 30)} meses`;
}
