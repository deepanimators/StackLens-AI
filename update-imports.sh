#!/bin/bash

# StackLens AI - Import Path Update Script
# This script updates all import paths to match the new structure

set -e

echo "🔄 Updating Import Paths..."
echo "============================"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to update imports in a file
update_imports() {
    local file=$1
    local context=$2
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    print_info "Updating: $file"
    
    # Create temp file
    local temp_file=$(mktemp)
    
    # Update imports based on context
    case "$context" in
        "web")
            # Frontend import updates
            sed -E \
                -e 's|from ['\''"]@/components/|from "@/components/|g' \
                -e 's|from ['\''"]@/pages/|from "@/pages/|g' \
                -e 's|from ['\''"]@/hooks/|from "@/hooks/|g' \
                -e 's|from ['\''"]@/contexts/|from "@/contexts/|g' \
                -e 's|from ['\''"]@/lib/|from "@/lib/|g' \
                -e 's|from ['\''"]@shared/|from "@shared/|g' \
                -e 's|from ['\''"]\.\.\/shared/|from "@shared/|g' \
                -e 's|from ['\''"]\.\.\/\.\.\/shared/|from "@shared/|g' \
                -e 's|from ['\''"]@db/|from "@db/|g' \
                "$file" > "$temp_file"
            ;;
            
        "api")
            # Backend import updates
            sed -E \
                -e 's|from ['\''"]\.\.\/db['\''"]|from "@/config/database"|g' \
                -e 's|from ['\''"]\.\.\/firebase-auth['\''"]|from "@/config/firebase"|g' \
                -e 's|from ['\''"]\.\.\/vite['\''"]|from "@/vite"|g' \
                -e 's|from ['\''"]\.\/routes['\''"]|from "@/routes"|g' \
                -e 's|from ['\''"]\.\/services/|from "@/services/|g' \
                -e 's|from ['\''"]\.\.\/services/|from "@/services/|g' \
                -e 's|from ['\''"]\.\/middleware/|from "@/middleware/|g' \
                -e 's|from ['\''"]\.\.\/\.\.\/shared/|from "@shared/|g' \
                -e 's|from ['\''"]shared/|from "@shared/|g' \
                -e 's|from ['\''"]@db/|from "@db/|g' \
                "$file" > "$temp_file"
            ;;
            
        "shared")
            # Shared package imports
            sed -E \
                -e 's|from ['\''"]\.\/types/|from "@shared/types/|g' \
                -e 's|from ['\''"]\.\/utils/|from "@shared/utils/|g' \
                -e 's|from ['\''"]\.\/constants/|from "@shared/constants/|g' \
                "$file" > "$temp_file"
            ;;
            
        "database")
            # Database package imports  
            sed -E \
                -e 's|from ['\''"]\.\.\/shared/|from "@shared/|g' \
                -e 's|from ['\''"]\.\/schema/|from "@db/schema/|g' \
                "$file" > "$temp_file"
            ;;
    esac
    
    # Replace original file if changes were made
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        print_success "Updated: $file"
    else
        rm "$temp_file"
    fi
}

# Update all TypeScript/JavaScript files in web app
print_info "Updating web app imports..."
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read file; do
    update_imports "$file" "web"
done

# Update all TypeScript/JavaScript files in API
print_info "Updating API imports..."
find apps/api/src -type f \( -name "*.ts" -o -name "*.js" \) | while read file; do
    update_imports "$file" "api"
done

# Update shared package imports
print_info "Updating shared package imports..."
if [ -d "packages/shared/src" ]; then
    find packages/shared/src -type f \( -name "*.ts" -o -name "*.js" \) | while read file; do
        update_imports "$file" "shared"
    done
fi

# Update database package imports
print_info "Updating database package imports..."
if [ -d "packages/database/src" ]; then
    find packages/database/src -type f \( -name "*.ts" -o -name "*.js" \) | while read file; do
        update_imports "$file" "database"
    done
fi

print_success "Import path updates complete!"
echo ""
echo "Please review the changes and run:"
echo "  npm run build"
echo "to verify everything compiles correctly."
