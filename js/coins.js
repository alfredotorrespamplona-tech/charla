// Economía de monedas, como en LingoLooper:
//  - se gana 1 moneda por estrella y 5 extra cada vez que una misión sube de nivel (ver scoring.js);
//  - un lugar que todavía no corresponde a su nivel se puede abrir antes pagando (LevelDto.BasePrice);
//  - volver a sortear las misiones cuesta monedas (ReRollCounter), con un sorteo gratis al día;
//  - el protector de racha también se compra con monedas (scoring.buyFreeze).
// Los precios son propios de Charla: el APK no trae los valores (los manda su servidor).
import * as store from './store.js';

// Charla es de uso personal: no hay tienda ni nada que se compre con monedas.
// Los lugares se abren por nivel (si los candados están puestos) y sortear misiones es gratis.
export const SHOP_ENABLED = false;

export const COINS_PER_STAR = 1;
export const PLACE_PRICE_PER_RANK = 15;   // un lugar de nivel 3 cuesta 30 (2 niveles por encima del 1)
export const REROLL_PRICE = 1;
export const FREE_REROLLS_PER_DAY = 1;

export function placePrice(place) {
  return Math.max(0, (place.rankRequired - 1) * PLACE_PRICE_PER_RANK);
}

// ¿Puede entrar al lugar? Por nivel alcanzado o porque lo compró.
export function isPlaceOpen(s, place) {
  return store.reachRank(s) >= place.rankRequired || (s.unlockedPlaces || []).includes(place.id);
}

export function buyPlace(place) {
  const s = store.get();
  if (isPlaceOpen(s, place)) return { ok: false, reason: 'Ese lugar ya está abierto.' };
  const price = placePrice(place);
  if (s.coins < price) return { ok: false, reason: `Le faltan ${price - s.coins} monedas.` };
  store.update(x => { x.coins -= price; x.unlockedPlaces.push(place.id); });
  return { ok: true, price };
}

// Cuánto cuesta el próximo sorteo de misiones hoy (0 si queda uno gratis).
export function rerollCost(s = store.get()) {
  if (!SHOP_ENABLED) return 0;
  const used = s.rerolls?.date === store.todayIso() ? s.rerolls.used : 0;
  return used < FREE_REROLLS_PER_DAY ? 0 : REROLL_PRICE;
}

export function useReroll() {
  const s = store.get();
  const cost = rerollCost(s);
  if (s.coins < cost) return { ok: false, reason: `Volver a sortear cuesta ${cost} 🪙 y no le alcanza. Gane monedas conversando.` };
  store.update(x => {
    const today = store.todayIso();
    if (x.rerolls?.date !== today) x.rerolls = { date: today, used: 0 };
    x.rerolls.used += 1;
    x.coins -= cost;
  });
  return { ok: true, cost };
}
