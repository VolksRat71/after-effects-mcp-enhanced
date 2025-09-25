/**
 * Build script for ExtendScript JSX files
 * Combines modular JSX files and injects dynamic paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the absolute path to the build temp directory
const projectRoot = path.resolve(__dirname, '..');
const buildTempPath = path.join(projectRoot, 'build', 'temp').replace(/\\/g, '/');

console.log(`Building JSX with temp path: ${buildTempPath}`);

// Read all module files
const modulesDir = path.join(projectRoot, 'src', 'scripts', 'modules');
const modules = [
  'json-polyfill.jsx',
  'file-operations.jsx',
  'ui-window.jsx',
  'composition-operations.jsx',
  'layer-operations.jsx',
  'effects-operations.jsx',
  'media-operations.jsx',
  'command-executor.jsx',
  'bridge-main.jsx'
];

// Read the main bridge file
const mainBridgePath = path.join(projectRoot, 'src', 'scripts', 'mcp-bridge-auto.jsx');
let mainBridgeContent = fs.readFileSync(mainBridgePath, 'utf8');

// Build the combined content
let combinedContent = '// MCP Bridge Auto - Built ' + new Date().toISOString() + '\n\n';

// Add each module
modules.forEach(moduleName => {
  const modulePath = path.join(modulesDir, moduleName);
  if (fs.existsSync(modulePath)) {
    let moduleContent = fs.readFileSync(modulePath, 'utf8');

    // Replace the placeholder with actual path
    moduleContent = moduleContent.replace(/\{\{MCP_TEMP_PATH\}\}/g, buildTempPath);

    combinedContent += `// === Module: ${moduleName} ===\n`;
    combinedContent += moduleContent + '\n\n';
  } else {
    console.warn(`Warning: Module ${moduleName} not found`);
  }
});

// Since we've modularized everything, we don't need the old main content
// Just add a comment indicating this is the fully modularized version
combinedContent += '// === All functionality is now modularized ===\n';
combinedContent += '// The main() function in bridge-main.jsx starts the application\n';

// Write the combined file to build directory
const outputPath = path.join(projectRoot, 'build', 'scripts', 'mcp-bridge-auto.jsx');
fs.writeFileSync(outputPath, combinedContent);

console.log(`Built JSX file to: ${outputPath}`);
console.log(`Temp path injected: ${buildTempPath}`);