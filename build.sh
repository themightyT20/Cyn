#!/bin/bash

echo "=== Custom Build Script ==="

# Run the standard build process
echo "📦 Running npm build..."
npm run build

# Create necessary directories
echo "📁 Creating directories structure..."
mkdir -p dist/public
mkdir -p dist/uploads

# Copy public assets
echo "🔄 Copying public assets..."
if [ -d "public" ]; then
  cp -r public/* dist/public/ 2>/dev/null || :
  echo "✅ Public assets copied"
else
  echo "⚠️ No public directory found"
fi

# Copy training data and voice samples
echo "🔄 Copying training data..."
if [ -d "training-data" ]; then
  mkdir -p dist/training-data
  cp -r training-data dist/ 2>/dev/null || :
  echo "✅ Training data copied"
else
  echo "⚠️ No training-data directory found" 
fi

# Ensure uploads directory
echo "📁 Ensuring uploads directory..."
mkdir -p dist/uploads

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 755 dist

echo "✅ Build completed successfully"