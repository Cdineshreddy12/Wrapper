#!/bin/bash

TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc1OTU1MDEyMSwiaWF0IjoxNzU5NDYzNzIxLCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6ImQ1NzJkNGM3LTM3NTEtNDNjYS05NzYyLTJjMDM3MGQ2OWIxMCIsIm9yZ19jb2RlIjoib3JnX2NiNTkzZDEzNjA5OTlhIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9hZTcwZDM4MjQ0YjE0OWQwYWRiNWE3MzVmYzQ5YTNkMiJ9.h8J85MZaukNDgJILa3_SDqCXCozAams9cRnbkRtXUICrXTj-wsBTZtERHMlSPKsv1XSyaJ2IUy8cByjgSiyqG8JDkRHFhLS3UFIxYrJGLltNZ-NIKsv-Y72kJ2f2pO5ibmQD3z_frcSebGkwIDF5KddX13MNgWOKi5PjDzJeg0EWXp1TmJlPqdZ46GJR6yoCayRD-ZbZ2ZmU06aGHIuzbFF-pQYjKmmu1-7ZMnziv-UwBQcq9KSeizqB5wImdPnxubtCb4ysaj7p_LDaxEl9AczuYK8OKpI-mN1IJGNvKC4To5CjpsQp9FRTNJkLcsodJ0w7Jp9B3Eualz13XwnjTw"
BASE_URL="http://localhost:3000"
TENANT_ID="b0a6e370-c1e5-43d1-94e0-55ed792274c4"

echo "🚀 Testing All Wrapper CRM Sync Endpoints"
echo "========================================"

# Test each endpoint
echo "1. Data Requirements:"
curl -s -X GET "$BASE_URL/api/wrapper/data-requirements" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "2. Sync Status:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/sync/status" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "3. Trigger Sync:"
curl -s -X POST "$BASE_URL/api/wrapper/tenants/$TENANT_ID/sync?skipReferenceData=true&forceSync=true" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "4. Tenant Info:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "5. User Profiles:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/users" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "6. Organizations:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/organizations" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "7. Detailed Users:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/tenant-users" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "8. Roles:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/roles" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "9. Credit Configs:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/credit-configs" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "10. Entity Credits:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/entity-credits" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "11. Employee Assignments:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/employee-assignments" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo "12. Role Assignments:"
curl -s -X GET "$BASE_URL/api/wrapper/tenants/$TENANT_ID/role-assignments" -H "Authorization: Bearer $TOKEN" | jq .success 2>/dev/null || echo "❌ Failed"

echo ""
echo "✅ Test completed!"
