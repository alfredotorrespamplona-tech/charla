// Íconos de la interfaz: dibujos de línea propios (24×24, trazo de 2, puntas redondas) que toman el color
// del texto. Reemplazan a los emojis: `iconize()` convierte cualquier emoji de un texto en su ícono, así las
// pantallas pueden seguir escribiendo «🔥 3» y se ve un ícono profesional y parejo en todos los teléfonos.

const NS = 'http://www.w3.org/2000/svg';
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="1.1" fill="currentColor" stroke="none"/>`;

export const ICONS = {
  back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16 9.8"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/>' + dot(12, 8),
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
  speaker: '<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12"/>',
  coin: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5.5c0 1.7 3.1 3 7 3s7-1.3 7-3V6.5M5 12v5.5c0 1.7 3.1 3 7 3s7-1.3 7-3V12"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  'star-fill': '<path fill="currentColor" d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5v-3a3.5 3.5 0 0 1 7 0v3"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5v-3a3.5 3.5 0 0 1 6.8-1.2"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' + dot(12, 12),
  wave: '<path d="M4 10v4M8 6.5v11M12 4v16M16 7.5v9M20 10.5v3"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-2.7 1.6-4.6 3-6.1.3 1.6 1 2.7 2.2 3.2C10.2 8.6 11.6 5.4 14 3c.4 3 1.7 4.8 3 6.4 1 1.3 1.5 2.9 1.5 4.6 0 4.3-2.8 7-6.5 7z"/>',
  alert: '<path d="M10.3 4.2 2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/>' + dot(12, 17),
  chat: '<path d="M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 3.5v-3.5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M8 9.5h8M8 13h5"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="m14.5 5.5 3 3"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0"/>' + dot(9, 9.5) + dot(15, 9.5),
  frown: '<circle cx="12" cy="12" r="9"/><path d="M8.5 16.2a4.5 4.5 0 0 1 7 0"/>' + dot(9, 9.5) + dot(15, 9.5),
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11.5l-2.5 4 2.5 4H5"/>',
  repeat: '<path d="m17 2.5 3 3-3 3"/><path d="M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3"/><path d="M20 12.5v1a5 5 0 0 1-5 5H4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  cards: '<rect x="8" y="3" width="12" height="15" rx="2.5"/><path d="M4.5 7.5v11A2.5 2.5 0 0 0 7 21h8.5"/>',
  book: '<path d="M5 19V5.5A2.5 2.5 0 0 1 7.5 3h12v13.5h-12A2.5 2.5 0 0 0 5 19a2.5 2.5 0 0 0 2.5 2.5h12"/><path d="M9 7.5h6.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 13.6a6.5 6.5 0 0 1 3.5 6.4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  chart: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="6" width="3" height="11" rx="1"/><rect x="15.5" y="13" width="3" height="4" rx="1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/>' + dot(8.5, 8.5) + dot(12, 12) + dot(15.5, 15.5),
  sparkles: '<path d="M11 4 12.8 9.2 18 11l-5.2 1.8L11 18l-1.8-5.2L4 11l5.2-1.8z"/><path d="M18.5 3v4M16.5 5h4M18 17v4M16 19h4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M8 14.5h8"/>' + dot(6.5, 10) + dot(10, 10) + dot(14, 10) + dot(17.5, 10),
  plane: '<path d="M10.5 13.5 4 11l1.5-1.5 7 .5 4.5-4.5c1-1 2.7-1.3 3.2-.7.6.5.3 2.2-.7 3.2L15 12.5l.5 7L14 21l-2.5-6.5L8 18v2.5L6.5 22 5 19l-3-1.5L3.5 16H6z"/>',
  luggage: '<rect x="5" y="7" width="14" height="13" rx="2.5"/><path d="M9 7V4.5h6V7M9.5 11v5M14.5 11v5M8 20v1M16 20v1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  play: '<path d="M7.5 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.7 4.1a.8.8 0 0 0-1.2.7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  puzzle: '<path d="M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19H5z"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/>',
  heartbreak: '<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/><path d="m12 7.2-1.5 3.3 3 2-1.5 3"/>',
  cap: '<path d="m2.5 9.5 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 11.6V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.4M21.5 9.5v5"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 4.5 4.5 5.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 5.5-4.5 9s4.5 4.5 4.5 9"/>',
  trash: '<path d="M4 6.5h16M9.5 6.5v-2h5v2M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-13M10 11v6M14 11v6"/>',
  coffee: '<path d="M4 9h12v5.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4 14.5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5V6M12 3.5V6"/>',
  laptop: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  utensils: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17.5 21V3c-2.2 1.2-3.5 3.6-3.5 7v4h3.5"/>',
  receipt: '<path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  shirt: '<path d="M8.5 3.5 4 6l-1.5 4.5 3 1.2v8.8h13v-8.8l3-1.2L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5v8h14v-8M12 8v12.5M12 8C10.5 4 7 4 7 6s3 2 5 2zm0 0c1.5-4 5-4 5-2s-3 2-5 2z"/>',
  dumbbell: '<rect x="4.5" y="6" width="3.5" height="12" rx="1"/><rect x="16" y="6" width="3.5" height="12" rx="1"/><path d="M8 12h8M2.5 9.5v5M21.5 9.5v5"/>',
  film: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M8 4.5v15M16 4.5v15M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4"/>' + dot(12, 17),
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.3s-.5-.8-.5-1.3c0-.9.7-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-3.5-4-7-9-7z"/>' + dot(7.5, 11) + dot(10, 7) + dot(15, 7.5),
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9M10 20.5v-6h4v6"/>',
  archive: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5M10 12.5h4"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  plug: '<path d="M9 3v4M15 3v4M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0zM12 16v5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="m3 3 18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  idcard: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4.5M14 13.5h3"/>',
  bed: '<path d="M3 19.5V6M3 12.5h18v7M21 16H3"/><path d="M6.5 12.5v-2A1.5 1.5 0 0 1 8 9h2.5a1.5 1.5 0 0 1 1.5 1.5v2"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 8.8-8.8M16.5 6.5 19 9M14 9l2 2"/>',
  droplet: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  car: '<path d="M5 16.5H3.5v-4l2-5a1.5 1.5 0 0 1 1.4-1h10.2a1.5 1.5 0 0 1 1.4 1l2 5v4H19M3.5 12.5h17M9 16.5h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  tree: '<path d="M12 3a5.5 5.5 0 0 0-5 7.8A4.5 4.5 0 0 0 9 19h6a4.5 4.5 0 0 0 2-8.2A5.5 5.5 0 0 0 12 3z"/><path d="M12 12v9M9.5 14.5 12 17l2.5-2.5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="m5 19 7-7"/>',
  paw: '<circle cx="6.5" cy="10.5" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="17.8" cy="10.5" r="1.8"/><path d="M12 12c-2.5 0-5 3-5 5.5C7 19 8.2 20 9.7 20c1 0 1.5-.5 2.3-.5s1.3.5 2.3.5c1.5 0 2.7-1 2.7-2.5 0-2.5-2.5-5.5-5-5.5z"/>',
  health: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  wallet: '<rect x="3" y="6.5" width="18" height="13.5" rx="2.5"/><path d="M16 13.2h1.5M6 6.5 15.5 3.5l1.5 3"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/>',
  scale: '<path d="M12 4v16M7.5 20h9M5 7.5h14"/><path d="M5 7.5 2.5 13.5a2.5 2.2 0 0 0 5 0zM19 7.5l-2.5 6a2.5 2.2 0 0 0 5 0z"/>',
  cart: '<path d="M3 4h2.5l2.2 11a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.3"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  landmark: '<path d="M3 21h18M12 3l8.5 5h-17z"/><path d="M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M4.5 18h15"/>',
  ticket: '<path d="M3 8.5v-2A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v2a3.5 3.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-2a3.5 3.5 0 0 0 0-7z"/><path d="M14 5v2.5M14 11v2M14 16.5V19"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9a4.75 4.75 0 0 1-.5 9.5z"/>',
  share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17-3.5-4.5"/>',
  gamepad: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 11v3M5.5 12.5h3"/>' + dot(15.5, 12) + dot(18, 14),
  building: '<rect x="4" y="3" width="10" height="18" rx="1"/><path d="M14 9h5a1 1 0 0 1 1 1v11M2.5 21h19M7.5 7h3M7.5 11h3M7.5 15h3"/>',
  scissors: '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/>',
  send: '<path d="M21 3 3.5 10.5l7 3 3 7z"/><path d="m10.5 13.5 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 8.5"/>',
  // v44: íconos propios para que cada sección tenga el suyo (antes varias compartían uno).
  brain: '<path d="M12 5.5A3 3 0 0 0 6.6 4.3 3 3 0 0 0 4.5 9a3.5 3.5 0 0 0 .4 6.3A3.2 3.2 0 0 0 9 19.8a3 3 0 0 0 3-1.3z"/><path d="M12 5.5a3 3 0 0 1 5.4-1.2A3 3 0 0 1 19.5 9a3.5 3.5 0 0 1-.4 6.3 3.2 3.2 0 0 1-4.1 4.5 3 3 0 0 1-3-1.3zM12 5.5v13M8.5 10a2.5 2.5 0 0 0 3.5 0M15.5 13.5a2.5 2.5 0 0 1-3.5 0"/>',
  notebook: '<rect x="5.5" y="3" width="14" height="18" rx="2.5"/><path d="M9.5 3v18M3.5 7.5h4M3.5 12h4M3.5 16.5h4M13 8h3.5"/>',
  blocks: '<rect x="3" y="13.5" width="8" height="7" rx="1.5"/><rect x="13" y="13.5" width="8" height="7" rx="1.5"/><rect x="8" y="4" width="8" height="7" rx="1.5"/>',
  turtle: '<path d="M4 15.5a7.5 7.5 0 0 1 15 0z"/><path d="M19 15.5h1a1.8 1.8 0 0 0 0-3.6h-1.4M7 15.5v3M16 15.5v3M8.5 9.8l3 2.7 3-2.7M11.5 12.5v3"/>',
  fast: '<path d="m4 6 6.5 6L4 18M12.5 6l6.5 6-6.5 6"/>',
  speak: '<circle cx="9" cy="8" r="3.8"/><path d="M2.8 20.5a6.2 6.2 0 0 1 12.4 0M17.3 5.5a4 4 0 0 1 0 5.5M19.8 3a7.5 7.5 0 0 1 0 10.5"/>',
  books: '<rect x="3" y="4" width="4.5" height="16.5" rx="1"/><rect x="8.5" y="4" width="4.5" height="16.5" rx="1"/><path d="m14.6 5.4 3.9-1 3.8 15.2-3.9 1z"/><path d="M3 8h4.5M8.5 8H13M3 16.5h4.5M8.5 16.5H13"/>',
  mic2: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/><path d="M3 8v3M21 8v3"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
  rocket: '<path d="M12 3c3.5 2 5 5.5 5 9.5l-2 3h-6l-2-3C7 8.5 8.5 5 12 3z"/><circle cx="12" cy="10" r="1.8"/><path d="M9 15.5 6.5 18v2.5L9.5 19M15 15.5l2.5 2.5v2.5L14.5 19M12 18v3"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V10M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5"/>',
  rise: '<path d="M6 18 18 6M9 6h9v9"/>',
  fall: '<path d="M6 6l12 12M18 9v9H9"/>',
  copy: '<rect x="8" y="8" width="12.5" height="12.5" rx="2.5"/><path d="M16 8V5.5A2 2 0 0 0 14 3.5H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8"/>',
};

// Emoji → ícono. Varios emojis de comida, ropa, etc. comparten el mismo ícono.
const MAP = {
  '←': 'back', '✕': 'close', '❌': 'x-circle', '✓': 'check', '✅': 'check-circle', '⬜': 'circle', 'ⓘ': 'info', 'ℹ': 'info',
  '🎤': 'mic', '🎙': 'mic', '🔊': 'speaker', '🪙': 'coin', '⭐': 'star-fill', '★': 'star-fill', '☆': 'star', '🌟': 'star',
  '🔒': 'lock', '🔓': 'unlock', '💡': 'bulb', '🧊': 'shield', '🎯': 'target', '🗣': 'speak', '🔥': 'flame', '⚠': 'alert',
  '💬': 'chat', '💭': 'chat', '📜': 'doc', '📋': 'doc', '📰': 'doc', '↩': 'undo', '📝': 'pencil', '✏': 'pencil', '✍': 'pencil',
  '👋': 'smile', '🙂': 'smile', '🧸': 'smile', '😕': 'frown', '😤': 'frown', '😱': 'frown', '😬': 'frown', '😴': 'bed',
  '🙋': 'user', '🧑': 'user', '👨': 'user', '👩': 'user', '👧': 'user', '🤲': 'heart',
  '🗺': 'map', '🧭': 'compass', '🏁': 'flag', '🚩': 'flag', '🔁': 'repeat', '🔄': 'repeat', '🌐': 'globe', '🌍': 'globe',
  '💼': 'briefcase', '🧠': 'brain', '📒': 'notebook', '📚': 'books', '📖': 'book', '👥': 'users', '👪': 'users', '🤝': 'users',
  '📊': 'chart', '💌': 'mail', '🎲': 'dice', '🎉': 'sparkles', '🎈': 'sparkles', '✨': 'sparkles',
  '⌨': 'keyboard', '✈': 'plane', '🧳': 'luggage', '🎒': 'luggage', '📅': 'calendar', '⚙': 'sliders',
  '⏸': 'pause', '▶': 'play', '⏯': 'play', '⏹': 'stop', '🧩': 'puzzle', '🧱': 'blocks', '🔮': 'sparkles', '⏪': 'undo', '🔗': 'plug',
  '💛': 'heart', '💕': 'heart', '💔': 'heartbreak', '🏫': 'cap', '🎓': 'cap', '🧑‍🏫': 'cap',
  '⏳': 'hourglass', '🗑': 'trash', '🧽': 'droplet', '☕': 'coffee', '🥤': 'coffee', '💻': 'laptop', '🖥': 'laptop', '🤖': 'laptop',
  '⏰': 'clock', '🕘': 'clock', '☀': 'sun',
  '🍔': 'utensils', '🍳': 'utensils', '🍲': 'utensils', '🍜': 'utensils', '🌮': 'utensils', '🍝': 'utensils', '🥐': 'utensils',
  '🍰': 'utensils', '🍫': 'utensils', '🥗': 'utensils', '🧀': 'utensils', '🥜': 'utensils',
  '🧾': 'receipt', '📞': 'phone', '📱': 'phone', '👕': 'shirt', '👗': 'shirt', '👟': 'shirt', '🎁': 'gift',
  '💪': 'dumbbell', '🏋': 'dumbbell', '🏃': 'dumbbell', '⚽': 'dumbbell',
  '🎬': 'film', '🎭': 'film', '📸': 'camera', '❓': 'question', '🎨': 'palette', '🎵': 'music', '🎸': 'music',
  '🏠': 'home', '🏡': 'home', '🏘': 'home', '🛋': 'home', '🗄': 'archive', '📦': 'archive', '☰': 'menu', '🏆': 'trophy',
  '⬆': 'arrow-up', '🪜': 'arrow-up', '🔌': 'plug', '👁': 'eye', '🤫': 'eye-off', '⚡': 'zap',
  '🛂': 'idcard', '🪪': 'idcard', '🏨': 'bed', '🔑': 'key', '🚿': 'droplet', '🚕': 'car', '🚗': 'car', '🚌': 'car',
  '🌳': 'tree', '🎄': 'tree', '🌱': 'leaf', '💐': 'leaf', '🧘': 'leaf', '🏝': 'leaf', '🐕': 'paw', '🐶': 'paw', '🐾': 'paw',
  '🩺': 'health', '🤒': 'health', '💊': 'health', '👛': 'wallet', '💰': 'wallet', '💾': 'archive', '💳': 'card', '🏦': 'landmark', '🏛': 'landmark',
  '📏': 'ruler', '⚖': 'scale', '🛒': 'cart', '🛍': 'bag', '🏬': 'bag', '🔍': 'search', '🔎': 'search', '🎫': 'ticket',
  '📍': 'pin', '🌧': 'cloud', '🌦': 'cloud', '📤': 'share', '🐢': 'turtle', '🎮': 'gamepad', '🏙': 'building',
  '💈': 'scissors', '✂': 'scissors',
  '🎧': 'headphones', '🚀': 'rocket', '⏱': 'stopwatch', '🐇': 'fast', '🙈': 'eye-off', '😄': 'smile', '😠': 'frown', '↗': 'rise', '↘': 'fall', '👍': 'smile', '⏩': 'play',
  '➕': 'plus', '📇': 'cards', '📂': 'archive', '🖼': 'image', '🆕': 'sparkles',
};

const EMOJI_RE = /(?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*|[←✓✕★☆⬜ⓘ☰↩⏹⏸⏯]️?)/gu;
const KEEP = new Set(['©', '®', '™']); // símbolos de texto que no son íconos

export function iconName(emoji) {
  const bare = emoji.replace(/️/g, '');
  return MAP[emoji] || MAP[bare] || MAP[bare.split('‍')[0]] || null;
}

// <svg> de un ícono por nombre o por emoji.
export function icon(nameOrEmoji, cls = '') {
  const name = ICONS[nameOrEmoji] ? nameOrEmoji : iconName(nameOrEmoji) || 'sparkles';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `ic ic-${name}${cls ? ' ' + cls : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICONS[name];
  return svg;
}

export function hasEmoji(s) {
  EMOJI_RE.lastIndex = 0;
  const yes = EMOJI_RE.test(s);
  EMOJI_RE.lastIndex = 0; // matchAll copia esta posición: si no se reinicia, se salta el primer emoji
  return yes;
}

// Texto → nodos, con cada emoji cambiado por su ícono.
export function iconize(text) {
  const s = String(text);
  if (!hasEmoji(s)) return [document.createTextNode(s)];
  const out = [];
  let last = 0;
  for (const m of s.matchAll(EMOJI_RE)) {
    if (KEEP.has(m[0])) continue;
    if (m.index > last) out.push(document.createTextNode(s.slice(last, m.index)));
    out.push(icon(m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(document.createTextNode(s.slice(last)));
  return out;
}

// Quita los emojis (para atributos y <option>, donde no caben íconos).
export function stripEmoji(text) {
  return String(text).replace(EMOJI_RE, m => KEEP.has(m) ? m : '').replace(/\s{2,}/g, ' ').trim();
}
