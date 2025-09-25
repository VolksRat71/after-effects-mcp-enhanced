/**
 * MCP Bridge Auto - Modularized Version
 *
 * This file is now fully modularized into separate modules.
 * The build process combines all modules into the final script.
 *
 * See the following modules:
 * - modules/json-polyfill.jsx - JSON parsing support
 * - modules/file-operations.jsx - File I/O and path handling
 * - modules/ui-window.jsx - UI window creation and logging
 * - modules/composition-operations.jsx - Composition and basic layer creation
 * - modules/layer-operations.jsx - Layer property manipulation
 * - modules/effects-operations.jsx - Effect application and management
 * - modules/media-operations.jsx - Asset import and footage replacement
 * - modules/command-executor.jsx - Command routing and execution
 * - modules/bridge-main.jsx - Main initialization and event loop
 *
 * To build the complete script, run: npm run build-jsx
 * The built file will be at: build/scripts/mcp-bridge-auto.jsx
 */

// This file intentionally left minimal - all code is in modules