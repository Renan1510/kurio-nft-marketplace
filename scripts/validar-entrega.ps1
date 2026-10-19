# Verificacoes locais para a entrega. Nunca modifica o codigo ou atualiza snapshots.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js/npm nao foram encontrados no PATH.' }
if (-not (Test-Path '.\node_modules\.bin\vite.cmd')) { throw 'Dependencias ausentes: execute npm ci antes.' }
Write-Host 'KURIO - AUDITORIA LOCAL (sem alterar arquivos)' -ForegroundColor Cyan
$results = [ordered]@{}
foreach ($item in @(
  @{Name='TypeScript'; Args=@('run','typecheck')},
  @{Name='ESLint'; Args=@('run','lint')},
  @{Name='Build'; Args=@('run','build')},
  @{Name='Playwright'; Args=@('run','test:e2e','--','--workers=2')}
)) {
  Write-Host "`nExecutando $($item.Name)..." -ForegroundColor Cyan
  $argv = [string[]]$item.Args
  & npm.cmd @argv
  $results[$item.Name] = ($LASTEXITCODE -eq 0)
  if ($results[$item.Name]) { Write-Host "OK: $($item.Name)" -ForegroundColor Green }
  else { Write-Host "FALHA: $($item.Name)" -ForegroundColor Red }
}
Write-Host "`nRESUMO DA AUDITORIA" -ForegroundColor Cyan
foreach ($key in $results.Keys) {
  if ($results[$key]) { Write-Host "$key : PASSOU" -ForegroundColor Green }
  else { Write-Host "$key : FALHOU" -ForegroundColor Red }
}
if ($results.Values -contains $false) { exit 1 }
Write-Host 'TODAS AS VERIFICACOES LOCAIS PASSARAM.' -ForegroundColor Green
exit 0
