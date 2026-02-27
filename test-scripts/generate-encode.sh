#!/usr/bin/env bash
#
# Generate PlantUML sequence diagrams using GitHub Copilot CLI and Docker service /encode endpoint
#
# Usage:
#   ./generate-encode.sh [TITLE] [SCENARIO] [BASE_URL]
#
# Arguments:
#   TITLE      - Title for the diagram (default: "login-sequence")
#   SCENARIO   - Description of the sequence to generate (default: login example)
#   BASE_URL   - PlantUML server URL (default: "http://localhost:8080")
#
# Examples:
#   # Use defaults
#   ./generate-encode.sh
#
#   # Custom title
#   ./generate-encode.sh "checkout-flow"
#
#   # Custom scenario
#   ./generate-encode.sh "payment-flow" "User adds items to cart. Proceeds to checkout. Payment is processed."
#
#   # Use public PlantUML server
#   ./generate-encode.sh "api-flow" "Client calls API. API validates request." "http://www.plantuml.com/plantuml"
#
# Prerequisites:
#   - GitHub Copilot CLI (copilot command)
#   - Docker services running (docker-compose up -d)
#   - jq installed (brew install jq)
#
# How it works:
#   1. Creates a temporary prompt file with the scenario injected
#   2. Calls Copilot CLI to generate PlantUML
#   3. Sends PlantUML to Docker service /encode endpoint
#   4. Service returns encoded string and URLs
#   5. Constructs markdown link locally using jq
#

set -e

SCENARIO="${2:-A user logs in. The UI calls the Auth API. Credentials are validated. A JWT is issued and returned to the UI.}"
TITLE="${1:-login-sequence}"
BASE_URL="${3:-http://localhost:8080}"

# Create temporary prompt with scenario
TEMP_PROMPT=$(mktemp)
cat prompts/plantuml-sequence.txt | sed "s|{{SCENARIO}}|${SCENARIO}|g" > "$TEMP_PROMPT"

# Use Docker service /encode endpoint and construct markdown locally
copilot -p "$TEMP_PROMPT" \
| curl -s -X POST http://localhost:9091/encode \
  -H "Content-Type: text/plain" \
  --data-binary @- \
| jq -r --arg title "$TITLE" --arg url "$BASE_URL" '"![\($title)](\($url)/svg/\(.encoded) \"\($title)\")"'

# Cleanup
rm -f "$TEMP_PROMPT"
