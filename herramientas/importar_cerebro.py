# -*- coding: utf-8 -*-
"""Convierte las listas del «cerebro de inglés» en paquetes de Frases para Charla (js/cerebro.js).

Uso (desde la carpeta charla/):
    python herramientas/importar_cerebro.py "C:/Users/leoab/Documents/ingles cerebro"

Lee (sin modificar nada del cerebro):
  - wiki/vocabulario/frases_cotidianas_alta_frecuencia.md   → paquete «Frases cotidianas»
  - wiki/vocabulario/idioms_expresiones_no_literales.md      → paquete «Idioms» (con la trampa literal)
  - tools/mazo_verbos_150/generar_mazo_anki.py (JUGGLE)      → un paquete de verbos por categoría
  - wiki/vocabulario/lista_1000_refold.md                    → 10 paquetes de 100 palabras
  - bitacora/errores.md                                       → paquete «Mis errores» y errores que vigila el coach
  - CLAUDE.md (sección «Enseñanza y corrección en vivo»)     → reglas de cómo corrige el coach
El script de verbos se lee con ast (no se ejecuta). Vuelva a correrlo cuando cambie el cerebro:
los id son estables (texto, verbo o número de palabra), así que lo ya aprendido no se pierde.
"""
import ast
import difflib
import json
import os
import re
import sys

BRAIN = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\leoab\Documents\ingles cerebro'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'cerebro.js')

STOP = set('''a an the i you he she we they it me my your his her our their this that these those to of in on at
for with and or but so is are am was were be been do does did can could will would should please not no
up out off about from by as if just very really some any here there what how who when where why'''.split())


def read(rel):
    with open(os.path.join(BRAIN, rel), encoding='utf-8') as f:
        return f.read()


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def mark(en, word):
    """Pone [corchetes] a la primera aparición de word (palabra entera)."""
    m = re.search(r"(?<![A-Za-z'])" + re.escape(word) + r"(?![A-Za-z])", en)
    return en[:m.start()] + '[' + m.group(0) + ']' + en[m.end():] if m else None


def pick_gap(en):
    """La palabra con más contenido: la más larga que no sea de las comunes ni una contracción."""
    toks = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", en)
    plain = [t for t in toks if "'" not in t]
    good = [t for t in plain if t.lower() not in STOP and len(t) >= 3]
    pool = good or plain or toks
    return max(pool, key=len)


