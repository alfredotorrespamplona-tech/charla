// «Una sola compañera»: en todas las charlas habla Amy, dibujada por código (avatar.js), con voz de mujer
// y los labios al ritmo de la voz. Cada lugar conserva su papel (barista, médica, recepcionista…):
// Amy lo interpreta. Se apaga en Ajustes → Charlas y vuelven las compañeras con sus imágenes; los papeles
// de hombre los sigue haciendo Amy, porque la voz de la app es de mujer (nunca aparece un hombre).
import { CHARACTERS } from './data.js';

export const SOLO = {
  name: 'Amy',
  sex: 'female',
  voice: { pitch: 1.05, gender: 'female' },
  tts: 'af_heart',
  look: { skin: '#f7d6ba', hair: '#4a2a1c', hairStyle: 'long', shirt: '#2d7a8c', bg: '#f6dfd6' },
  images: undefined,
};

// Los papeles de los personajes hombres, dichos en femenino (Amy los hace).
const FEMININE_TITLE = {
  tom: 'profesora jubilada, clienta habitual', jack: 'piloto', david: 'viajera de negocios',
  carlos: 'ingeniera de software, tu compañera', leo: 'estudiante y música callejera', sam: 'médica familiar',
  dan: 'policía de tránsito', marcus: 'entrenadora personal', ben: 'anfitriona de la fiesta', joe: 'cajera',
  omar: 'vecina', victor: 'empleada del banco', paul: 'profesora', tony: 'peluquera',
  lucy: 'ilustradora, amiga de la anfitriona',
};
const herProfession = p => String(p || '').replace(/\bhis\b/g, 'her').replace(/\bhim\b/g, 'her').replace(/\bbarber\b/g, 'hairdresser');

const KEYS = [...Object.keys(SOLO), 'title', 'profession', 'interests'];

export function applyCast(on) {
  for (const c of Object.values(CHARACTERS)) {
    if (!c.original) c.original = Object.fromEntries(KEYS.map(k => [k, c[k]]));
    const o = c.original;
    const amy = !!on || o.sex !== 'female';
    Object.assign(c, amy ? { ...SOLO, title: FEMININE_TITLE[c.id] || o.title, profession: herProfession(o.profession),
      interests: (o.interests || []).map(herProfession) } : o);
    c.solo = amy;
  }
}

// Nombres de los personajes de un lugar, sin repetir (con Amy en todos sale una sola vez).
export const castNames = ids => [...new Set(ids.map(id => CHARACTERS[id]?.name).filter(Boolean))].join(' · ');

// Debajo del nombre: el papel que hace Amy, o la edad y el oficio del personaje.
export const roleLine = c => c.solo ? `hace de ${c.title || c.profession}` : `${c.age} años · ${c.title || c.profession}`;
