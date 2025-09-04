#!/bin/bash

# Hierarchical Organizations & Locations API - Curl Testing Script
# This script provides comprehensive curl commands to test all endpoints

echo "🚀 TESTING HIERARCHICAL ORGANIZATIONS & LOCATIONS APIs"
echo "======================================================"
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TENANT_ID="893d8c75-68e6-4d42-92f8-45df62ef08b6"
USER_ID="50d4f694-202f-4f27-943d-7aafeffee29c"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables to store created IDs
PARENT_ORG_ID=""
SUB_ORG_ID=""
LOCATION_ID=""

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "User ID: $USER_ID"
echo ""

# Function to test API endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local expected_status=${5:-200}

    echo -e "${YELLOW}🔄 Testing: $description${NC}"
    echo -e "${YELLOW}📡 $method $BASE_URL$endpoint${NC}"

    local response=""
    local status_code=""

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
        status_code=$(echo "$response" | tail -n1)
        response=$(echo "$response" | sed '$d')
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
        status_code=$(echo "$response" | tail -n1)
        response=$(echo "$response" | sed '$d')
    fi

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ Status: $status_code (Expected: $expected_status)${NC}"
    else
        echo -e "${RED}❌ Status: $status_code (Expected: $expected_status)${NC}"
    fi

    # Pretty print JSON response if it's valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo "$response" | jq '.'
    else
        echo "$response"
    fi

    echo ""

    # Extract IDs for later use
    if [[ $endpoint == *"/parent"* ]] && [[ $response == *"organizationId"* ]]; then
        PARENT_ORG_ID=$(echo "$response" | jq -r '.organization.organizationId // empty')
        if [ -n "$PARENT_ORG_ID" ]; then
            echo -e "${GREEN}✅ Parent Org ID: $PARENT_ORG_ID${NC}"
        fi
    elif [[ $endpoint == *"/sub"* ]] && [[ $response == *"organizationId"* ]]; then
        SUB_ORG_ID=$(echo "$response" | jq -r '.organization.organizationId // empty')
        if [ -n "$SUB_ORG_ID" ]; then
            echo -e "${GREEN}✅ Sub Org ID: $SUB_ORG_ID${NC}"
        fi
    elif [[ $endpoint == *"/locations"* ]] && [[ $endpoint != *"/assign"* ]] && [[ $endpoint != *"/tenant"* ]] && [[ $response == *"locationId"* ]]; then
        LOCATION_ID=$(echo "$response" | jq -r '.location.locationId // empty')
        if [ -n "$LOCATION_ID" ]; then
            echo -e "${GREEN}✅ Location ID: $LOCATION_ID${NC}"
        fi
    fi
}

echo "🏢 TESTING ORGANIZATION ENDPOINTS"
echo "================================"

# 1. Create Parent Organization
test_endpoint "POST" "/api/organizations/parent" "{
    \"name\": \"API Test Tech Corp $(date +%s)\",
    \"description\": \"API test company for hierarchical organizations\",
    \"gstin\": \"37AAAAA0000A1Z5\",
    \"parentTenantId\": \"$TENANT_ID\"
}" "Create Parent Organization"

# 2. Get Parent Organization Details
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "GET" "/api/organizations/$PARENT_ORG_ID" "" "Get Parent Organization Details"
fi

# 3. Create Sub-Organization
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "POST" "/api/organizations/sub" "{
        \"name\": \"API Test Dev Division $(date +%s)\",
        \"description\": \"API test software development department\",
        \"gstin\": \"37BBBBB0000B1Z5\",
        \"parentOrganizationId\": \"$PARENT_ORG_ID\"
    }" "Create Sub-Organization"
fi

# 4. Get Sub-Organizations
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "GET" "/api/organizations/$PARENT_ORG_ID/sub-organizations" "" "Get Sub-Organizations"
fi

# 5. Get Organization Hierarchy
test_endpoint "GET" "/api/organizations/hierarchy/$TENANT_ID" "" "Get Organization Hierarchy"

