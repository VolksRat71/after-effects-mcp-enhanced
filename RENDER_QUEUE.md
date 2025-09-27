Below is a ready-to-paste, high-signal prompt you can give to Claude Code (or another coding model) to implement the single-frame and sampled multi-frame rendering MCP tools for your after-effects-mcp-enhanced repository. It provides context, requirements, architecture, file layout, coding standards, and acceptance criteria. You can trim sections if you want something shorter, but this full version maximizes clarity and reduces back-and-forth.

---

### FULL IMPLEMENTATION PROMPT FOR CLAUDE CODE

You are an expert TypeScript developer working on the repository: after-effects-mcp-enhanced  
Goal: Add two MCP tools that render frames from an open After Effects project via ExtendScript:

1. render_frame – render a single frame from a named comp at a given time or frame index.  
2. render_frames_sampled – render a sampled set of frames between startTime and endTime using one of: sampleCount, sampleFps, or frameStep.  

Both tools should write outputs into build/temp (single frame) or build/temp/<sessionId> (multi-frame). They must return metadata and optionally inline base64.

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
1. ✅ SKIPPED - Bridge layer not needed:
   - Decision: Use existing ScriptExecutor.executeCustomScript() directly
   - Rationale: ScriptExecutor already provides the needed functionality (temp file creation, script wrapping, execution)
   - Implementation approach: Tools will call getScriptExecutor().executeCustomScript() directly

2. ✅ COMPLETED - Implement single frame tool:
   - File: src/tools/render/renderFrame.ts
   - Implemented zod schema with all required fields
   - Uses getScriptExecutor().executeCustomScript() directly
   - Generates unique filenames via sanitize utility
   - ExtendScript handles comp lookup, render queue, and returns JSON
   - Base64 inline support implemented
   - See TEST_PLAN.txt for testing instructions

3. ✅ COMPLETED - Implement sampled frames tool:
   - File: src/tools/render/renderFramesSampled.ts
   - All sampling strategies implemented (sampleCount, sampleFps, frameStep)
   - Mutual exclusivity validation in TypeScript
   - Session directory creation (build/temp/<sessionId>/)
   - ExtendScript computes times, deduplicates, and handles maxFrames truncation
   - Single render() call for all frames
   - Node-side inlines first inlineMax frames only
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

7. Add documentation section to README:
   - Title: Frame Rendering Tools (MCP)
   - Include usage examples (JSON-RPC style) for both tools.
   - Warn about performance & maxFrames.
   - Clarify difference between sampleCount vs sampleFps vs frameStep.

8. Add basic test harness (non-AE environment):
   - Because we cannot run AE in CI, create a mock:
     File: src/dev/mockExtendScriptBridge.ts
     Expose MOCK_MODE=1 environment toggle.
     When active, runExtendScript intercepts certain patterns:
       * Recognize single frame payload and return plausible JSON with a dummy file path (also create an empty placeholder file).
       * Recognize sampled variant and simulate frames/time logic (mirror logic used in script).
     Provide a pnpm/npm script: "dev:mock" to launch server with MOCK_MODE=1.

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
  - Returns success with correct frame/time conversions and base64 when inline=true.
  - Gracefully fails when comp missing, with error field.
  - No uncontrolled exceptions leaving the execute function.

- render_frames_sampled tool:
  - Respects exactly one sampling strategy.
  - Truncates and returns warning when > maxFrames.
  - Inline only first inlineMax frames; others have no inlineData property.
  - Returns consistent ordering by index.

- ExtendScript generation:
  - Self-contained, uses IIFE, returns JSON only (no extraneous logs).
  - Handles missing comp and other error cases.

- No ESLint/TypeScript errors (if linting configured).
- README updated with clear examples.
- Mock mode allows running both tools without AE and returns plausible structures.

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
Produce the following new or modified files using file blocks:

1. src/server/bridge/extendScriptBridge.ts
2. src/server/tools/renderFrame.ts
3. src/server/tools/renderFramesSampled.ts
4. src/server/tools/index.ts (modified)
5. src/server/utils/sanitize.ts (optional utility)
6. src/dev/mockExtendScriptBridge.ts (mock)
7. README.md (append new section; keep existing content intact)
8. (Optional) .env.example entry for AE_DEFAULT_OUTPUT_TEMPLATE

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

Inline base64:
const buf = await fs.readFile(filePath);
const data = 'data:image/'+format+';base64,'+buf.toString('base64');

--------------------------------------------------
REQUESTED OUTPUT FORMAT
--------------------------------------------------
Return only the file blocks with complete implementations and any necessary supporting code. Avoid placeholder comments except where explicitly unresolved (e.g., TODO: integrate real AE bridge channel). Include all described logic.

If something is ambiguous, make a reasonable assumption and note it in a comment near the top of the affected file.

BEGIN IMPLEMENTATION NOW.
---

### SHORTER “LITE” VERSION (Optional Alternative)

If I only had 1 minute:  
"Add two MCP tools render_frame and render_frames_sampled using ExtendScript + After Effects render queue. Single frame: one queue item spanning 1/frameRate. Sampled: compute times via sampleCount | sampleFps | frameStep (exclusive) or default=5 frames; enqueue one item per frame; single render() call; store under build/temp/<sessionId>. Implement runExtendScript bridge stub + mock mode. Return JSON with metadata; support inline base64 (first N frames only). Use zod for validation. Update README with usage examples. Provide files: extendScriptBridge.ts, renderFrame.ts, renderFramesSampled.ts, tools index, mockExtendScriptBridge.ts, sanitize util, README section."

---

Let me know if you’d like a variant focused on aerender integration or an additional prompt to add a contact sheet tool. Happy to adjust further.