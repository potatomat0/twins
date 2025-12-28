#!/usr/bin/env bash
# Sends 3 messages from nhat -> niche_foucault. Fetches fresh JWT each run.

EMAIL="nhat@example.com"
PASSWORD="Matkhautwins1!"
API_URL="https://gkbcdqpkjxdjjgolvgeg.supabase.co"
ANON_KEY="sb_publishable_sJUBrmfdJHD1ZMhCQ-HALw_VBM18YdO"
MATCH_ID="4f74447f-0caa-4d1a-a40c-9816f36fc366"
SENDER_ID="485d5524-89cc-44c3-9800-bdaaf76755b7"    # nhat
RECEIVER_ID="9357caf4-c648-4a65-a2e0-fb7646bd2e29" # niche_foucault

set -euo pipefail

# Get fresh access token
ACCESS_TOKEN=$(curl -s -X POST "$API_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to fetch access token" >&2
  exit 1
fi

i=1
for body in \
  "you will get a job" \
  "u probably be poor though" \
  "but youll still have your integrity" 
do
  echo "Sending ($i/3): $body"
  curl -s -X POST "$API_URL/rest/v1/messages" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"match_id\":\"$MATCH_ID\",\"sender_id\":\"$SENDER_ID\",\"receiver_id\":\"$RECEIVER_ID\",\"body\":\"$body\",\"status\":\"sent\"}"
  echo -e "\n---"
  i=$((i+1))
  sleep 5
done
