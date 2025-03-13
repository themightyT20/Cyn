#!/bin/bash

# Enable error handling
set -e

echo "=== Custom Build Script For Railway Deployment ==="
echo "📅 Start time: $(date)"
echo "🔧 Node version: $(node -v)"
echo "📦 NPM version: $(npm -v)"

# Function to handle errors
handle_error() {
  echo "❌ Error occurred on line $1"
  exit 1
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# Run the standard build process
echo "📦 Running npm build..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Create necessary directories
echo "📁 Creating directories structure..."
mkdir -p dist/public
mkdir -p dist/uploads
mkdir -p dist/training-data
mkdir -p dist/server

# Copy public assets
echo "🔄 Copying public assets..."
if [ -d "public" ]; then
  cp -r public/* dist/public/ 2>/dev/null || echo "⚠️ Some public files could not be copied"
  echo "✅ Public assets copied"
else
  echo "⚠️ No public directory found"
fi

# Copy training data and voice samples
echo "🔄 Copying training data..."
if [ -d "training-data" ]; then
  mkdir -p dist/training-data
  cp -r training-data/* dist/training-data/ 2>/dev/null || echo "⚠️ Some training data files could not be copied"
  echo "✅ Training data copied"
  
  # Verify voice samples specifically
  if [ -d "training-data/voice-samples" ]; then
    mkdir -p dist/training-data/voice-samples
    cp -r training-data/voice-samples/* dist/training-data/voice-samples/ 2>/dev/null || echo "⚠️ Some voice samples could not be copied"
    echo "✅ Voice samples copied"
  else
    echo "⚠️ No voice-samples directory found"
    # Create empty directory for later use
    mkdir -p dist/training-data/voice-samples
  fi
else
  echo "⚠️ No training-data directory found, creating empty directory" 
  mkdir -p dist/training-data/voice-samples
fi

# Ensure uploads directory exists and is writable
echo "📁 Ensuring uploads directory..."
mkdir -p dist/uploads
mkdir -p dist/uploads/voice-samples

# Copy main config files
echo "🔄 Copying configuration files..."
if [ -f "cyn-training-data.json" ]; then
  cp cyn-training-data.json dist/ || echo "⚠️ Could not copy cyn-training-data.json"
  echo "✅ Training data JSON copied"
else
  echo "⚠️ cyn-training-data.json not found"
fi

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 755 dist
chmod -R 777 dist/uploads  # Make uploads writable

# List directory structure for verification
echo "📋 Final directory structure:"
find dist -type d | sort

echo "✅ Build completed successfully"
echo "📅 End time: $(date)"