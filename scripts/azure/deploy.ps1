<#
  Builds the site and redeploys it to the Azure App Service demo.

    npm run deploy:azure

  Requires the Azure CLI, signed in to the subscription that holds the app (az login).
  The database and uploads live in DATA_DIR (/home/data) on the app's persistent disk,
  so redeploying never touches Willy's data. New migrations run automatically on startup.
#>
param(
  [string]$ResourceGroup = 'willys-drywall-demo',
  [string]$App = 'willys-drywall-demo-zgwef'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$out = Join-Path $root '.azure-build'
$pkg = Join-Path $out 'package'
$zip = Join-Path $out 'package.zip'
Set-Location $root

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" } }

Step 'Checking Azure sign-in'
az account show --query name -o tsv
if ($LASTEXITCODE -ne 0) { throw "Not signed in. Run 'az login' first." }

Step 'Building the site'
$env:NEXT_STANDALONE = 'true'
try { npx next build; Check 'next build' } finally { Remove-Item Env:NEXT_STANDALONE }

Step 'Assembling the package'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $pkg | Out-Null
$standalone = Join-Path $root '.next\standalone'
# Copy only what the server needs; standalone tracing also picks up local .data/ and uploads.
foreach ($item in 'node_modules', 'package.json', 'server.js', '.next') {
  Copy-Item (Join-Path $standalone $item) $pkg -Recurse
}
Copy-Item (Join-Path $root '.next\static') (Join-Path $pkg '.next\static') -Recurse
Copy-Item (Join-Path $root 'public') $pkg -Recurse
Remove-Item (Join-Path $pkg 'public\uploads') -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root 'drizzle') $pkg -Recurse
Copy-Item (Join-Path $PSScriptRoot 'start.sh') $pkg

Step 'Bundling setup scripts'
$banner = "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);"
foreach ($script in 'migrate', 'create-owner', 'create-api-key', 'clear-business-data') {
  npx esbuild "scripts/$script.ts" --bundle --platform=node --format=esm --target=node22 `
    --external:@electric-sql/pglite --external:pg --external:pg-native "--banner:js=$banner" `
    "--outfile=$pkg/setup/$script.mjs" --log-level=warning
  Check "esbuild $script"
}

Step 'Zipping'
# Build the zip by hand so entry names use '/' (Compress-Archive on PowerShell 5 writes '\', which breaks on Linux).
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
try {
  $prefix = $pkg.Length + 1
  Get-ChildItem $pkg -Recurse -File -Force | ForEach-Object {
    $name = $_.FullName.Substring($prefix).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $name, 'Optimal')
  }
} finally { $archive.Dispose() }
'{0:N0} MB' -f ((Get-Item $zip).Length / 1MB)

Step "Deploying to $App"
az webapp deploy -g $ResourceGroup -n $App --src-path $zip --type zip -o none
Check 'az webapp deploy'

Step 'Waiting for the site to respond'
$url = "https://$App.azurewebsites.net/login"
for ($i = 0; $i -lt 10; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 120
    Write-Host "Live: https://$App.azurewebsites.net ($($r.StatusCode))" -ForegroundColor Green
    exit 0
  } catch { Start-Sleep 15 }
}
throw "Site did not come up. Check logs: az webapp log tail -g $ResourceGroup -n $App"
