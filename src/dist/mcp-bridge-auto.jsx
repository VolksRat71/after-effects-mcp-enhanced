// mcp-bridge-auto.jsx
// Auto-running MCP Bridge panel for After Effects

// JSON Polyfill must be first
#include "./modules/base/json-polyfill.jsx"

// --- Function Definitions ---

// Base functionality
#include "./modules/base/file-operations.jsx"

// Composition operations
#include "./modules/composition/createComposition.jsx"
#include "./modules/composition/getProjectInfo.jsx"

// Layer operations
#include "./modules/layer/createLayers.jsx"
#include "./modules/layer/setLayerProperties.jsx"
#include "./modules/layer/keyframeAndExpression.jsx"

// Effects
#include "./modules/effects/applyEffect.jsx"
#include "./modules/effects/applyEffectTemplate.jsx"

// Utilities
#include "./modules/utility/customScript.jsx"

// Render operations
#include "./modules/render/renderFrame.jsx"
#include "./modules/render/renderFramesSampled.jsx"

// Command execution
#include "./modules/base/command-executor.jsx"

// UI Panel
#include "./modules/base/ui-panel.jsx"

// --- End of Function Definitions ---

// Main initialization
#include "./modules/base/main.jsx"
