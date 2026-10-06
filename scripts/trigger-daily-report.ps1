param(
    [string]$Url = "https://daily-report-api-tan.vercel.app/reports/daily",
    [switch]$DryRun,
    [switch]$Force
)

$target = "$Url"
$params = @()
if ($DryRun) { $params += "dryRun=true" }
if ($Force) { $params += "force=true" }
if ($params.Count -gt 0) {
    $target = "$target?" + ($params -join "&")
}

Write-Host "Triggering Daily Reports (Traffic Analysis + Leads Summary)..."
Write-Host "POST $target"
curl.exe -X POST $target -H "Content-Type: application/json"
