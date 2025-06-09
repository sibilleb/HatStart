#!/bin/bash

# Fix manifest imports
echo "Fixing manifest imports..."

# Update manifest-types to simple-manifest-types
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/manifest-types/simple-manifest-types/g' {} +

# Update manifest-loader to simple-manifest-loader  
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/manifest-loader/simple-manifest-loader/g' {} +

# Update manifest-validator to simple-manifest-validator
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/manifest-validator/simple-manifest-validator/g' {} +

# Remove .js extensions from imports
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/\.js"/""/g' {} +
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s/\.js'/'/g" {} +

echo "Import fixes complete!"