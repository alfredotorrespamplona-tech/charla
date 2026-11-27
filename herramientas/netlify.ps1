# Sube la app a Netlify (la página que se abre en el teléfono y en la computadora).
#
#   powershell -ExecutionPolicy Bypass -File herramientas\netlify.ps1
#
# Arma una carpeta solo con lo que la app necesita (sin pruebas, herramientas, ni el proyecto de Android),
# revisa que no haya claves de IA y la publica en el sitio de Netlify conectado a esta carpeta (.netlify/state.json).
# La primera vez: npx netlify-cli login  y  npx netlify-cli sites:create --name <nombre>  (desde la carpeta charla).
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$out = Join-Path $env:TEMP 'charla-netlify'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null

# Lo que se publica.
foreach ($f in 'index.html', 'styles.css', 'manifest.json', 'sw.js', 'icon.svg', 'Charla.apk') {
  if (Test-Path $f) { Copy-Item $f $out }
}
foreach ($d in 'icons', 'js', 'scenes', 'vendor', '.well-known') {
  if (Test-Path $d) { Copy-Item $d (Join-Path $out $d) -Recurse }
}
# Avatares sin las hojas originales (pesadas y fuera de git).
Copy-Item 'avatars' (Join-Path $out 'avatars') -Recurse -Exclude '_hojas'
$hojas = Join-Path $out 'avatars\_hojas'
if (Test-Path $hojas) { Remove-Item -Recurse -Force $hojas }

# Ninguna clave de IA en lo que se sube.
$fugas = Get-ChildItem $out -Recurse -File -Include *.js, *.json, *.html, *.css, *.txt |
  Select-String -Pattern 'sk-[A-Za-z0-9]{20,}', 'gsk_[A-Za-z0-9]{20,}' -List
if ($fugas) {
  $fugas | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" }
  Write-Host 'ALTO: hay una clave de IA en esos archivos. No se publico nada.' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path '.netlify\state.json')) {
  Write-Host 'ALTO: esta carpeta no esta conectada a un sitio de Netlify (falta .netlify\state.json).' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '== Subiendo a Netlify' -ForegroundColor Cyan
npx -y netlify-cli@17 deploy --prod --dir $out --functions netlify/functions --message (git log -1 --format=%s)
if ($LASTEXITCODE -ne 0) { Write-Host 'ALTO: Netlify no acepto la subida.' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host 'Listo en Netlify: abra la app y se actualiza sola.' -ForegroundColor Green
