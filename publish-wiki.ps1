<#
Publishes this Quartz wiki to GitHub Pages.

The content folder is a link to the Obsidian vault, so saving a note in Obsidian
is all that is needed before running this script.
#>

$ErrorActionPreference = "Stop"

$repository = Split-Path -Parent $PSCommandPath
Set-Location $repository
$settingsFile = Join-Path $repository "publish-settings.ps1"

if (-not (Test-Path -LiteralPath $settingsFile)) {
  throw "Missing publish-settings.ps1. Restore it from this project's setup files."
}

. $settingsFile

if ([string]::IsNullOrWhiteSpace($VaultPath) -or -not (Test-Path -LiteralPath $VaultPath -PathType Container)) {
  throw "The Obsidian vault path in publish-settings.ps1 does not exist: '$VaultPath'"
}

$contentDirectory = Join-Path $repository "content"
$contentItem = Get-Item -LiteralPath $contentDirectory -Force -ErrorAction SilentlyContinue

# GitHub cannot publish an external Windows symlink. On the first publish this
# replaces only the link itself (not the vault it points to) with a real folder.
if ($contentItem -and $contentItem.LinkType) {
  Remove-Item -LiteralPath $contentDirectory -Force
}

if (-not (Test-Path -LiteralPath $contentDirectory)) {
  New-Item -ItemType Directory -Path $contentDirectory | Out-Null
}

Write-Host "Syncing saved Obsidian notes..."
& robocopy $VaultPath $contentDirectory /MIR /XD ".obsidian" ".git" "private" "templates" /XF ".DS_Store"
if ($LASTEXITCODE -gt 7) {
  throw "Could not sync the vault (robocopy exit code $LASTEXITCODE)."
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Arguments -join ' ')"
  }
}

try {
  $branch = (& git branch --show-current).Trim()
  if ($branch -ne "main") {
    throw "This publisher is set up for the main branch, but the current branch is '$branch'."
  }

  Invoke-Git add --all
  & git diff --cached --quiet
  $hasChanges = $LASTEXITCODE -ne 0

  if ($hasChanges) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    Invoke-Git commit -m "Publish wiki: $timestamp"
  }

  # Bring down any changes made on GitHub before pushing this update.
  Invoke-Git pull --rebase origin main

  if ($hasChanges) {
    Invoke-Git push origin main
    Write-Host "`nPublished. GitHub Pages is now rebuilding the wiki." -ForegroundColor Green
  }
  else {
    Write-Host "`nThere were no local changes to publish. The branch is up to date." -ForegroundColor Yellow
  }
}
catch {
  Write-Host "`nPublish stopped: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Your notes were not deleted. Resolve the Git message above, then run Publish Wiki again." -ForegroundColor Yellow
  exit 1
}
