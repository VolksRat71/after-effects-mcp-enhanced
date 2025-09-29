Below is a ready-to-paste, high-signal prompt you can give to Claude Code (or another coding model) to implement the single-frame and sampled multi-frame rendering MCP tools for your after-effects-mcp-enhanced repository. It provides context, requirements, architecture, file layout, coding standards, and acceptance criteria. You can trim sections if you want something shorter, but this full version maximizes clarity and reduces back-and-forth.

---

### FULL IMPLEMENTATION PROMPT FOR CLAUDE CODE

You are an expert TypeScript developer working on the repository: after-effects-mcp-enhanced  
Goal: Add two MCP tools that render frames from an open After Effects project via ExtendScript:

1. render_frame – render a single frame from a named comp at a given time or frame index.  
2. render_frames_sampled – render a sampled set of frames between startTime and endTime using one of: sampleCount, sampleFps, or frameStep.  

Both tools should write outputs into build/temp (single frame) or build/temp/<sessionId> (multi-frame). They must return metadata including file paths and composition information.

--------------------------------------------------
REPOSITORY CONTEXT (ASSUMED)
--------------------------------------------------
- TypeScript project.
- build/server/index.js is entry point after compilation.
- scripts/build-jsx.js presumably builds/installs any ExtendScript bridging assets (not yet extended for our new tools).
- No existing extendScriptBridge is defined yet (we will implement).
- We are using @modelcontextprotocol/sdk to expose tools.

--------------------------------------------------
TASKS (DO THESE IN ORDER)
--------------------------------------------------
1. ✅ COMPLETED (REVISED) - Execution architecture:
   - Initial approach: Direct execution via ScriptExecutor (FAILED - opened new project)
   - Final approach: Panel-based execution via fileManager.writeCommandFile()
   - Rationale: Direct execution (-m flag) causes AE to open new project when already running
   - Implementation: Tools queue commands, MCP Bridge Auto panel executes in current project context
   - JSX modules created: src/dist/modules/render/renderFrame.jsx & renderFramesSampled.jsx

2. ✅ COMPLETED - Implement single frame tool:
   - File: src/tools/render/renderFrame.ts
   - Implemented zod schema with all required fields
   - Uses getScriptExecutor().executeCustomScript() directly
   - Generates unique filenames via sanitize utility
   - ExtendScript handles comp lookup, render queue, and returns JSON
   - Automatic cleanup after 1 hour via fileManager.scheduleFileCleanup()
   - See TEST_PLAN.txt for testing instructions

3. ✅ COMPLETED - Implement sampled frames tool:
   - File: src/tools/render/renderFramesSampled.ts
   - All sampling strategies implemented (sampleCount, sampleFps, frameStep)
   - Mutual exclusivity validation in TypeScript
   - Session directory creation (build/temp/<sessionId>/)
   - ExtendScript computes times, deduplicates, and handles maxFrames truncation
   - Single render() call for all frames
   - Automatic cleanup of session directories after 1 hour
   - See TEST_PLAN.txt for testing instructions

4. ✅ COMPLETED - Update tools index:
   - File: src/tools/index.ts (modified)
   - Imported render tools
   - Registered both render-frame and render-frames-sampled

5. ✅ COMPLETED - Update server bootstrap:
   - Already handled by existing registerAllTools() pattern
   - No changes needed to src/server/index.ts

6. ✅ COMPLETED - Add utility:
   - File: src/server/utils/sanitize.ts
   - Implemented: sanitizeFilename(), generateUniqueFilename(), generateSessionId()
   - Uses crypto.randomUUID() for safety
   - Session directories: session_<timestamp>_<uuid>
   - Frame files: frame_<timestamp>_<uuid>

7. ✅ COMPLETED - Automatic Cleanup:
   - File: src/services/fileManager.ts
   - Enhanced cleanupOldJSXFiles() to clean: JSX files, .tif/.png/.jpg images, session directories
   - Items older than 1 hour are automatically removed
   - scheduleFileCleanup() method handles both files and directories
   - Render tools schedule cleanup immediately upon file/directory creation
   - Default cleanup delay: 1 hour (3600000ms)

8. Add documentation section to README:
   - Title: Frame Rendering Tools (MCP)
   - Include usage examples (JSON-RPC style) for both tools.
   - Warn about performance & maxFrames.
   - Clarify difference between sampleCount vs sampleFps vs frameStep.
   - Note automatic cleanup after 1 hour

