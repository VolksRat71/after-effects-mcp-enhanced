/**
 * Build script for ExtendScript JSX files
 * Combines modular JSX files based on import comment syntax
 *
 * Import syntax: // import { function1, function2 } from "./path/to/module"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const buildTempPath = path.join(projectRoot, 'build', 'temp').replace(/\\/g, '/');
const modulesDir = path.join(projectRoot, 'src', 'scripts', 'modules');

console.log(`Building JSX with temp path: ${buildTempPath}`);

// Parse import comments from a file
function parseImports(content) {
  const importRegex = /\/\/\s*import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const functions = match[1].split(',').map(f => f.trim());
    const modulePath = match[2];
    imports.push({ functions, modulePath });
  }

  return imports;
}

// Recursively collect all module files and their dependencies
function collectModules() {
  const modules = new Map();
  const visited = new Set();

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.jsx')) {
        const relativePath = path.relative(modulesDir, fullPath).replace(/\\/g, '/');
        const content = fs.readFileSync(fullPath, 'utf8');
        const imports = parseImports(content);

        modules.set(relativePath, {
          path: fullPath,
          content: content,
          imports: imports,
          processed: false
        });
      }
    }
  }

  scanDirectory(modulesDir);
  return modules;
}

// Resolve module path relative to importing module
function resolveModulePath(fromPath, importPath) {
  // Remove leading "./" if present
  importPath = importPath.replace(/^\.\//, '');

  // Get directory of the importing module
  const fromDir = path.dirname(fromPath);

  // Resolve the import path
  let resolved = path.join(fromDir, importPath).replace(/\\/g, '/');

  // Add .jsx extension if not present
  if (!resolved.endsWith('.jsx')) {
    resolved += '.jsx';
  }

  return resolved;
}

// Build dependency graph and determine order
function buildDependencyOrder(modules) {
  const ordered = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(modulePath) {
    if (visited.has(modulePath)) return;
    if (visiting.has(modulePath)) {
      throw new Error(`Circular dependency detected: ${modulePath}`);
    }

    visiting.add(modulePath);
    const module = modules.get(modulePath);

    if (!module) {
      console.warn(`Warning: Module not found: ${modulePath}`);
      visiting.delete(modulePath);
      return;
    }

    // Visit dependencies first
    for (const imp of module.imports) {
      const depPath = resolveModulePath(modulePath, imp.modulePath);
      visit(depPath);
    }

    visiting.delete(modulePath);
    visited.add(modulePath);
    ordered.push(modulePath);
  }

  // Start with main.jsx
  const mainPath = 'base/main.jsx';
  if (modules.has(mainPath)) {
    visit(mainPath);
  }

  // Visit any remaining modules
  for (const modulePath of modules.keys()) {
    visit(modulePath);
  }

  return ordered;
}

// Strip import comments from content
function stripImports(content) {
  return content.replace(/\/\/\s*import\s*\{[^}]*\}\s*from\s*["'][^"']+["']\s*\n?/g, '');
}

// Build the combined JSX file
try {
  console.log('\n=== Starting JSX Build Process ===\n');

  // Collect all modules
  const modules = collectModules();
  console.log(`Found ${modules.size} module files`);

  // Determine build order
  const buildOrder = buildDependencyOrder(modules);
  console.log(`\nBuild order (${buildOrder.length} modules):`);
  buildOrder.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));

  // Build combined content
  let combinedContent = '// MCP Bridge Auto - Built ' + new Date().toISOString() + '\n';
  combinedContent += '// Auto-generated from modular source files\n';
  combinedContent += '// DO NOT EDIT - Edit source files in src/scripts/modules/ instead\n\n';

  for (const modulePath of buildOrder) {
    const module = modules.get(modulePath);
    if (!module) continue;

    let moduleContent = stripImports(module.content);

    // Replace path placeholders
    moduleContent = moduleContent.replace(/\{\{MCP_TEMP_PATH\}\}/g, buildTempPath);

    combinedContent += `\n// === Module: ${modulePath} ===\n`;
    combinedContent += moduleContent + '\n';
  }

  // Write output
  const outputPath = path.join(projectRoot, 'build', 'scripts', 'mcp-bridge-auto.jsx');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, combinedContent);

  console.log(`\n✓ Built JSX file to: ${outputPath}`);
  console.log(`✓ Temp path injected: ${buildTempPath}`);
  console.log(`✓ Total size: ${Math.round(combinedContent.length / 1024)} KB`);
  console.log('\n=== Build Complete ===\n');

} catch (error) {
  console.error('\n✗ Build failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}