// Avatar 2D.
//  · Amy (modo «una sola compañera», el de siempre): dibujada aquí por código, con labios que siguen las
//    sílabas de lo que dice (setMouth), parpadeo y gestos. Es liviana: solo se anima mientras habla.
//  · Si no: las imágenes de cada personaje (ChatGPT) o, si faltan, un dibujo simple.
// Imágenes: avatars/<id>/neutral, talk, talk2 (opcional), blink, happy (opcional); se declaran en data.js.
import { REST } from './lipsync.js';

let uid = 0;

export class Avatar {
  constructor(container, character, opts = {}) {
    this.static = !!opts.static;
    this.el = container;
    this.c = character;
    this.mode = 'svg';
    this.level = 0;
    this.mood = 0.3;
    this.blinkTimer = null;
    this.raf = 0;
    this.el.innerHTML = '';
    this.el.classList.add('avatar');
    if (character.solo) {
      this.mode = 'solo';
      this.drawSolo();
      if (!this.static) this.startBlink();
      return;
    }
    const ready = this.static ? Promise.resolve(false) : this.tryImages();
    ready.then(ok => { if (!ok) this.drawSvg(); if (!this.static) this.startBlink(); });
  }

  // Las imágenes se declaran en data.js: images: { ext: 'webp', frames: ['neutral', 'talk', 'blink', 'happy'] }
  async tryImages() {
    const conf = this.c.images;
    if (!conf || !conf.frames?.includes('neutral')) return false;
    const base = `avatars/${this.c.id}/`;
    this.mode = 'img';
    this.frames = {};
    for (const f of conf.frames) this.frames[f] = `${base}${f}.${conf.ext || 'png'}`;
    // Todas las caras quedan una encima de otra y solo se muestra una. Cambiar de cara es solo
    // cambiar cuál se ve (no se vuelve a decodificar ni a pintar la imagen): mucho más liviano en el teléfono.
    this.imgs = {};
    const box = document.createElement('div');
    box.className = 'avatar-frames';
    await Promise.all(Object.entries(this.frames).map(([name, src]) => new Promise(r => {
      const i = new Image();
      i.className = 'avatar-img';
      i.alt = name === 'neutral' ? this.c.name : '';
      i.decoding = 'async';
      i.onload = i.onerror = r;
      i.src = src;
      this.imgs[name] = i;
      box.appendChild(i);
    })));
    this.el.appendChild(box);
    this.shown = null;
    this.show('neutral');
    return true;
  }

  // Muestra una cara (neutral, talk, talk2, blink, happy) solo si cambió.
  show(name) {
    if (!this.imgs[name]) name = 'neutral';
    if (name === this.shown) return;
    this.imgs[this.shown]?.classList.remove('on');
    this.imgs[name].classList.add('on');
    this.shown = name;
  }

