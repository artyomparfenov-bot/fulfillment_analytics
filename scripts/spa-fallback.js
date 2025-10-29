#!/usr/bin/env node

/**
 * SPA Fallback Script for Timeweb Cloud
 * 
 * Timeweb Cloud supports 200.html as a fallback for SPA routing
 * This script copies index.html to 200.html to handle direct links
 * 
 * Usage: node scripts/spa-fallback.js
 */

import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);
const distPublic = path.join(projectRoot, "dist", "public");
const indexHtml = path.join(distPublic, "index.html");
const fallbackHtml = path.join(distPublic, "200.html");

async function createSPAFallback() {
  try {
    // Ensure dist/public directory exists
    await mkdir(dirname(fallbackHtml), { recursive: true });
    
    // Copy index.html to 200.html
    await copyFile(indexHtml, fallbackHtml);
    
    console.log("✅ SPA fallback created: dist/public/200.html");
    console.log("   This enables Timeweb to serve index.html for all routes");
  } catch (error) {
    console.error("❌ Failed to create SPA fallback:", error);
    process.exit(1);
  }
}

createSPAFallback();

