<#
Generate PlantUML sequence diagrams using GitHub Copilot CLI and Docker service /markdown endpoint

Usage:
  .\generate-markdown.ps1 [TITLE] [SCENARIO] [BASE_URL]

Arguments:
  TITLE    - Title for the diagram (default: "login-sequence")
  SCENARIO - Description of the sequence to generate (default: login example)
  BASE_URL - PlantUML server URL (default: "http://localhost:9090/plantuml")

Prerequisites:
  - GitHub Copilot CLI (copilot command)
  - Docker services running (docker compose up -d)

How it works:
  1. Creates a temporary prompt file with the scenario injected
  2. Calls Copilot CLI to generate PlantUML
  3. Sends PlantUML to Docker service /markdown endpoint
  4. Service returns the encoded string
  5. Constructs markdown link locally
#>

param(
  [Parameter(Position = 0)]
  [string]$Title = 'login-sequence',

  [Parameter(Position = 1)]
  [string]$Scenario = 'A user logs in. The UI calls the Auth API. Credentials are validated. A JWT is issued and returned to the UI.',

  [Parameter(Position = 2)]
  [string]$BaseUrl = 'http://localhost:9090/plantuml'
)

$ErrorActionPreference = 'Stop'

$encoderBaseUrl = 'http://localhost:9091'
$templatePath = Join-Path $PSScriptRoot 'prompts\plantuml-sequence.txt'

if (-not (Test-Path -LiteralPath $templatePath)) {
  throw "Prompt template not found: $templatePath"
}

if (-not (Get-Command copilot -ErrorAction SilentlyContinue)) {
  throw "'copilot' command not found. Install GitHub Copilot CLI and ensure it's on PATH."
}

$tempPrompt = Join-Path $PSScriptRoot ('.copilot-prompt.' + [guid]::NewGuid().ToString('N') + '.txt')

try {
  $template = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
  $prompt = $template.Replace('{{SCENARIO}}', $Scenario)
  Set-Content -LiteralPath $tempPrompt -Value $prompt -Encoding UTF8

  # Use Copilot CLI to generate PlantUML from the scenario prompt
  # Redirect stderr to $null so CLI auth/permission messages don't contaminate stdout
  $rawCopilot = (& copilot -p $tempPrompt 2>$null) -join "`n"
  if ([string]::IsNullOrWhiteSpace($rawCopilot)) {
    throw 'Copilot returned empty output; cannot encode.'
  }

  # Extract the @startuml ... @enduml block from Copilot output
  # Note: \s is intentionally removed — @startuml may be followed directly by a newline
  $m = [regex]::Match($rawCopilot, '(?s)@startuml.*?@enduml')
  if (-not $m.Success) {
    $preview = $rawCopilot.Substring(0, [Math]::Min(500, $rawCopilot.Length)).Trim()
    throw "Could not find @startuml..@enduml block in Copilot output.`nCopilot returned:`n$preview"
  }

  # Strip any Copilot CLI noise lines that may have been written to stdout mid-stream.
  # A targeted blacklist is used rather than a whitelist so that legitimate PlantUML
  # lines (e.g. skinparam, hide, arbitrary labels) are never accidentally dropped.
  $noisePatterns = @(
    'Permission denied',
    'could not request permission',
    'Total usage est',
    'API time spent',
    'Total session time',
    'Total code changes',
    'Breakdown by AI model',
    'Premium request',
    'cached'
  )
  $cleanLines = $m.Value -split "`n" | Where-Object {
    $line = $_.Trim()
    $isNoise = $noisePatterns | Where-Object { $line -match [regex]::Escape($_) }
    -not $isNoise
  }
  $plantuml = ($cleanLines -join "`n").Trim()

  # Send PlantUML text to encoder service /markdown endpoint to get encoded string and markdown
  $resp = Invoke-RestMethod -Uri "$encoderBaseUrl/markdown" -Method Post -ContentType 'text/plain' -Body $plantuml
  if (-not $resp.encoded) {
    throw 'Encoder response missing encoded value.'
  }

  $encoded = [string]$resp.encoded

  # Generate the Markdown image link for the rendered SVG diagram
  $markdown = '![{0}]({1}/svg/{2} "{0}")' -f $Title, $BaseUrl.TrimEnd('/'), $encoded

  Write-Output $markdown
}
finally {
  Remove-Item -LiteralPath $tempPrompt -Force -ErrorAction SilentlyContinue
}
