// Ayudas de interfaz: crear elementos, hojas inferiores, avisos.
import { icon, iconize, stripEmoji, hasEmoji } from './icons.js';
import * as store from './store.js';
export { icon };

// En <option> y similares no caben íconos: ahí se quitan los emojis.
const PLAIN = new Set(['option', 'textarea', 'title', 'style', 'script']);
const PLAIN_ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt']);

export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : PLAIN_ATTRS.has(k) ? stripEmoji(v) : v);
  }
  const plain = PLAIN.has(name);
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    if (c instanceof Node) el.appendChild(c);
    else if (plain) el.appendChild(document.createTextNode(stripEmoji(c)));
    else el.append(...iconize(c));
  }
  return el;
}

// Como textContent, pero los emojis del texto se ven como íconos.
export function setText(el, text) {
  if (!hasEmoji(String(text ?? ''))) { el.textContent = text ?? ''; return; }
  el.replaceChildren(...iconize(text));
}

export function mount(el) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(el);
  window.scrollTo(0, 0);
}

let sheetEl = null;
export function sheet(content, { onClose } = {}) {
  closeSheet();
  const panel = h('div.sheet', { role: 'dialog', 'aria-modal': 'true' },
    h('button.sheet-close', { 'aria-label': 'Cerrar', onclick: () => closeSheet() }, icon('close')),
    content);
  sheetEl = h('div.sheet-backdrop', { onclick: e => { if (e.target === sheetEl) closeSheet(); } }, panel);
  sheetEl._onClose = onClose;
  document.body.appendChild(sheetEl);
  const el = sheetEl;
  requestAnimationFrame(() => el.classList.add('open'));
  return panel;
}
export function closeSheet() {
  if (!sheetEl) return;
  const el = sheetEl;
  sheetEl = null;
  el._onClose?.();
  el.classList.remove('open');
  setTimeout(() => el.remove(), 200);
}

// Vibración corta para acertar, fallar o lograr algo (se apaga en Ajustes).
const BUZZ = { tap: 12, good: [18, 40, 28], bad: [60, 50, 60], star: [15, 30, 15, 30, 45] };
export function buzz(kind = 'tap') {
  try {
    if (store.get().settings.haptics === false) return;
    navigator.vibrate?.(BUZZ[kind] ?? BUZZ.tap);
  } catch {}
}

export function toast(msg, kind = '') {
  if (kind === 'good' || kind === 'bad') buzz(kind);
  const t = h('div.toast', { class: kind }, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function spinner(text = '') { return h('div.loading', {}, h('span.spin'), text ? h('span', {}, text) : null); }

export function stars(n, size = '') {
  return h('div.stars', { class: size }, [0, 1, 2].map(i => h('span.star', { class: i < n ? 'on' : '' }, icon('star-fill'))));
}

export function progressBar(frac, color) {
  return h('div.bar', {}, h('div.bar-fill', { style: { width: Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%', background: color || '' } }));
}

// Fondo de un lugar: su ilustración si existe, si no, su degradado. `shade` oscurece abajo para leer texto.
export function placeBackground(place, { shade = false } = {}) {
  const grad = `linear-gradient(135deg, ${place.gradient[0]}, ${place.gradient[1]})`;
  if (!place.image) return grad;
  const veil = shade ? 'linear-gradient(to top, rgba(0,0,0,.62), rgba(0,0,0,.05) 62%), ' : '';
  return `${veil}url("${place.image}") center / cover no-repeat, ${grad}`;
}

// Ícono propio de cada lugar (hecho con ChatGPT); con candado si está cerrado.
export function placeIcon(place, { locked = false, cls = '' } = {}) {
  if (locked) return h('span.place-icon.locked', { class: cls }, icon('lock'));
  if (!place.badge) return h('span.place-icon.line', { class: cls }, icon(place.emoji));
  return h('img.place-icon', { class: cls, src: place.badge, alt: '', draggable: 'false' });
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Convierte «palabras» en resaltado.
export function richText(s) {
  return escapeHtml(s).replace(/«([^»]+)»/g, '<b class="en">$1</b>');
}
