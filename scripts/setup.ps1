# Run from the project root. Python 3.12 or 3.13 recommended.
param([string]$Python='python')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
& $Python -m venv .venv
if ($LASTEXITCODE -ne 0) { throw 'Virtual environment creation failed' }
& .venv/Scripts/python.exe -m pip install --cache-dir .cache/pip -r backend/requirements.lock
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed' }
npm.cmd ci --cache .cache/npm
if ($LASTEXITCODE -ne 0) { throw 'Root dependency installation failed' }
npm.cmd --prefix frontend ci --cache .cache/npm
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' }
