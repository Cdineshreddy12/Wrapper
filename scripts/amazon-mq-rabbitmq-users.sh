#!/bin/bash
# Amazon MQ for RabbitMQ - User Management Script
# Note: aws mq list-users/create-user/update-user only work for ActiveMQ.
# For RabbitMQ brokers, we use the RabbitMQ Management API.

set -e

BROKER_ID="b-a9633a38-d347-4b4e-8962-9b2a4646d7af"
REGION="us-east-1"
# Load from .env if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../backend/.env"
if [ -f "$ENV_FILE" ]; then
  source <(grep -E '^AMAZON_MQ_USERNAME=|^AMAZON_MQ_PASSWORD=' "$ENV_FILE" | sed 's/^/export /')
fi
USERNAME="${AMAZON_MQ_USERNAME:-Zopkit}"
PASSWORD="${AMAZON_MQ_PASSWORD:-Zopkitlaunch@2026}"

# Get broker console URL via AWS CLI
get_mgmt_url() {
  aws mq describe-broker --broker-id "$BROKER_ID" --region "$REGION" \
    --query 'BrokerInstances[0].ConsoleURL' --output text
}

MGMT_URL=$(get_mgmt_url)

list_users() {
  echo "=== Listing RabbitMQ users ==="
  curl -s -u "${USERNAME}:${PASSWORD}" "${MGMT_URL}/api/users" | jq -r '.[].name'
}

create_user() {
  local new_user="${1:-admin2}"
  local new_pass="${2:-StrongPassword123!}"
  echo "=== Creating user: $new_user ==="
  curl -s -u "${USERNAME}:${PASSWORD}" -X PUT \
    -H "content-type: application/json" \
    -d "{\"password\":\"${new_pass}\",\"tags\":\"management\"}" \
    "${MGMT_URL}/api/users/${new_user}"
  echo ""
  echo "Created user: $new_user"
}

update_password() {
  local target_user="$1"
  local new_pass="$2"
  if [ -z "$target_user" ] || [ -z "$new_pass" ]; then
    echo "Usage: $0 update <USERNAME> <NEW_PASSWORD>"
    exit 1
  fi
  echo "=== Resetting password for: $target_user ==="
  curl -s -u "${USERNAME}:${PASSWORD}" -X PUT \
    -H "content-type: application/json" \
    -d "{\"password\":\"${new_pass}\"}" \
    "${MGMT_URL}/api/users/${target_user}"
  echo ""
  echo "Password updated for: $target_user"
}

case "${1:-list}" in
  list)
    list_users
    ;;
  create)
    create_user "$2" "$3"
    ;;
  update)
    update_password "$2" "$3"
    ;;
  *)
    echo "Usage: $0 {list|create|update} [username] [password]"
    echo "  list                    - List all users"
    echo "  create [user] [pass]    - Create user (default: admin2 / StrongPassword123!)"
    echo "  update <user> <pass>    - Reset user password"
    exit 1
    ;;
esac