  // ---------------- Amy ----------------
  drawSolo() {
    const id = `amy${++uid}`;
    const L = this.c.look;
    this.el.innerHTML = `
<svg viewBox="0 0 200 230" class="avatar-svg avatar-solo" role="img" aria-label="${this.c.name}">
  <defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b3423"/><stop offset="1" stop-color="#2f1a11"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d6ba"/><stop offset="1" stop-color="#efc29f"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.shirt}"/><stop offset="1" stop-color="#1d4f5c"/></linearGradient>
    <clipPath id="${id}m"><path class="am-clip"/></clipPath>
  </defs>
  <path d="M50 96 C42 150 38 196 52 230 L148 230 C162 196 158 150 150 96 Z" fill="url(#${id}h)"/>
  <path d="M26 232 C30 198 58 182 100 182 C142 182 170 198 174 232 Z" fill="url(#${id}t)"/>
  <path d="M86 148 L86 184 Q100 196 114 184 L114 148 Z" fill="#e9b893"/>
  <path d="M86 152 Q100 168 114 152 L114 166 Q100 174 86 166 Z" fill="#d79f7b" opacity=".55"/>
  <path d="M80 183 Q100 206 120 183 Q110 189 100 189 Q90 189 80 183 Z" fill="#e9b893"/>
  <path d="M74 186 Q100 214 126 186" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none"/>
  <g class="am-head">
    <ellipse cx="53" cy="108" rx="7.5" ry="11.5" fill="#efc29f"/>
    <ellipse cx="147" cy="108" rx="7.5" ry="11.5" fill="#efc29f"/>
    <circle cx="53" cy="122" r="2.8" fill="#e9c46a"/><circle cx="147" cy="122" r="2.8" fill="#e9c46a"/>
    <path d="M54 96 C54 60 74 44 100 44 C126 44 146 60 146 96 C146 128 132 152 100 160 C68 152 54 128 54 96 Z" fill="url(#${id}s)"/>
    <path d="M49 104 C44 58 70 32 102 32 C136 32 158 58 151 106 C148 88 142 76 134 67 C118 72 90 64 78 50 C74 64 64 78 55 86 C52 92 50 98 49 104 Z" fill="url(#${id}h)"/>
    <path d="M78 50 C90 60 112 66 134 67" stroke="#7a4a33" stroke-width="2" fill="none" opacity=".5"/>
    <path class="am-brow-l" d="M67 88 Q78 81 89 86" stroke="#4a2a1c" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path class="am-brow-r" d="M111 86 Q122 81 133 88" stroke="#4a2a1c" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <g class="am-eyes">
      <g class="am-eye"><ellipse cx="79" cy="101" rx="8.6" ry="6" fill="#fff"/><circle cx="79.5" cy="101.5" r="4.7" fill="#6b4423"/><circle cx="79.5" cy="101.5" r="2.2" fill="#1d120c"/><circle cx="81.2" cy="99.8" r="1.4" fill="#fff"/>
        <path d="M70 100 Q79 92.5 88.4 99.5" stroke="#2b1a12" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M70.5 99.6 L67.6 97.6" stroke="#2b1a12" stroke-width="1.6" stroke-linecap="round"/></g>
      <g class="am-eye"><ellipse cx="121" cy="101" rx="8.6" ry="6" fill="#fff"/><circle cx="120.5" cy="101.5" r="4.7" fill="#6b4423"/><circle cx="120.5" cy="101.5" r="2.2" fill="#1d120c"/><circle cx="122.2" cy="99.8" r="1.4" fill="#fff"/>
        <path d="M111.6 99.5 Q121 92.5 130 100" stroke="#2b1a12" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M129.5 99.6 L132.4 97.6" stroke="#2b1a12" stroke-width="1.6" stroke-linecap="round"/></g>
    </g>
    <path d="M100 104 C98.5 113 96 119 98.5 122.5 C100.5 124 103.5 123.4 105 121.4" stroke="#c98d6a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="69" cy="124" rx="9" ry="5" fill="#f08080" opacity=".22"/>
    <ellipse cx="131" cy="124" rx="9" ry="5" fill="#f08080" opacity=".22"/>
    <g class="am-mouth">
      <path class="am-inner" fill="#5e1a24" stroke="#8a3440" stroke-width="1" stroke-linejoin="round"/>
      <g clip-path="url(#${id}m)">
        <rect class="am-teeth" x="85" width="30" rx="2" fill="#fbf7f2"/>
        <ellipse class="am-tongue" cx="100" fill="#d4606c"/>
      </g>
      <path class="am-upper" fill="#c4505c"/>
      <path class="am-lower" fill="#d4676f"/>
      <path class="am-shine" fill="#fff" opacity=".22"/>
    </g>
  </g>
</svg>`;
    const q = s => this.el.querySelector(s);
    this.svg = q('svg');
    this.headEl = q('.am-head');
    this.eyes = q('.am-eyes');
    this.parts = { inner: q('.am-inner'), clip: q('.am-clip'), teeth: q('.am-teeth'), tongue: q('.am-tongue'), upper: q('.am-upper'), lower: q('.am-lower'), shine: q('.am-shine') };
    this.browL = q('.am-brow-l'); this.browR = q('.am-brow-r');
    this.cur = { ...REST }; this.target = { ...REST };
    this.talk = 0; this.lastMouth = 0;
    this.paintMouth();
    this.setMood(this.mood);
  }

