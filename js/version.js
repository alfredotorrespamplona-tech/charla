// Versión publicada de la app. herramientas/publicar.ps1 la sube junto con la de sw.js: no editar a mano.
export const VERSION = 'charla-v43';

export const versionNumber = v => Number(String(v).match(/charla-v(\d+)/)?.[1] || 0);
export const isNewer = (published, running = VERSION) => versionNumber(published) > versionNumber(running);
export const shortVersion = (v = VERSION) => String(v).replace('charla-', '');
