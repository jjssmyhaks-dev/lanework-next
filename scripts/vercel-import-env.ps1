# Import .env.local to Vercel
# Run after: npx vercel link (which you just did)

$envFile = ".env.local"
$lines = Get-Content $envFile

foreach ($line in $lines) {
  $line = $line.Trim()
  if ($line -match "^#" -or $line -eq "") { continue }
  if ($line -match "^(.*?)=(.*)$") {
    $key = $matches[1].Trim()
    $val = $matches[2].Trim().Trim('"').Trim("'")
    
    # Skip empty values
    if (-not $val) { continue }
    
    Write-Host "Setting $key ..."
    
    # NEXTAUTH_URL should point to Vercel URL in production
    $prodVal = if ($key -eq "NEXTAUTH_URL") { "https://lanework.vercel.app" } else { $val }
    
    # Set for production, preview, and development
    foreach ($env in @("production", "preview", "development")) {
      $targetVal = if ($env -eq "production") { $prodVal } else { $val }
      $targetVal | npx vercel env add $key $env --force 2>&1 | Out-Null
      Write-Host "  -> $env"
    }
  }
}

Write-Host ""
Write-Host "Done! All env vars imported to Vercel."
Write-Host "Run: npx vercel env ls to verify"