  // Dibuja los labios con la forma actual (abierta, estirada, redonda) y la sonrisa del ánimo.
  paintMouth() {
    const p = this.parts;
    if (!p) return;
    const d = mouthGeometry(this.cur, Math.max(-1, Math.min(1, this.mood)));
    p.inner.setAttribute('d', d.inner);
    p.clip.setAttribute('d', d.inner);
    p.upper.setAttribute('d', d.upper);
    p.lower.setAttribute('d', d.lower);
    p.shine.setAttribute('d', d.shine);
    p.teeth.setAttribute('y', d.teethY.toFixed(1));
    p.teeth.setAttribute('height', d.teethH.toFixed(1));
    p.tongue.setAttribute('cy', d.tongueY.toFixed(1));
    p.tongue.setAttribute('rx', d.tongueRx.toFixed(1));
    p.tongue.setAttribute('ry', d.tongueRy.toFixed(1));
  }

  // Forma pedida de la boca: { open, wide, round } entre 0 y 1. Se llega suave (como una boca de verdad).
  setMouth(shape) {
    if (this.mode !== 'solo') { this.setLevel(shape.open); return; }
    this.target = shape;
    this.level = shape.open;
    this.lastMouth = performance.now();
    if (!this.raf) { this.lastT = performance.now(); this.raf = requestAnimationFrame(t => this.step(t)); }
  }

  step(t) {
    const dt = Math.min(64, t - this.lastT);
    this.lastT = t;
    const k = 1 - Math.exp(-dt / 42);
    let diff = 0;
    for (const key of ['open', 'wide', 'round']) {
      const v = this.cur[key] + (this.target[key] - this.cur[key]) * k;
      diff += Math.abs(this.target[key] - v);
      this.cur[key] = v;
    }
    // Mientras habla, la cabeza se mueve un poco y asiente con las sílabas abiertas.
    const speaking = t - this.lastMouth < 250;
    this.talk += ((speaking ? 1 : 0) - this.talk) * Math.min(1, dt / 220);
    const tilt = Math.sin(t / 650) * 1.6 * this.talk;
    const nod = this.cur.open * 1.4 * this.talk;
    this.headEl.setAttribute('transform', `rotate(${tilt.toFixed(2)} 100 165) translate(0 ${nod.toFixed(2)})`);
    this.paintMouth();
    if (speaking || diff > 0.004 || this.talk > 0.02) this.raf = requestAnimationFrame(n => this.step(n));
    else { this.raf = 0; this.headEl.removeAttribute('transform'); }
  }

  // ---------------- Dibujo simple (respaldo sin imágenes) ----------------
  drawSvg() {
    const L = this.c.look;
    const hair = {
      long: `<path d="M45 95 Q40 30 100 28 Q160 30 155 95 L160 170 Q140 150 140 110 Q100 60 60 110 Q60 150 40 170 Z" fill="${L.hair}"/>`,
      short: `<path d="M50 90 Q50 30 100 30 Q150 30 150 90 Q140 60 100 58 Q60 60 50 90 Z" fill="${L.hair}"/>`,
      bun: `<circle cx="100" cy="30" r="20" fill="${L.hair}"/><path d="M50 90 Q50 38 100 38 Q150 38 150 90 Q140 64 100 62 Q60 64 50 90 Z" fill="${L.hair}"/>`,
      bob: `<path d="M44 120 Q38 32 100 30 Q162 32 156 120 Q150 125 146 118 Q148 70 100 62 Q52 70 54 118 Q50 125 44 120 Z" fill="${L.hair}"/>`,
      curly: `<g fill="${L.hair}">${[60, 80, 100, 120, 140].map(x => `<circle cx="${x}" cy="44" r="18"/>`).join('')}<circle cx="52" cy="66" r="14"/><circle cx="148" cy="66" r="14"/></g>`,
      bald: `<path d="M58 70 Q100 40 142 70" stroke="${L.hair}" stroke-width="4" fill="none" opacity=".25"/>`,
    }[L.hairStyle] || '';
    this.el.innerHTML = `
<svg viewBox="0 0 200 230" class="avatar-svg" role="img" aria-label="${this.c.name}">
  <ellipse cx="100" cy="232" rx="78" ry="58" fill="${L.shirt}"/>
  <rect x="88" y="148" width="24" height="26" rx="8" fill="${L.skin}"/>
  <g class="av-head">
    <ellipse cx="100" cy="100" rx="52" ry="60" fill="${L.skin}"/>
    <ellipse cx="48" cy="104" rx="8" ry="12" fill="${L.skin}"/>
    <ellipse cx="152" cy="104" rx="8" ry="12" fill="${L.skin}"/>
    ${hair}
    <path class="av-brow-l" d="M68 80 Q78 74 88 80" stroke="#2b2b2b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path class="av-brow-r" d="M112 80 Q122 74 132 80" stroke="#2b2b2b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <g class="av-eyes">
      <ellipse cx="78" cy="96" rx="6" ry="7" fill="#1d1d1d"/>
      <ellipse cx="122" cy="96" rx="6" ry="7" fill="#1d1d1d"/>
      <circle cx="80" cy="94" r="2" fill="#fff"/><circle cx="124" cy="94" r="2" fill="#fff"/>
    </g>
    <path d="M100 104 Q96 118 102 120" stroke="rgba(0,0,0,.25)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="70" cy="122" rx="9" ry="5" fill="#ff7b7b" opacity=".18"/>
    <ellipse cx="130" cy="122" rx="9" ry="5" fill="#ff7b7b" opacity=".18"/>
    <g class="av-mouth" transform="translate(100 136)">
      <path class="av-smile" d="M-16 0 Q0 10 16 0" stroke="#7a2e2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse class="av-open" cx="0" cy="2" rx="12" ry="0" fill="#5a1f1f"/>
    </g>
  </g>
</svg>`;
    this.svg = this.el.querySelector('svg');
    this.eyes = this.el.querySelector('.av-eyes');
    this.open = this.el.querySelector('.av-open');
    this.smile = this.el.querySelector('.av-smile');
    this.head = this.el.querySelector('.av-head');
    this.setMood(this.mood);
  }

