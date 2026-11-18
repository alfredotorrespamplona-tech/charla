// Avatar 2D: usa sus imágenes (ChatGPT) si existen; si no, dibuja uno por código.
// Imágenes: avatars/<id>/neutral, talk, talk2 (opcional), blink, happy (opcional); se declaran en data.js.

export class Avatar {
  constructor(container, character, opts = {}) {
    this.static = !!opts.static;
    this.el = container;
    this.c = character;
    this.mode = 'svg';
    this.level = 0;
    this.mood = 0.3;
    this.blinkTimer = null;
    this.el.innerHTML = '';
    this.el.classList.add('avatar');
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
      this.eyes.style.transform = 'scaleY(0.1)';
      setTimeout(() => { this.eyes.style.transform = ''; }, 130);
    }
  }

  currentRest() { return this.mood > 0.6 && this.frames.happy ? 'happy' : 'neutral'; }

  // level 0..1 = qué tan abierta está la boca
  setLevel(level) {
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
    if (this.mode === 'svg' && this.smile) {
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

  destroy() { clearTimeout(this.blinkTimer); }
}

// Mini avatar para listas
export function miniAvatar(character) {
  const d = document.createElement('div');
  d.className = 'mini-avatar';
  d.style.background = character.look.bg;
  const conf = character.images;
  if (conf?.frames?.includes('neutral')) {
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
