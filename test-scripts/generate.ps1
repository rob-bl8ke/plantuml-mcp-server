<#
Generate PlantUML sequence diagrams using GitHub Copilot CLI (PowerShell)

This is a convenience wrapper that calls the recommended approach.
For specific implementations, see:
  - generate-markdown.ps1: Uses Docker /markdown endpoint
  - generate-encode.ps1:   Uses Docker /encode endpoint

Usage:
  .\generate.ps1 [TITLE] [SCENARIO] [BASE_URL]

Arguments:
  TITLE    - Title for the diagram (default: "login-sequence")
  SCENARIO - Description of the sequence to generate (default: login example)
  BASE_URL - PlantUML server URL (default: "http://localhost:9090/plantuml")
#>

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'generate-markdown.ps1') @args