def table_rows(md, stop_at='## Mazo'):
    """Filas de las tablas markdown (celdas sin los bordes), hasta la sección stop_at."""
    md = md.split(stop_at)[0]
    rows = []
    for line in md.splitlines():
        if not line.startswith('|') or line.startswith('|---'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        rows.append(cells)
    return rows


def first_quote(cell):
    m = re.search(r'\*"([^"]+)"\*', cell)
    return m.group(1).strip() if m else None


def unquote(t):
    return t.strip().strip('"').strip()


packs = []
report = []

# ---- Frases cotidianas ----
ph = []
for cells in table_rows(read('wiki/vocabulario/frases_cotidianas_alta_frecuencia.md')):
    if len(cells) != 3:
        continue
    en = first_quote(cells[1])
    if not en:
        continue
    raw = mark(en, pick_gap(en))
    ph.append({'id': 'cot-' + slug(en), 'raw': raw, 'es': cells[2]})
packs.append({'id': 'cot', 'name': 'Frases cotidianas', 'level': 'A1', 'icon': '☕', 'group': 'cerebro', 'phrases': ph})
report.append(('Frases cotidianas', len(ph)))

# ---- Idioms (con la traducción literal como trampa) ----
ph = []
for cells in table_rows(read('wiki/vocabulario/idioms_expresiones_no_literales.md')):
    if len(cells) != 3:
        continue
    en = first_quote(cells[0])
    if not en:
        continue
    trap = unquote(re.sub(r'\(.*?\)', '', cells[1]))
    raw = mark(en, pick_gap(en))
    ph.append({'id': 'idm-' + slug(en), 'raw': raw, 'es': cells[2], 'trap': trap})
packs.append({'id': 'idm', 'name': 'Idioms: no se traducen literal', 'level': 'B1', 'icon': '🎭', 'group': 'cerebro', 'phrases': ph})
report.append(('Idioms', len(ph)))

# ---- Verbos: Repeat and Juggle (ayer / he… / había…) ----
tree = ast.parse(read('tools/mazo_verbos_150/generar_mazo_anki.py'))
consts = {}
for node in tree.body:
    if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
        if node.targets[0].id in ('DATA', 'JUGGLE'):
            consts[node.targets[0].id] = ast.literal_eval(node.value)
DATA, JUGGLE = consts['DATA'], consts['JUGGLE']
JUGGLE_LABELS = ['ahora', 'ayer', 'he… (have / has)', 'había… (had)', 'mañana (will)']
juggle_sets = []   # Repeat and Juggle completo: frase base + sus cambios, para el Taller de frases
ACCENTS = {'Comunicacion': 'Comunicación', 'percepcion': 'percepción'}
VERB_ICONS = ['🧩', '🏃', '💬', '💭', '🔁', '💛', '🪜']
verb_table = []   # tabla de verbos: infinitivo / pasado / participio, cada uno con su español

# El mazo de verbos guarda el español sin tildes (por Anki). Se las devolvemos para mostrarlo bien.
FIX_ES = {'extranar': 'extrañar', 'extranado': 'extrañado', 'obligacion': 'obligación', 'oir': 'oír',
          'caido': 'caído', 'leido': 'leído', 'oido': 'oído', 'creido': 'creído', 'traido': 'traído',
          'percepcion': 'percepción', 'Comunicacion': 'Comunicación'}
# Pasados «fuertes» que se escriben sin tilde (los demás terminados en -o la llevan: habló, comió, cayó).
NO_ACCENT_PAST = {'tuvo', 'vino', 'dijo', 'hizo', 'puso', 'supo', 'quiso', 'pudo', 'estuvo', 'trajo', 'detuvo',
                  'mantuvo', 'anduvo', 'dio', 'vio', 'hubo', 'condujo', 'produjo'}


# Notas del cerebro que en el mazo iban como asterisco.
VERB_NOTES = {'read': 'Se escribe igual en las tres formas, pero el pasado y el participio se pronuncian «red».'}


def es_word(w, past=False):
    w = FIX_ES.get(w, w)
    if w == 'extrano' and past:
        return 'extrañó'
    if past and len(w) > 2 and w.endswith('o') and w not in NO_ACCENT_PAST:
        return w[:-1] + 'ó'
    return w


def es_text(text, past=False):
    return re.sub(r"[A-Za-zñáéíóú]+", lambda m: es_word(m.group(0), past), text)

irregular = {}   # forma conjugada → base (para encontrar el verbo en las frases de Refold)
for k, (cat, verbs) in enumerate(DATA.items()):
    name = re.sub(r'^\d+\.\s*', '', cat)
    for a, b in ACCENTS.items():
        name = name.replace(a, b)
    ph = []
    for v in verbs:
        base = v[1]
        for form in (v[2], v[3]):
            for f in form.split('/'):
                f = f.strip()
                if f and not f.startswith('('):
                    irregular.setdefault(f.lower(), base)
        ex = v[5].replace('%%', v[6]) if len(v) > 6 and '%%' in v[5] else ''
        verb_table.append({'id': 'vt-' + slug(base), 'cat': k, 'catName': name, 'type': v[4],
                           'es': es_text(v[0]), 'base': base, 'past': v[2].replace('*', ''), 'pp': v[3].replace('*', ''),
                           **({'note': VERB_NOTES[base]} if base in VERB_NOTES else {}),
                           'esPast': es_text(v[8], past=True) if len(v) > 8 else '',
                           'esPp': es_text(v[9]) if len(v) > 9 else '', 'example': ex})
        lines = JUGGLE.get(base)
        if not lines:
            report.append(('  verbo sin Juggle', base))
            continue
        steps = []
        for j, ln in enumerate(lines):
            label = ln[0] if len(ln) == 3 else JUGGLE_LABELS[j]
            label = re.sub(r'^(Repeat|Juggle)\s*[—→-]+\s*', '', label).strip()
            steps.append({'label': label, 'en': ln[-2], 'es': ln[-1]})
        juggle_sets.append({'id': 'jg-' + slug(base), 'verb': base, 'cat': k, 'catName': name, 'steps': steps})
        lines = [ln[-2:] for ln in lines]                      # (en, es) aunque traiga etiqueta
        forms = [re.search(r'\[([^\]]+)\]', en).group(1) for en, _ in lines]
        for j in (1, 2, 3):                                    # ayer, he…, había…
            en, es = lines[j]
            if en.count('[') != 1:                             # ej. «[Are] you [going to]…?»: no sirve de hueco
                continue
            alts = [f for f in dict.fromkeys(forms) if f != forms[j]]
            ph.append({'id': f'vrb-{slug(base)}-{j}', 'raw': en, 'es': es.replace('[', '').replace(']', ''),
                       'alts': alts, 'verb': base})
    packs.append({'id': f'vrb{k + 1}', 'name': f'Verbos: {name}', 'level': 'A2', 'icon': VERB_ICONS[k % len(VERB_ICONS)],
                  'group': 'cerebro', 'phrases': ph})
    report.append((f'Verbos: {name}', len(ph)))


# ---- Las 1000 palabras de Refold (la palabra es el hueco) ----
def candidates(word, extra):
    w = word.lower()
    c = {w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'est', w + 'ly'}
    if w.endswith('e'):
        c |= {w[:-1] + 'ing', w[:-1] + 'y'}
    if w.endswith('y'):
        c |= {w[:-1] + 'ies', w[:-1] + 'ied', w[:-1] + 'ier', w[:-1] + 'iest', w[:-1] + 'ily'}
    if re.search(r'[^aeiou][aeiou][bdgklmnprt]$', w):
        c |= {w + w[-1] + 'ed', w + w[-1] + 'ing', w + w[-1] + 'er'}
    c |= {f.strip().lower() for f in extra if f.strip()}
    c |= {f for f, b in irregular.items() if b == w}
    c |= MORE_IRREGULAR.get(w, set())
    return c


# Pasados que no están en el mazo de verbos ni en la columna de formas de Refold.
MORE_IRREGULAR = {'wake': {'woke', 'woken'}, 'win': {'won'}, 'get': {'got', 'gotten'}, 'wear': {'wore', 'worn'},
                  'sting': {'stung'}}


rows = [r for r in table_rows(read('wiki/vocabulario/lista_1000_refold.md'), stop_at='> **Fuente') if r[0].isdigit()]
by_rank = []
missing = []
for r in rows:
    rank, word, forms, en, es = int(r[0]), r[1].strip('*'), r[3], r[4].strip('*').strip(), r[5]
    head = word.split()[0]                                   # verbos con partícula: el verbo
    extra = [] if forms.strip() in ('—', '-', '') else forms.split(',')
    cand = candidates(head, extra)
    toks = re.findall(r"[A-Za-z]+", en)
    tok = next((t for t in toks if t.lower() in cand), None)
    if not tok and len(head) >= 3:                           # palabra compuesta o derivada: backyard, foggy
        tok = next((t for t in toks if head.lower() in t.lower()), None)
    if not tok:
        missing.append(f'{rank} {word}: {en}')
        continue
    by_rank.append((rank, {'id': f'mil-{rank}', 'raw': mark(en, tok), 'es': es, 'word': word}))
for k in range(10):
    lo, hi = k * 100 + 1, k * 100 + 100
    ph = [p for rank, p in by_rank if lo <= rank <= hi]
    packs.append({'id': f'mil{k + 1}', 'name': f'Palabras {lo}–{hi}', 'level': 'A1' if k < 3 else 'A2' if k < 6 else 'B1',
                  'icon': '📖', 'group': 'mil', 'phrases': ph})
report.append(('Refold 1000', len(by_rank)))

# ---- Bitácora de errores: lo que vigila el coach y el paquete «Mis errores» ----
def clean_md(t):
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    return t.replace('**', '').replace('`', '').strip()


def quotes(cell):
    return [q.strip() for q in re.findall(r'"([^"]+)"', re.sub(r'\(.*?\)', '', cell))]


forms_of = {}
for f, b in irregular.items():
    forms_of.setdefault(b, set()).update({b, f})

AUX_ALTS = {'had': ['would', 'have', 'has'], 'has': ['had', 'have', 'is'], 'have': ['had', 'has', 'am']}
AUX = {'be', 'am', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'do', 'does', 'did'}
TOK = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+")


def error_gap(wrong, right):
    """El primer tramo distinto entre lo que dijo y la corrección: ese es el hueco; lo que dijo, la opción falsa."""
    rt = list(TOK.finditer(right))
    a = [t.lower() for t in TOK.findall(wrong)]
    b = [m.group(0).lower() for m in rt]
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == 'equal':
            continue
        if op == 'delete':                                   # dijo una palabra de más («we was moved»)
            if j1 >= len(rt):
                continue
            j2 = j1 + 1
            wrong_alt = ' '.join(a[i1:i2] + b[j1:j2])
        else:
            wrong_alt = ' '.join(a[i1:i2])
        if j2 - j1 > 1:                                      # tramo largo: quedarse con el verbo que cambió
            idx = [j for j in range(j1, j2) if b[j] in irregular or b[j] in forms_of]
            main = [j for j in idx if b[j] not in AUX]
            if idx:
                j1 = (main or idx)[0]
                j2 = j1 + 1
                wrong_alt = ''
        start, end = rt[j1].start(), rt[j2 - 1].end()
        gap = right[start:end]
        alts = [wrong_alt] if wrong_alt and wrong_alt != gap.lower() else []
        if j2 - j1 == 1:                                     # una palabra: también las otras formas del verbo
            base = irregular.get(gap.lower(), gap.lower())
            alts += sorted(forms_of.get(base, set()) - {gap.lower()})
        alts += AUX_ALTS.get(gap.lower(), [])
        alts = [x for x in dict.fromkeys(alts) if x != gap.lower()]
        return right[:start] + '[' + gap + ']' + right[end:], alts
    return None, []


rows = [r for r in table_rows(read('bitacora/errores.md')) if re.match(r'\d{4}-\d{2}-\d{2}', r[0])]
bitacora, ph = [], []
for r in rows:
    if len(r) < 6:
        continue
    wrong, right = quotes(r[1]), quotes(r[2])
    es = [x.strip() for x in r[3].split(' / ')]
    status = 'resuelto' if re.match(r'\*\*Resuelto', r[5]) else 'en resolución' if 'En resolución' in r[5] else 'activo'
    if not right:
        continue
    bid = 'err-' + slug(right[0])[:40]
    bitacora.append({'id': bid, 'date': r[0], 'wrong': wrong, 'right': right, 'why': clean_md(r[4]), 'status': status})
    if len(wrong) != len(right):
        wrong = (wrong + wrong[-1:] * len(right))[:len(right)]
    for k, (w, ok) in enumerate(zip(wrong, right)):
        raw, alts = error_gap(w, ok)
        if not raw:
            continue
        ph.append({'id': 'err-' + slug(ok)[:60], 'raw': raw, 'es': es[k] if len(es) == len(right) else es[0],
                   'alts': alts, 'said': w, 'status': status})
ph.sort(key=lambda x: x['status'] == 'resuelto')             # primero lo que todavía falla
packs.insert(0, {'id': 'err', 'name': 'Mis errores (bitácora)', 'level': 'A2', 'icon': '🎯', 'group': 'cerebro', 'phrases': ph})
report.append(('Mis errores', len(ph)))

# ---- Reglas de corrección del CLAUDE.md del cerebro ----
claude = read('CLAUDE.md')
sec = re.search(r'## Enseñanza y corrección en vivo.*?\n(.*?)\n## ', claude, re.S)
rules = [clean_md(re.sub(r',?\s*ver `[^`]+`', '', ln[2:])) for ln in (sec.group(1) if sec else '').splitlines() if ln.startswith('- ')]
report.append(('Reglas del coach', len(rules)))

report.append(('Repeat and Juggle (verbos)', len(juggle_sets)))
report.append(('Tabla de verbos', len(verb_table)))
bad = [p['id'] for pk in packs for p in pk['phrases'] if not p['raw'] or p['raw'].count('[') != 1]
assert not bad, bad

lines = ['// Generado por herramientas/importar_cerebro.py desde el «cerebro de inglés». No editar a mano:',
         '// cambie el cerebro y vuelva a correr el script. Los id son estables (texto, verbo o número de palabra).',
         'export const CEREBRO_PACKS = [']
for pk in packs:
    head = {k: v for k, v in pk.items() if k != 'phrases'}
    lines.append('  { ...' + json.dumps(head, ensure_ascii=False) + ', phrases: [')
    lines += ['    ' + json.dumps(p, ensure_ascii=False) + ',' for p in pk['phrases']]
    lines.append('  ] },')
lines.append('];')
lines.append('')
lines.append('// Repeat and Juggle de su mazo de verbos: frase base + cambios de tiempo. [corchetes] = la parte que cambia.')
lines.append('export const JUGGLE_SETS = [')
lines += ['  ' + json.dumps(j, ensure_ascii=False) + ',' for j in juggle_sets]
lines.append('];')
lines.append('')
lines.append('// Tabla de verbos de su mazo: infinitivo, pasado y participio, cada uno con su español.')
lines.append('// type: R = regular (-ed), I = irregular, M = modal o auxiliar (no tiene todas las formas).')
lines.append('export const VERB_TABLE = [')
lines += ['  ' + json.dumps(v, ensure_ascii=False) + ',' for v in verb_table]
lines.append('];')
lines.append('')
lines.append('// Reglas de corrección del usuario (CLAUDE.md del cerebro) y su bitácora de errores, para el coach.')
lines.append('export const COACH_RULES = ' + json.dumps(rules, ensure_ascii=False, indent=2) + ';')
lines.append('export const BITACORA = [')
lines += ['  ' + json.dumps(b, ensure_ascii=False) + ',' for b in bitacora]
lines.append('];')
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines) + '\n')

for name, n in report:
    print(f'{name}: {n}')
print(f'Refold sin encontrar la palabra en la frase: {len(missing)}')
for m in missing:
    print('  ', m)
