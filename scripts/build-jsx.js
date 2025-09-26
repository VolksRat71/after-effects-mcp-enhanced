/**
 * Build script for ExtendScript JSX files
 * Processes #include directives and injects dynamic paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const buildTempPath = path.join(projectRoot, 'build', 'temp').replace(/\\/g, '/');
const srcScriptsDir = path.join(projectRoot, 'src', 'scripts');
const masterTemplatePath = path.join(srcScriptsDir, 'mcp-bridge-auto.jsx');
const outputPath = path.join(projectRoot, 'build', 'dist', 'mcp-bridge-auto.jsx');

console.log(colors.cyan('\n[JSX BUILD] === Starting JSX Build Process ===\n'));
console.log(colors.blue(`[JSX BUILD] Build temp path: ${buildTempPath}`));

/**
 * Process #include directives recursively
 */
function processIncludes(content, baseDir, processedFiles = new Set()) {
  const includeRegex = /#include\s+"([^"]+)"/g;

  return content.replace(includeRegex, (match, includePath) => {
    // Resolve the full path
    const fullPath = path.resolve(baseDir, includePath);

    // Prevent circular includes
    if (processedFiles.has(fullPath)) {
      console.warn(colors.yellow(`[JSX BUILD] ⚠ Warning: Circular include detected: ${includePath}`));
      return `// Circular include prevented: ${includePath}`;
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(colors.red(`[JSX BUILD] ✗ Error: Include file not found: ${includePath}`));
      throw new Error(`Include file not found: ${includePath}`);
    }

    // Mark as processed
    processedFiles.add(fullPath);

    // Read the file
    let fileContent = fs.readFileSync(fullPath, 'utf8');

    // Replace {{MCP_TEMP_PATH}} placeholder with actual build temp path
    fileContent = fileContent.replace(/\{\{MCP_TEMP_PATH\}\}/g, buildTempPath);

    // Recursively process any nested includes
    const fileDir = path.dirname(fullPath);
    fileContent = processIncludes(fileContent, fileDir, processedFiles);

    // Add marker comments
    const relativePath = path.relative(srcScriptsDir, fullPath).replace(/\\/g, '/');
    return `\n// === Included: ${relativePath} ===\n` +
           fileContent +
           `\n// === End: ${relativePath} ===\n`;
  });
}

try {
  // Read the master template
  console.log(colors.blue(`[JSX BUILD] Reading master template: ${masterTemplatePath}`));
  const masterContent = fs.readFileSync(masterTemplatePath, 'utf8');

  // Process all includes
  console.log(colors.blue(`[JSX BUILD] Processing #include directives...`));
  const processedContent = processIncludes(masterContent, srcScriptsDir);

  // Add build header
  const finalContent = `// MCP Bridge Auto - Built ${new Date().toISOString()}\n` +
                       `// Auto-generated from master template with #include directives\n` +
                       `// DO NOT EDIT - Edit source files in src/scripts/ instead\n\n` +
                       processedContent;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(outputPath, finalContent, 'utf8');

  // Calculate statistics
  const lines = finalContent.split('\n').length;
  const sizeKB = Math.round(finalContent.length / 1024);

  console.log(colors.green(`\n[JSX BUILD] ✓ Built JSX file to: ${outputPath}`));
  console.log(colors.green(`[JSX BUILD] ✓ Temp path injected: ${buildTempPath}`));
  console.log(colors.green(`[JSX BUILD] ✓ Total lines: ${lines}`));
  console.log(colors.green(`[JSX BUILD] ✓ Total size: ${sizeKB} KB`));
  console.log(colors.cyan(`\n[JSX BUILD] === Build Complete ===\n`));

} catch (error) {
  console.error(colors.red(`\n[JSX BUILD] ✗ Build failed: ${error.message}`));
  console.error(colors.red(error.stack));
  process.exit(1);
}