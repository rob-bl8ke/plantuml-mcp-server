#!/usr/bin/env bash
#
# Generate PlantUML sequence diagrams using GitHub Copilot CLI
#
# This is a convenience wrapper that calls the recommended approach.
# For specific implementations, see:
#   - generate-markdown.sh: Uses Docker /markdown endpoint (returns complete markdown)
#   - generate-encode.sh:   Uses Docker /encode endpoint (constructs markdown locally)
#
# Usage:
#   ./generate.sh [TITLE] [SCENARIO] [BASE_URL]
#
# Arguments:
#   TITLE      - Title for the diagram (default: "login-sequence")
#   SCENARIO   - Description of the sequence to generate (default: login example)
#   BASE_URL   - PlantUML server URL (default: "http://localhost:8080")
#
# Examples:
#   # Use defaults
#   ./generate.sh
#
#   # Custom title
#   ./generate.sh "checkout-flow"
#
#   # Custom scenario
#   ./generate.sh "payment-flow" "User adds items to cart. Proceeds to checkout. Payment is processed."
#
#   # Use public PlantUML server
#   ./generate.sh "api-flow" "Client calls API. API validates request." "http://www.plantuml.com/plantuml"
#
# Prerequisites:
#   - GitHub Copilot CLI (copilot command)
#   - Docker services running (docker-compose up -d)
#   - jq installed (brew install jq)
#

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Call the recommended implementation (markdown endpoint)
exec "${SCRIPT_DIR}/generate-markdown.sh" "$@"

