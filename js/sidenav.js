// Menú lateral para computadora (v48). En pantallas anchas (1024 px o más) queda fijo a la izquierda; en el
// teléfono no se ve (styles.css). Se esconde durante una charla y un simulacro para no salir a mitad sin querer.
import { h, setText } from './ui.js';

// Mismos nombres que las tarjetas de la portada (dashboard.js) y las mismas pantallas (app.js → routes()).
export const SIDE_NAV = [
  { title: '', items: [
    { key: 'cover', icon: '🏠', label: 'Portada' },
    { key: 'map', icon: '🗺️', label: 'Hablar (mapa)' },
  ] },
  { title: 'Escuchar y hablar', items: [
    { key: 'listen', icon: '🎧', label: 'Escuchar' },
    { key: 'mock', icon: '💼', label: 'Simulacro' },
    { key: 'ofertas', icon: '📄', label: 'Su oferta' },
    { key: 'tecnicas', icon: '🚀', label: 'Técnicas' },
  ] },
  { title: 'Oírse y escribir', items: [
    { key: 'grabarse', icon: '🎙', label: 'Grabarse' },
    { key: 'diario', icon: '✍', label: 'Diario' },
    { key: 'sonidos', icon: '👂', label: 'Sonidos parecidos' },
  ] },
  { title: 'Palabras y frases', items: [
    { key: 'mil', icon: '📇', label: 'Mil palabras' },
    { key: 'review', icon: '🧠', label: 'Repaso' },
    { key: 'essentials', icon: '📚', label: 'Frases' },
    { key: 'vocab', icon: '📖', label: 'Vocabulario' },
  ] },
  { title: 'Gramática', items: [
    { key: 'grammar', icon: '🧱', label: 'Gramática' },
    { key: 'levels', icon: '🎓', label: 'Por nivel' },
  ] },
  { title: 'Su progreso', items: [
    { key: 'nivel', icon: '📏', label: 'Su nivel' },
    { key: 'errors', icon: '📒', label: 'Mis errores' },
    { key: 'stats', icon: '📊', label: 'Estadísticas' },
    { key: 'settings', icon: '⚙️', label: 'Ajustes' },
  ] },
];
export const SIDE_KEYS = SIDE_NAV.flatMap(g => g.items.map(i => i.key));

let current = '';
// Marca en el menú la sección abierta (la llama app.js cada vez que se abre una pantalla del menú).
export function markNav(key) {
  if (!SIDE_KEYS.includes(key)) return;
  current = key;
  const nav = globalThis.document?.getElementById('side-nav');
  nav?.querySelectorAll('.side-item').forEach(b => b.classList.toggle('active', b.dataset.key === key));
}

// Arma el menú una sola vez. routes[key]() abre cada pantalla; before() corta la voz que esté sonando.
export function buildSideNav(routes, { before = () => {}, version = '' } = {}) {
  const doc = globalThis.document;
  if (!doc || doc.getElementById('side-nav')) return null;
  const item = it => {
    const b = h('button.side-item', { 'data-key': it.key, onclick: () => { before(); routes[it.key]?.(); } });
    setText(b, `${it.icon} ${it.label}`);
    if (it.key === current) b.classList.add('active');
    return b;
  };
  const nav = h('nav.side-nav', { id: 'side-nav', 'aria-label': 'Secciones' },
    h('div.side-brand', {}, h('img', { src: 'icons/icon-192.png', alt: '', width: 36, height: 36 }), h('b', {}, 'Charla')),
    SIDE_NAV.map(g => h('div.side-group', {}, g.title ? h('small.side-title', {}, g.title) : null, g.items.map(item))),
    version ? h('small.side-version', {}, version) : null);
  doc.body.insertBefore(nav, doc.body.firstChild);
  return nav;
}
