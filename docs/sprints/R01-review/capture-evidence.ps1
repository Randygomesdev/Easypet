$ErrorActionPreference = 'Stop'
$reviewRoot = $PSScriptRoot
$repoRoot = [IO.Path]::GetFullPath((Join-Path $reviewRoot '../../..'))
Push-Location $repoRoot
try {
  $paths = @(& rg --files Frontend/src Frontend/e2e Backend scripts/production docs/sprints -g '!R01-review/**' -g '!**/target/**' -g '!**/build/**' -g '!**/node_modules/**' -g '!**/.gradle/**' -g '!**/R01-review/**')
  $paths += 'Frontend/nginx.homolog.conf', 'compose.homolog.yml', 'Frontend/package.json'
  $files = foreach ($path in ($paths | Sort-Object -Unique)) {
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $item = Get-Item -LiteralPath $path
      [pscustomobject]@{path=$item.FullName;sha256=(Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash;lastWriteUtc=$item.LastWriteTimeUtc.ToString('o')}
    }
  }
  $snapshot = [pscustomobject]@{capturedAtUtc=[DateTime]::UtcNow.ToString('o');head=(& git rev-parse HEAD);files=$files}
  $snapshot | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $reviewRoot 'snapshot-final.json')
  $reports = foreach ($file in (Get-ChildItem Backend -Filter 'TEST-*.xml' -Recurse)) {
    [xml]$report = Get-Content -LiteralPath $file.FullName
    $suite = $report.testsuite
    [pscustomobject]@{path=$file.FullName;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash;updatedAtUtc=$file.LastWriteTimeUtc.ToString('o');name=$suite.name;tests=$suite.tests;errors=$suite.errors;failures=$suite.failures;skipped=$suite.skipped}
  }
  $reports | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $reviewRoot 'test-report-summary.json')
  [pscustomobject]@{capturedAtUtc=$snapshot.capturedAtUtc;head=$snapshot.head;files=$files.Count;reports=$reports.Count} | ConvertTo-Json -Compress
} finally { Pop-Location }
