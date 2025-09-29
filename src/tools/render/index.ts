// Debug tools for AI/LLM visual understanding (temp directory, auto-cleanup)
export { registerRenderFrameDebugTool } from './renderFrameDebug.js';
export { registerRenderFramesSampledDebugTool } from './renderFramesSampledDebug.js';

// Export tools for user deliverables (dist directory, no cleanup)
export { registerRenderFrameExportTool } from './renderFrameExport.js';
export { registerRenderFramesSampledExportTool } from './renderFramesSampledExport.js';