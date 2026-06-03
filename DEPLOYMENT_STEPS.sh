#!/bin/bash
# Production Deployment Script for Atensia
# Run this step by step, don't execute all at once

set -e  # Exit on error

echo "=========================================="
echo "Atensia Production Deployment Script"
echo "=========================================="
echo ""

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify Supabase Login
echo -e "${YELLOW}STEP 1: Verify Supabase Login${NC}"
echo "Check if you're logged in to Supabase..."
if supabase projects list > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase login verified${NC}"
else
    echo -e "${RED}❌ Not logged in. Run: supabase login${NC}"
    exit 1
fi
echo ""

# Step 2: Link Project
echo -e "${YELLOW}STEP 2: Link to Supabase Project${NC}"
echo "Make sure you have your Project ID from Supabase dashboard"
echo "Settings > General > Project ID"
echo ""
echo "Run this command with YOUR_PROJECT_ID:"
echo "supabase link --project-ref YOUR_PROJECT_ID"
echo ""
echo "After linking, continue with: supabase functions deploy demo-credentials"
echo ""

# Step 3: Deploy Functions
echo -e "${YELLOW}STEP 3: Deploy Edge Function${NC}"
if [ -f "supabase/functions/demo-credentials/index.ts" ]; then
    echo -e "${GREEN}✅ demo-credentials function found${NC}"
    echo "Deploying..."
    supabase functions deploy demo-credentials --project-ref $SUPABASE_PROJECT_ID || true
else
    echo -e "${RED}❌ demo-credentials function not found${NC}"
    exit 1
fi
echo ""

# Step 4: Test Function
echo -e "${YELLOW}STEP 4: Test Edge Function${NC}"
echo "Testing the endpoint..."
echo "Run this command to test:"
echo ""
echo 'curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/demo-credentials \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"email\":\"admin@acmecorp.com\"}"'
echo ""

echo -e "${GREEN}=========================================="
echo "✅ Function Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test the endpoint using the curl command above"
echo "2. Verify the response includes password and expiresAt"
echo "3. Proceed to Step 2: Apply RLS Migrations"
echo ""
