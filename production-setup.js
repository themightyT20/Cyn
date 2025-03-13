import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script ensures the proper directory structure for the production build
console.log('Running production setup...');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// Check if we're in a Railway deployment environment
const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_ID;
if (isRailway) {
  console.log('Detected Railway deployment environment');
  
  // Create public directory if it doesn't exist in the right location
  const distPublicDir = path.resolve(__dirname, 'dist', 'public');
  const created = ensureDirectoryExists(distPublicDir);
  
  if (created) {
    // If directory was created, copy public files
    const buildPublicDir = path.resolve(__dirname, 'public');
    
    if (fs.existsSync(buildPublicDir)) {
      console.log(`Copying files from ${buildPublicDir} to ${distPublicDir}`);
      
      // Simple recursive directory copy function
      const copyDir = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          
          if (entry.isDirectory()) {
            ensureDirectoryExists(destPath);
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(buildPublicDir, distPublicDir);
      console.log('Files copied successfully');
    } else {
      console.warn(`Public directory ${buildPublicDir} not found - skipping copy`);
    }
  } else {
    console.log(`Directory ${distPublicDir} already exists`);
  }
}

console.log('Production setup complete');