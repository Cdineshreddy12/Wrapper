#!/bin/bash

# Simple API Testing - No executable permissions needed
# Run with: bash test-apis-simple.sh

echo "🧪 SIMPLE HIERARCHICAL API TEST"
echo "================================"

# Configuration
BASE_URL="http://localhost:3000"
TENANT_ID="893d8c75-68e6-4d42-92f8-45df62ef08b6"

echo "📡 Testing basic connectivity..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/health"

echo ""
echo "🏢 Testing Parent Organization Creation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/organizations/parent" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Simple Test Corp $(date +%s)\",
    \"description\": \"Simple test company\",
    \"gstin\": \"37AAAAA0000A1Z0\",
    \"parentTenantId\": \"$TENANT_ID\"
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Extract organization ID if successful
ORG_ID=$(echo "$RESPONSE" | grep -o '"organizationId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ORG_ID" ]; then
    echo ""
    echo "✅ Organization created successfully!"
    echo "🏢 Organization ID: $ORG_ID"

    echo ""
    echo "📂 Testing Sub-Organization Creation..."
    SUB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/organizations/sub" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Simple Dev Division $(date +%s)\",
        \"description\": \"Simple dev department\",
        \"gstin\": \"37BBBBB0000B1Z0\",
        \"parentOrganizationId\": \"$ORG_ID\"
      }")

    echo "Sub-Org Response:"
    echo "$SUB_RESPONSE" | jq '.' 2>/dev/null || echo "$SUB_RESPONSE"

    echo ""
    echo "📍 Testing Location Creation..."
    LOC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/locations" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Simple HQ $(date +%s)\",
        \"address\": \"123 Simple Street\",
        \"city\": \"Simple City\",
        \"state\": \"Simple State\",
        \"zipCode\": \"12345\",
        \"country\": \"USA\",
        \"organizationId\": \"$ORG_ID\"
      }")

    echo "Location Response:"
    echo "$LOC_RESPONSE" | jq '.' 2>/dev/null || echo "$LOC_RESPONSE"
fi

echo ""
echo "🌳 Testing Organization Hierarchy..."
HIERARCHY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/organizations/hierarchy/$TENANT_ID")
echo "Hierarchy Response:"
echo "$HIERARCHY_RESPONSE" | jq '.' 2>/dev/null || echo "$HIERARCHY_RESPONSE"

echo ""
echo "🎉 TEST COMPLETE!"
echo "================="
echo "If you see JSON responses above, the APIs are working correctly!"
echo "If you see HTML error pages or connection errors, check if the server is running."