  startBlink() {
    const loop = () => {
      this.blinkTimer = setTimeout(() => { this.blink(); loop(); }, 2500 + Math.random() * 3000);
    };
    loop();
  }

  blink() {
    if (this.mode === 'img') {
      if (!this.frames.blink || this.level > 0.05) return;
      this.show('blink');
      setTimeout(() => { if (this.level <= 0.05) this.show(this.currentRest()); }, 140);
    } else if (this.eyes) {
      this.eyes.classList.add('blink');
      setTimeout(() => this.eyes?.classList.remove('blink'), 130);
    }
  }

  currentRest() { return this.mood > 0.6 && this.frames.happy ? 'happy' : 'neutral'; }

  // level 0..1 = qué tan abierta está la boca (voz natural: el volumen del audio)
  setLevel(level) {
    if (this.mode === 'solo') { this.setMouth({ open: level, wide: 0.55, round: 0 }); return; }
    this.level = level;
    if (this.mode === 'img') {
      if (level < 0.08) this.show(this.currentRest());
      else if (level > 0.55 && this.frames.talk2) this.show('talk2');
      else this.show('talk');
    } else if (this.open) {
      this.open.setAttribute('ry', (level * 9).toFixed(1));
      this.smile.style.opacity = level > 0.15 ? 0.35 : 1;
      this.head.style.transform = `rotate(${(Math.sin(performance.now() / 400) * level * 2).toFixed(2)}deg)`;
    }
  }

  setMood(m) {
    this.mood = m;
    if (this.mode === 'solo') {
      const worried = m < -0.2 ? 5 : 0, happy = m > 0.6 ? 1.5 : 0;
      this.browL?.setAttribute('d', `M67 ${88 - happy} Q78 ${81 - happy - worried * 0.4} 89 ${86 - worried}`);
      this.browR?.setAttribute('d', `M111 ${86 - worried} Q122 ${81 - happy - worried * 0.4} 133 ${88 - happy}`);
      if (!this.raf) this.paintMouth();
    } else if (this.mode === 'svg' && this.smile) {
      const curve = Math.round(m * 12);
      this.smile.setAttribute('d', `M-16 0 Q0 ${curve} 16 0`);
      const bl = this.el.querySelector('.av-brow-l'), br = this.el.querySelector('.av-brow-r');
      const lift = m < -0.2 ? 6 : 0;
      bl.setAttribute('d', `M68 ${80 - lift / 2} Q78 ${74 + lift} 88 80`);
      br.setAttribute('d', `M112 80 Q122 ${74 + lift} 132 ${80 - lift / 2}`);
    } else if (this.mode === 'img' && this.imgs && this.level < 0.08) {
      this.show(this.currentRest());
    }
  }

  setListening(on) { this.el.classList.toggle('listening', on); }

  destroy() { clearTimeout(this.blinkTimer); cancelAnimationFrame(this.raf); this.raf = 0; }
}

