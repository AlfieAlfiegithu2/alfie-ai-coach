#!/bin/bash
# scripts/doctor.sh - Comprehensive health check for the English AIdol codebase

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find project root (where the .git folder is)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

echo -e "${BLUE}🤖 English AIdol Health Doctor${NC}"
echo "=================================="
echo "Project Root: $PROJECT_ROOT"

# 1. Environment Check
echo -e "\n${BLUE}Step 1: Environment Check${NC}"
if [ -d "$PROJECT_ROOT/apps/main/node_modules" ]; then
    echo -e "${GREEN}✅ node_modules found${NC}"
else
    echo -e "${RED}❌ node_modules missing. Run 'npm install' in apps/main${NC}"
fi

# 2. Supabase Types Sync Check
echo -e "\n${BLUE}Step 2: Supabase Types Check${NC}"
TYPES_FILE="$PROJECT_ROOT/apps/main/src/integrations/supabase/types.ts"
if [ -f "$TYPES_FILE" ]; then
    # Check if file contains "Reset password" which might indicate an error or old content
    if grep -q "Reset password" "$TYPES_FILE"; then
        echo -e "${YELLOW}⚠️  Warning: $TYPES_FILE seems to contain non-type content (possibly garbage output).${NC}"
        echo "Please regenerate types using: npx supabase gen types typescript --project-id cuumxmfzhwljylbdlflj > $TYPES_FILE"
    else
        echo -e "${GREEN}✅ Types file exists and looks valid${NC}"
    fi
else
    echo -e "${RED}❌ $TYPES_FILE missing!${NC}"
fi

# 3. ESLint - React Hooks Rules
echo -e "\n${BLUE}Step 3: React Hooks & Logic Check (ESLint)${NC}"
if [ -d "$PROJECT_ROOT/apps/main" ]; then
    cd "$PROJECT_ROOT/apps/main"
    HOOKS_ERRORS=$(npx eslint src --rulesdir .eslintrules --rule 'react_hooks/rules-of-hooks: error' 2>&1 | grep -c "error")

    if [ "$HOOKS_ERRORS" -eq "0" ]; then
        echo -e "${GREEN}✅ No React Hooks violations found!${NC}"
    else
        echo -e "${RED}❌ Found $HOOKS_ERRORS React Hooks violations!${NC}"
        echo "Run 'npx eslint src' to see details."
    fi
else
    echo -e "${RED}❌ apps/main directory not found${NC}"
fi

# 4. TypeScript Type Check
echo -e "\n${BLUE}Step 4: TypeScript Integrity Check${NC}"
if [ -d "$PROJECT_ROOT/apps/main" ]; then
    cd "$PROJECT_ROOT/apps/main"
    if npx tsc --noEmit; then
        echo -e "${GREEN}✅ TypeScript check passed!${NC}"
    else
        echo -e "${RED}❌ TypeScript check failed!${NC}"
    fi
fi

# 5. Build Configuration
echo -e "\n${BLUE}Step 5: Build Configuration Check${NC}"
VERIFY_SCRIPT="$PROJECT_ROOT/apps/main/scripts/verify-build.js"
if [ -f "$VERIFY_SCRIPT" ]; then
    if node "$VERIFY_SCRIPT"; then
        echo -e "${GREEN}✅ Build configuration is valid${NC}"
    else
        echo -e "${RED}❌ Build configuration check failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  verify-build.js missing at $VERIFY_SCRIPT${NC}"
fi

echo -e "\n${BLUE}==================================${NC}"
echo -e "${GREEN}Doctor check complete!${NC}"
if [ "$HOOKS_ERRORS" -gt "0" ]; then
    echo -e "${YELLOW}Advice: Fix the React Hooks violations before proceeding.${NC}"
fi
echo -e "${BLUE}Tip: Keep your Supabase types in sync with:${NC}"
echo "npx supabase gen types typescript --project-id cuumxmfzhwljylbdlflj > src/integrations/supabase/types.ts"

echo -e "\n${BLUE}==================================${NC}"
echo -e "${GREEN}Doctor check complete!${NC}"
if [ "$HOOKS_ERRORS" -gt "0" ]; then
    echo -e "${YELLOW}Advice: Fix the React Hooks violations before proceeding.${NC}"
fi
echo -e "${BLUE}Tip: Keep your Supabase types in sync with:${NC}"
echo "npx supabase gen types typescript --project-id cuumxmfzhwljylbdlflj > src/integrations/supabase/types.ts"