9. Type safety & error handling:
   - All tool execute functions must return structured result objects with success field.
   - Differentiate between bridge error, parse error, and logical error.

10. Optional (if time permits):
   - Add ability to specify output module template name (template? param) and apply in ExtendScript: om.applyTemplate(templateName) with fallback try/catch.
   - Add environment variable AE_DEFAULT_OUTPUT_TEMPLATE.

--------------------------------------------------
ACCEPTANCE CRITERIA
--------------------------------------------------
- render_frame tool:
  - Returns success with correct frame/time conversions and file paths.
  - Gracefully fails when comp missing, with error field.
  - No uncontrolled exceptions leaving the execute function.

- render_frames_sampled tool:
  - Respects exactly one sampling strategy.
  - Truncates and returns warning when > maxFrames.
  - Deduplicates frames with same frame number.
  - Returns consistent ordering by index.

- ExtendScript generation:
  - Self-contained, uses IIFE, returns JSON only (no extraneous logs).
  - Handles missing comp and other error cases.

- No ESLint/TypeScript errors (if linting configured).
- README updated with clear examples.
- Automatic cleanup of rendered files after 1 hour.

--------------------------------------------------
CODING STANDARDS
--------------------------------------------------
- Use TypeScript strict style (no implicit any).
- Use zod for all input validation; fail fast before calling ExtendScript.
- Avoid code duplication: share escaping logic in each buildExtendScript function.
- Provide JSDoc or comments for exported functions.

--------------------------------------------------
RUNTIME / SECURITY
--------------------------------------------------
- Sanitize any user-provided filename parts: allow [A-Za-z0-9._-].
- Randomness: use crypto.randomUUID() or a safe fallback.
- Do not eval untrusted code outside of ExtendScript context.
- Provide a clear point to plug in future queue/throttle (e.g., a simple in-memory mutex wrapper).

--------------------------------------------------
DELIVERABLES
--------------------------------------------------
Produce the following new or modified files:

1. src/tools/render/renderFrame.ts
2. src/tools/render/renderFramesSampled.ts
3. src/tools/index.ts (modified)
4. src/server/utils/sanitize.ts (utility functions)
5. src/services/fileManager.ts (cleanup functionality)
6. README.md (append new section; keep existing content intact)
7. (Optional) .env.example entry for AE_DEFAULT_OUTPUT_TEMPLATE

For Markdown files, remember quadruple backtick fence style so nested code remains intact.

--------------------------------------------------
IMPLEMENTATION HINTS
--------------------------------------------------
Escaping in ExtendScript:
function esc(s){return s.replace(/\\\\/g,'\\\\\\\\').replace(/"/g,'\\"');}
Then embed sanitized strings.

Single frame logic:
rqItem.timeSpanStart = renderTime;
rqItem.timeSpanDuration = 1 / frameRate;

Sampled frames dedup:
Use toFixed(5) rounding key to deduplicate times.
Skip duplicate frame numbers to prevent render queue conflicts.

--------------------------------------------------
REQUESTED OUTPUT FORMAT
--------------------------------------------------
Return only the file blocks with complete implementations and any necessary supporting code. Avoid placeholder comments except where explicitly unresolved (e.g., TODO: integrate real AE bridge channel). Include all described logic.

If something is ambiguous, make a reasonable assumption and note it in a comment near the top of the affected file.

BEGIN IMPLEMENTATION NOW.
---

### SHORTER "LITE" VERSION (Optional Alternative)

If I only had 1 minute:
"Add two MCP tools render_frame and render_frames_sampled using ExtendScript + After Effects render queue. Single frame: one queue item spanning 1/frameRate. Sampled: compute times via sampleCount | sampleFps | frameStep (exclusive) or default=5 frames; deduplicate frame numbers; enqueue one item per frame; single render() call; store under build/temp/<sessionId>. Return JSON with metadata and file paths. Use zod for validation. Implement automatic cleanup after 1 hour. Update README with usage examples. Provide files: renderFrame.ts, renderFramesSampled.ts, tools index, sanitize util, fileManager cleanup, README section."

---

Let me know if you’d like a variant focused on aerender integration or an additional prompt to add a contact sheet tool. Happy to adjust further.