# 6. Update Organization
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "PUT" "/api/organizations/$PARENT_ORG_ID" "{
        \"organizationName\": \"Updated API Test Tech Corp $(date +%s)\",
        \"description\": \"Updated API test company description\"
    }" "Update Parent Organization"
fi

echo ""
echo "📍 TESTING LOCATION ENDPOINTS"
echo "============================="

# 7. Create Location
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "POST" "/api/locations" "{
        \"name\": \"API Test HQ $(date +%s)\",
        \"address\": \"123 API Test Street, Silicon Valley\",
        \"city\": \"San Francisco\",
        \"state\": \"California\",
        \"zipCode\": \"94105\",
        \"country\": \"USA\",
        \"organizationId\": \"$PARENT_ORG_ID\"
    }" "Create Location"
fi

# 8. Get Organization Locations
if [ -n "$PARENT_ORG_ID" ]; then
    test_endpoint "GET" "/api/organizations/$PARENT_ORG_ID/locations" "" "Get Organization Locations"
fi

# 9. Get Location Details
if [ -n "$LOCATION_ID" ]; then
    test_endpoint "GET" "/api/locations/$LOCATION_ID" "" "Get Location Details"
fi

# 10. Get Tenant Locations
test_endpoint "GET" "/api/locations/tenant/$TENANT_ID" "" "Get Tenant Locations"

# 11. Update Location
if [ -n "$LOCATION_ID" ]; then
    test_endpoint "PUT" "/api/locations/$LOCATION_ID" "{
        \"locationName\": \"Updated API Test HQ $(date +%s)\",
        \"address\": \"456 Updated API Test Street, Silicon Valley\"
    }" "Update Location"
fi

# 12. Assign Location to Sub-Organization
if [ -n "$LOCATION_ID" ] && [ -n "$SUB_ORG_ID" ]; then
    test_endpoint "POST" "/api/locations/$LOCATION_ID/assign/$SUB_ORG_ID" "" "Assign Location to Sub-Organization"
fi

echo ""
echo "🧹 CLEANUP OPERATIONS (OPTIONAL)"
echo "==============================="

# 13. Remove Location from Sub-Organization
if [ -n "$LOCATION_ID" ] && [ -n "$SUB_ORG_ID" ]; then
    echo -e "${YELLOW}🔗 Removing location from sub-organization...${NC}"
    test_endpoint "DELETE" "/api/locations/$LOCATION_ID/organizations/$SUB_ORG_ID" "" "Remove Location from Sub-Organization" 200
fi

# 14. Delete Location
if [ -n "$LOCATION_ID" ]; then
    echo -e "${YELLOW}🗑️ Deleting location...${NC}"
    test_endpoint "DELETE" "/api/locations/$LOCATION_ID" "" "Delete Location" 200
fi

# 15. Delete Sub-Organization
if [ -n "$SUB_ORG_ID" ]; then
    echo -e "${YELLOW}🗑️ Deleting sub-organization...${NC}"
    test_endpoint "DELETE" "/api/organizations/$SUB_ORG_ID" "" "Delete Sub-Organization" 200
fi

# 16. Delete Parent Organization
if [ -n "$PARENT_ORG_ID" ]; then
    echo -e "${YELLOW}🗑️ Deleting parent organization...${NC}"
    test_endpoint "DELETE" "/api/organizations/$PARENT_ORG_ID" "" "Delete Parent Organization" 200
fi

echo ""
echo "🎉 TESTING COMPLETE!"
echo "==================="
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo "🏢 Parent Organization ID: $PARENT_ORG_ID"
echo "📂 Sub-Organization ID: $SUB_ORG_ID"
echo "📍 Location ID: $LOCATION_ID"
echo ""
echo -e "${GREEN}✅ All core endpoints have been tested!${NC}"
echo ""
echo -e "${YELLOW}💡 Note: Cleanup operations use soft delete, so data is preserved for testing.${NC}"
