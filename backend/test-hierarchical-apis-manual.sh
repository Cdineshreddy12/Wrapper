#!/bin/bash

# Hierarchical Organizations & Locations API Manual Testing
# This script provides curl commands to test all the hierarchical API endpoints

echo "🚀 HIERARCHICAL ORGANIZATIONS & LOCATIONS API MANUAL TESTING"
echo "============================================================"
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TENANT_ID="893d8c75-68e6-4d42-92f8-45df62ef08b6"
USER_ID="50d4f694-202f-4f27-943d-7aafeffee29c"

# Variables to store created IDs
PARENT_ORG_ID=""
SUB_ORG_ID=""
LOCATION_ID=""

echo "📋 Testing Configuration:"
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "User ID: $USER_ID"
echo ""

# Function to make API calls and capture response
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo "🔄 $description"
    echo "📡 $method $BASE_URL$endpoint"

    if [ -n "$data" ]; then
        echo "📤 Data: $data"
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    fi

    echo "📊 Response: $response"
    echo ""

    # Extract IDs for later use
    if [[ $endpoint == *"/parent"* ]] && [[ $response == *"organizationId"* ]]; then
        PARENT_ORG_ID=$(echo $response | grep -o '"organizationId":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Parent Org ID: $PARENT_ORG_ID"
    elif [[ $endpoint == *"/sub"* ]] && [[ $response == *"organizationId"* ]]; then
        SUB_ORG_ID=$(echo $response | grep -o '"organizationId":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Sub Org ID: $SUB_ORG_ID"
    elif [[ $endpoint == *"/locations"* ]] && [[ $endpoint != *"/assign"* ]] && [[ $endpoint != *"/tenant"* ]] && [[ $response == *"locationId"* ]]; then
        LOCATION_ID=$(echo $response | grep -o '"locationId":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Location ID: $LOCATION_ID"
    fi
}

echo "🏢 TESTING ORGANIZATION ENDPOINTS"
echo "================================"

# 1. Create Parent Organization
call_api "POST" "/api/organizations/parent" "{
    \"name\": \"Manual Test Tech Corp $(date +%s)\",
    \"description\": \"Manual testing company\",
    \"gstin\": \"37AAAAA0000A1Z5\",
    \"parentTenantId\": \"$TENANT_ID\"
}" "Creating Parent Organization"

# 2. Get Parent Organization Details
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "GET" "/api/organizations/$PARENT_ORG_ID" "" "Getting Parent Organization Details"
fi

# 3. Create Sub-Organization
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "POST" "/api/organizations/sub" "{
        \"name\": \"Manual Test Dev Division $(date +%s)\",
        \"description\": \"Manual testing development department\",
        \"gstin\": \"37BBBBB0000B1Z5\",
        \"parentOrganizationId\": \"$PARENT_ORG_ID\"
    }" "Creating Sub-Organization"
fi

# 4. Get Sub-Organizations
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "GET" "/api/organizations/$PARENT_ORG_ID/sub-organizations" "" "Getting Sub-Organizations"
fi

# 5. Get Organization Hierarchy
call_api "GET" "/api/organizations/hierarchy/$TENANT_ID" "" "Getting Organization Hierarchy"

# 6. Update Organization
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "PUT" "/api/organizations/$PARENT_ORG_ID" "{
        \"organizationName\": \"Updated Manual Test Tech Corp $(date +%s)\",
        \"description\": \"Updated manual testing company\"
    }" "Updating Parent Organization"
fi

echo ""
echo "📍 TESTING LOCATION ENDPOINTS"
echo "============================="

# 7. Create Location
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "POST" "/api/locations" "{
        \"name\": \"Manual Test HQ $(date +%s)\",
        \"address\": \"123 Manual Test Street, Silicon Valley\",
        \"city\": \"San Francisco\",
        \"state\": \"California\",
        \"zipCode\": \"94105\",
        \"country\": \"USA\",
        \"organizationId\": \"$PARENT_ORG_ID\"
    }" "Creating Location"
fi

# 8. Get Organization Locations
if [ -n "$PARENT_ORG_ID" ]; then
    call_api "GET" "/api/organizations/$PARENT_ORG_ID/locations" "" "Getting Organization Locations"
fi

# 9. Get Location Details
if [ -n "$LOCATION_ID" ]; then
    call_api "GET" "/api/locations/$LOCATION_ID" "" "Getting Location Details"
fi

# 10. Get Tenant Locations
call_api "GET" "/api/locations/tenant/$TENANT_ID" "" "Getting Tenant Locations"

# 11. Update Location
if [ -n "$LOCATION_ID" ]; then
    call_api "PUT" "/api/locations/$LOCATION_ID" "{
        \"locationName\": \"Updated Manual Test HQ $(date +%s)\",
        \"address\": \"456 Updated Manual Test Street, Silicon Valley\"
    }" "Updating Location"
fi

# 12. Assign Location to Sub-Organization
if [ -n "$LOCATION_ID" ] && [ -n "$SUB_ORG_ID" ]; then
    call_api "POST" "/api/locations/$LOCATION_ID/assign/$SUB_ORG_ID" "" "Assigning Location to Sub-Organization"
fi

echo ""
echo "🧹 CLEANUP OPERATIONS (OPTIONAL)"
echo "==============================="

# 13. Remove Location from Sub-Organization
if [ -n "$LOCATION_ID" ] && [ -n "$SUB_ORG_ID" ]; then
    echo "🔗 Removing location from sub-organization..."
    echo "curl -X DELETE \"$BASE_URL/api/locations/$LOCATION_ID/organizations/$SUB_ORG_ID\""
fi

# 14. Delete Location
if [ -n "$LOCATION_ID" ]; then
    echo "🗑️ Deleting location..."
    echo "curl -X DELETE \"$BASE_URL/api/locations/$LOCATION_ID\""
fi

# 15. Delete Sub-Organization
if [ -n "$SUB_ORG_ID" ]; then
    echo "🗑️ Deleting sub-organization..."
    echo "curl -X DELETE \"$BASE_URL/api/organizations/$SUB_ORG_ID\""
fi

# 16. Delete Parent Organization
if [ -n "$PARENT_ORG_ID" ]; then
    echo "🗑️ Deleting parent organization..."
    echo "curl -X DELETE \"$BASE_URL/api/organizations/$PARENT_ORG_ID\""
fi

echo ""
echo "🎉 TESTING COMPLETE!"
echo "==================="
echo ""
echo "📊 Summary:"
echo "🏢 Parent Organization ID: $PARENT_ORG_ID"
echo "📂 Sub-Organization ID: $SUB_ORG_ID"
echo "📍 Location ID: $LOCATION_ID"
echo ""
echo "✅ All core endpoints have been tested!"
echo "🔧 Manual cleanup commands are shown above if needed."