// Geometría de los labios de Amy (centro en 100,139). Sin DOM: se prueba con node.
export function mouthGeometry({ open = 0, wide = 0.5, round = 0 }, mood = 0.3) {
  const cx = 100, cy = 139;
  const w = 12.5 + 4.5 * wide - 5 * round;                 // media boca: 7.5 (redonda) … 17 (estirada)
  const oh = Math.max(0, open) * (14.5 - 3 * wide + 2 * round);
  const lift = Math.max(-1, Math.min(1, mood)) * 3;        // sonrisa: las comisuras suben
  const L = cx - w, R = cx + w, cyc = cy - lift;
  const upIn = cy - oh * 0.36, loIn = cy + oh * 0.64;
  const upOut = Math.min(upIn, cy) - 4.4 - round * 0.6;
  const loOut = loIn + 5.2 + round * 0.8;
  // Curva cúbica entre las comisuras que pasa por y en el centro.
  const cyFor = y => (8 * y - 2 * cyc) / 6;
  const kx = 0.18 + 0.12 * round;
  const c1 = L + w * 2 * kx, c2 = R - w * 2 * kx;
  const f = n => n.toFixed(1);
  const upperInner = `C${f(c2)} ${f(cyFor(upIn))} ${f(c1)} ${f(cyFor(upIn))} ${f(L)} ${f(cyc)}`;  // de R a L
  const lowerInner = `C${f(c1)} ${f(cyFor(loIn))} ${f(c2)} ${f(cyFor(loIn))} ${f(R)} ${f(cyc)}`;  // de L a R
  const bow = Math.max(4, w * 0.36);
  const upper = `M${f(L)} ${f(cyc)} Q${f(cx - bow * 1.9)} ${f(upOut - 0.4)} ${f(cx - bow)} ${f(upOut)} Q${f(cx - 1.6)} ${f(upOut)} ${f(cx)} ${f(upOut + 1.7)} `
    + `Q${f(cx + 1.6)} ${f(upOut)} ${f(cx + bow)} ${f(upOut)} Q${f(cx + bow * 1.9)} ${f(upOut - 0.4)} ${f(R)} ${f(cyc)} ${upperInner}Z`;
  const lower = `M${f(L)} ${f(cyc)} ${lowerInner} C${f(R - w * 0.4)} ${f(cyFor(loOut))} ${f(L + w * 0.4)} ${f(cyFor(loOut))} ${f(L)} ${f(cyc)}Z`;
  const inner = `M${f(L)} ${f(cyc)} C${f(c1)} ${f(cyFor(upIn))} ${f(c2)} ${f(cyFor(upIn))} ${f(R)} ${f(cyc)} `
    + `C${f(c2)} ${f(cyFor(loIn))} ${f(c1)} ${f(cyFor(loIn))} ${f(L)} ${f(cyc)}Z`;
  const shineY = loIn + 2.4 + round * 0.4;
  const shine = `M${f(cx - w * 0.35)} ${f(shineY)} Q${f(cx)} ${f(shineY - 1.4)} ${f(cx + w * 0.35)} ${f(shineY)} Q${f(cx)} ${f(shineY + 1.2)} ${f(cx - w * 0.35)} ${f(shineY)}Z`;
  return {
    upper, lower, inner, shine,
    teethY: upIn - 1, teethH: Math.min(oh * 0.34, 4.6),
    tongueY: loIn - 0.5, tongueRx: w * 0.55, tongueRy: Math.max(0, oh * 0.24),
    width: w * 2, height: oh,
  };
}

// Mini avatar para listas
export function miniAvatar(character) {
  const d = document.createElement('div');
  d.className = 'mini-avatar';
  d.style.background = character.look.bg;
  const conf = character.images;
  if (!character.solo && conf?.frames?.includes('neutral')) {
    const img = new Image();
    // mini.webp = copia de 192 px; la grande (640 px) solo si falta la pequeña.
    img.decoding = 'async';
    img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = `avatars/${character.id}/neutral.${conf.ext || 'png'}`; };
    img.src = `avatars/${character.id}/mini.webp`;
    img.alt = '';
    d.appendChild(img);
  } else {
    const tmp = document.createElement('div');
    new Avatar(tmp, character, { static: true });
    d.appendChild(tmp);
  }
  return d;
}
