# Publica una versión nueva de Charla con un solo comando (desde la carpeta charla):
#
#   powershell -ExecutionPolicy Bypass -File herramientas\publicar.ps1
#   powershell -ExecutionPolicy Bypass -File herramientas\publicar.ps1 -Mensaje "Nuevos temas"
#
# Pasos:
#   1. Trae los cambios del cerebro de inglés (bitácora, frases, verbos) a js/cerebro.js.
#   2. Corre las pruebas; si alguna falla, se detiene y no guarda nada.
#   3. Sube el número de CACHE en sw.js para que los teléfonos descarguen la versión nueva.
#   4. Revisa que ningún archivo tenga una clave de DeepSeek (sk-...).
#   5. Guarda la versión en git (commit).
#   6. La sube a GitHub solo si el repositorio ya está conectado (git remote); si no, lo avisa.
param(
  [string]$Cerebro = 'C:\Users\leoab\Documents\ingles cerebro',
  [string]$Mensaje = '',
  [switch]$SinCerebro
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$utf8 = New-Object System.Text.UTF8Encoding $false

function Write-Paso($texto) { Write-Host ''; Write-Host "== $texto" -ForegroundColor Cyan }
function Stop-Publicar($texto) { Write-Host ''; Write-Host "ALTO: $texto" -ForegroundColor Red; exit 1 }

# 1. Cerebro
if (-not $SinCerebro) {
  Write-Paso 'Trayendo el cerebro de ingles'
  if (-not (Test-Path $Cerebro)) { Stop-Publicar "No encuentro la carpeta del cerebro: $Cerebro (use -SinCerebro para saltar este paso)" }
  python herramientas\importar_cerebro.py $Cerebro
  if ($LASTEXITCODE -ne 0) { Stop-Publicar 'importar_cerebro.py fallo.' }
}

# 2. Pruebas
Write-Paso 'Corriendo las pruebas'
node --test
if ($LASTEXITCODE -ne 0) { Stop-Publicar 'Hay pruebas que fallan. No se publico nada.' }

# ¿Hay algo nuevo?
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Stop-Publicar 'Esta carpeta no es un repositorio git (corra: git init).' }
$cambios = git status --porcelain
if (-not $cambios) { Write-Host ''; Write-Host 'No hay cambios: no hay nada que publicar.' -ForegroundColor Yellow; exit 0 }

# 3. Versión del service worker (solo si ya hay una versión anterior guardada)
git rev-parse --verify HEAD *> $null
if ($LASTEXITCODE -eq 0) {
  $sw = Join-Path (Get-Location) 'sw.js'
  $texto = [System.IO.File]::ReadAllText($sw, $utf8)
  $publicado = (git show HEAD:sw.js) -join "`n"
  $m = [regex]::Match($publicado, "charla-v(\d+)")
  if ($m.Success -and $texto.Contains($m.Value)) {
    $nueva = 'charla-v' + ([int]$m.Groups[1].Value + 1)
    [System.IO.File]::WriteAllText($sw, $texto.Replace($m.Value, $nueva), $utf8)
    # La app muestra su versión (Ajustes) y la compara con la publicada para actualizarse sola.
    $ver = Join-Path (Get-Location) 'js\version.js'
    if (Test-Path $ver) {
      $vt = [System.IO.File]::ReadAllText($ver, $utf8)
      [System.IO.File]::WriteAllText($ver, ($vt -replace 'charla-v\d+', $nueva), $utf8)
    }
    Write-Paso "Version de la app: $($m.Value) -> $nueva"
  }
}

# 4. Ninguna clave en los archivos que se van a guardar
Write-Paso 'Revisando que no haya claves'
$archivos = git ls-files --cached --others --exclude-standard | Where-Object { $_ -match '\.(js|mjs|json|html|md|py|ps1|txt|css)$' }
$fugas = $archivos | Where-Object { Test-Path $_ } | Select-String -Pattern 'sk-[A-Za-z0-9]{20,}' -List
if ($fugas) {
  $fugas | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" }
  Stop-Publicar 'Hay una clave de DeepSeek en esos archivos. Borrela antes de publicar.'
}

# 5. Commit
if (-not $Mensaje) { $Mensaje = 'Actualizacion ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') }
Write-Paso "Guardando la version: $Mensaje"
git add -A
git commit -m $Mensaje
if ($LASTEXITCODE -ne 0) { Stop-Publicar 'git commit fallo.' }

# 6. Subir
$remoto = git remote
if (-not $remoto) {
  Write-Host ''
  Write-Host 'Version guardada en este PC. GitHub todavia no esta conectado, asi que no se subio.' -ForegroundColor Yellow
  exit 0
}
Write-Paso 'Subiendo a GitHub'
git push
if ($LASTEXITCODE -ne 0) { Stop-Publicar 'git push fallo (revise la conexion o el inicio de sesion de GitHub).' }
Write-Host ''
Write-Host 'Listo. GitHub Pages tarda 1 o 2 minutos; luego abra la app en el telefono y se actualiza sola.' -ForegroundColor Green
