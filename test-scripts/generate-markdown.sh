#!/usr/bin/env bash
#
# Generate PlantUML sequence diagrams using GitHub Copilot CLI and Docker service /markdown endpoint
#
# Usage:
#   ./generate-markdown.sh [TITLE] [SCENARIO] [BASE_URL]
#
# Arguments:
#   TITLE      - Title for the diagram (default: "login-sequence")
#   SCENARIO   - Description of the sequence to generate (default: login example)
#   BASE_URL   - PlantUML server URL (default: "http://localhost:9090/plantuml")
#
# Examples:
#   # Use defaults
#   ./generate-markdown.sh
#
#   # Custom title
#   ./generate-markdown.sh "checkout-flow"
#
#   # Custom scenario
#   ./generate-markdown.sh "payment-flow" "User adds items to cart. Proceeds to checkout. Payment is processed."
#
#   # Use public PlantUML server
#   ./generate-markdown.sh "api-flow" "Client calls API. API validates request." "http://www.plantuml.com/plantuml"
#
# Prerequisites:
#   - GitHub Copilot CLI (copilot command)
#   - Docker services running (docker-compose up -d)
#   - jq installed (brew install jq)
#
# How it works:
#   1. Creates a temporary prompt file with the scenario injected
#   2. Calls Copilot CLI to generate PlantUML
#   3. Sends PlantUML to Docker service /markdown endpoint
#   4. Service returns the encoded string
#   5. Constructs markdown link locally using jq
#

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SCENARIO="${2:-A user logs in. The UI calls the Auth API. Credentials are validated. A JWT is issued and returned to the UI.}"
TITLE="${1:-login-sequence}"
BASE_URL="${3:-http://localhost:9090/plantuml}"

# Create temporary prompt with scenario (keep it under the repo so Copilot can read it)
TEMP_PROMPT=$(mktemp "${SCRIPT_DIR}/.copilot-prompt.XXXXXX.txt")
# Use perl instead of sed to safely handle SCENARIO values that contain '/' (e.g. URL paths)
perl -pe "s/\{\{SCENARIO\}\}/${SCENARIO//\//\\/}/g" "${SCRIPT_DIR}/prompts/plantuml-sequence.txt" > "$TEMP_PROMPT"

# Use Docker service /markdown endpoint
copilot -p "$TEMP_PROMPT" \
| sed -n '/^@startuml/,/^@enduml/p' \
| curl -s -X POST http://localhost:9091/markdown \
  -H "Content-Type: text/plain" \
  --data-binary @- \
| jq -r --arg title "$TITLE" --arg url "$BASE_URL" '"![\($title)](\($url)/svg/\(.encoded) \"\($title)\")"'

# Cleanup
rm -f "$TEMP_PROMPT"
