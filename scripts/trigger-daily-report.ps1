param(
    [string]$Url = "https://daily-report-api-tan.vercel.app/api/reports/daily",
    [switch]$DryRun
)

$target = if ($DryRun) { "$Url`?dryRun=true" } else { $Url }

Write-Host "POST $target"
curl.exe -X POST $target
