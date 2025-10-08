# After Effects MCP - CLI-Only Refactor Plan

## Executive Summary

Refactor the After Effects MCP server from a panel-based polling architecture to a pure CLI execution model using `osascript` (macOS) and COM automation (Windows). This eliminates the ScriptUI panel dependency, reduces latency, and simplifies the architecture.

---

## Current Architecture Analysis

### How It Works Now (Panel-Based)

```
┌─────────────┐
│  MCP Tool   │
└──────┬──────┘
       │ 1. Write command
       ▼
┌─────────────────────┐
│ ae_command.json     │
└─────────────────────┘
       │ 2. Panel polls every 1s
       ▼
┌─────────────────────┐
│ ScriptUI Panel      │
│ (mcp-bridge-auto)   │
└──────┬──────────────┘
       │ 3. Execute JSX
       ▼
┌─────────────────────┐
│ After Effects       │
└──────┬──────────────┘
       │ 4. Write result
       ▼
┌─────────────────────┐
│ ae_mcp_result.json  │
└─────────────────────┘
       │ 5. Tool reads result
       ▼
┌─────────────┐
│  Response   │
└─────────────┘
```

### Components to Remove
- ❌ `src/dist/mcp-bridge-auto.jsx` - ScriptUI panel
- ❌ `src/services/fileManager.ts` - Command queue system
- ❌ `src/dist/modules/base/command-executor.jsx` - Batch processor
- ❌ `scripts/bridge-install.js` - Panel installer
- ❌ Batch processing logic (500ms queue window)
- ❌ File polling mechanism
- ❌ Result file reading

### Components to Keep
- ✅ `src/dist/modules/**/*.jsx` - ExtendScript business logic
- ✅ `src/tools/**/*.ts` - MCP tool definitions (refactored)
- ✅ `src/server/index.ts` - MCP server
- ✅ `src/utils/appLauncher.ts` - Application launcher
- ✅ Tool registration system

---

## Proposed Architecture (CLI-Only)

### How It Will Work

```
┌─────────────┐
│  MCP Tool   │
└──────┬──────┘
       │ 1. Generate JSX
       ▼
┌─────────────────────┐
│ Temp Script         │
│ /tmp/ae_*.jsx       │
└──────┬──────────────┘
       │ 2. Execute via osascript
       ▼
┌─────────────────────┐
│ After Effects       │
│ (already running)   │
└──────┬──────────────┘
       │ 3. Return result
       ▼
┌─────────────┐
│  Response   │
└─────────────┘
```

### New Core Component

**`src/services/cliExecutor.ts`** - Central CLI execution service

```typescript
export class CLIExecutor {
  // Execute JSX code directly
  executeScript(jsxCode: string, timeout?: number): Promise<any>

  // Execute JSX file
  executeScriptFile(scriptPath: string, timeout?: number): Promise<any>

  // Check if AE is running
  isRunning(): boolean

  // Platform-specific execution
  private executeOSX(jsx: string): Promise<any>
  private executeWindows(jsx: string): Promise<any>

  // Result handling
  private parseScriptOutput(output: string): any

  // Temp file management
  private createTempScript(jsx: string): string
  private cleanupTempScript(path: string): void
}
```

---

## Migration Strategy

### Phase 1: Core Infrastructure ✅ PRIORITY

#### 1.1 Create CLI Executor Service
- [ ] Create `src/services/cliExecutor.ts`
- [ ] Implement `executeScript()` for macOS (osascript)
- [ ] Implement `executeScript()` for Windows (COM/VBScript)
- [ ] Add timeout handling
- [ ] Add error handling and logging
- [ ] Create temp file management

#### 1.2 Create JSX Generator Utilities
- [ ] Create `src/utils/jsxGenerator.ts`
- [ ] Helper: `wrapWithResult(jsx: string): string` - Wraps JSX to return JSON
- [ ] Helper: `escapeString(str: string): string` - Escape paths/strings
- [ ] Helper: `generateFileWriteJSX(outputPath: string, data: any): string`

#### 1.3 Create Base Tool Pattern
- [ ] Create `src/tools/base/cliToolBase.ts`
- [ ] Template for query tools (read-only)
- [ ] Template for mutation tools (write operations)
- [ ] Template for async tools (renders)

---

### Phase 2: Simple Migrations (Query Tools)

Migrate read-only tools that query data from After Effects.

#### 2.1 Project/Composition Queries
- [ ] `get-project-info` → Convert to CLI (replace existing)
- [ ] `list-compositions` → Convert to CLI
- [ ] `get-layer-info` → Convert to CLI
- [ ] `get-layer-properties` → Convert to CLI

**Pattern:**
```typescript
// Old approach
context.fileManager.writeCommandFile("getProjectInfo", {});
// Wait and read result file

// New approach
const jsx = `
var result = ${existingJSXFunction}();
return result;
`;
return await cliExecutor.executeScript(jsx);
```

#### 2.2 Utility/Info Tools
- [ ] `get-help` → Keep as-is (static content)
- [ ] `get-effects-help` → Keep as-is (static content)
- [ ] `get-command-history` → Keep as-is (local file)

---

### Phase 3: Write Operations (Mutations)

Migrate tools that modify the After Effects project.

#### 3.1 Composition Management
- [ ] `create-composition` → Convert to CLI

**Pattern:**
```typescript
const jsx = `
var comp = app.project.items.addComp("${name}", ${width}, ${height}, 1, ${duration}, ${frameRate});
return JSON.stringify({
  success: true,
  composition: {
    name: comp.name,
    id: comp.id
  }
});
`;
```

#### 3.2 Layer Operations
- [ ] `set-layer-keyframe` → Convert to CLI
- [ ] `set-layer-expression` → Convert to CLI
- [ ] `set-multiple-keyframes` → Convert to CLI

#### 3.3 Animation Operations
- [ ] `apply-animation-template` → Convert to CLI
- [ ] `copy-animation` → Convert to CLI

#### 3.4 Effects Operations
- [ ] `apply-effect` → Convert to CLI
- [ ] `apply-effect-template` → Convert to CLI

---

### Phase 4: Asset/Media Operations

Handle file import/replacement operations.

#### 4.1 Import Tools
- [ ] `import-assets` → Convert to CLI
  - Validate file paths in Node.js first
  - Generate JSX with escaped paths
  - Handle multiple files

- [ ] `replace-footage` → Convert to CLI

**Pattern:**
```typescript
// Validate paths in Node.js
if (!fs.existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`);
}

const jsx = `
var file = new File("${escapedPath}");
var imported = app.project.importFile(new ImportOptions(file));
return JSON.stringify({ success: true, itemId: imported.id });
`;
```

---

### Phase 5: Render Operations (Complex)

Most complex migration due to async nature of rendering.

#### 5.1 Single Frame Renders
- [ ] `render-frame-debug` → Convert to CLI
- [ ] `render-frame-export` → Convert to CLI

**Approach:**
1. Generate JSX that renders to temp file
2. Execute via CLI
3. Wait for file to exist (polling with timeout)
4. Convert TIFF → PNG if needed
5. Read file and return/delete

**Pattern:**
```typescript
const outputPath = `/tmp/ae_render_${Date.now()}.tif`;
const jsx = `
var comp = app.project.item(${compIndex});
var renderQueue = app.project.renderQueue;
var item = renderQueue.items.add(comp);
item.outputModules[1].file = new File("${outputPath}");
app.project.renderQueue.render();
return JSON.stringify({ success: true, outputPath: "${outputPath}" });
`;

await cliExecutor.executeScript(jsx, 120000); // 2min timeout

// Wait for file
await waitForFile(outputPath, 60000);

// Convert TIFF to PNG
const pngPath = await convertTiffToPng(outputPath);

return pngPath;
```

#### 5.2 Multi-Frame Renders
- [ ] `render-frames-sampled-debug` → Convert to CLI
- [ ] `render-frames-sampled-export` → Convert to CLI

**Approach:**
- Same as single frame but with frame range
- May need progress tracking via temp files
- Batch frame rendering

---

### Phase 6: Tool Cleanup & Deprecation

Remove obsolete tools and update documentation.

#### 6.1 Remove Panel-Dependent Tools
- [ ] `run-bridge-test` → DELETE (panel-specific)
- [ ] `test-animation` → DELETE (panel-specific)
- [ ] `get-results` → DELETE (async result reading)

#### 6.2 Update Generic Tools
- [ ] `run-custom-script` → Convert to use CLIExecutor
- [ ] `run-script` → Convert to use CLIExecutor
- [ ] `export-history-as-script` → Keep as-is (file operation)

---

### Phase 7: Cleanup & Documentation

#### 7.1 Remove Deprecated Code
- [ ] Delete `src/dist/mcp-bridge-auto.jsx`
- [ ] Delete `src/dist/modules/base/command-executor.jsx`
- [ ] Delete `src/services/fileManager.ts` (if not used elsewhere)
- [ ] Delete `scripts/bridge-install.js`
- [ ] Delete installer code in `src/installer/`
- [ ] Update `package.json` scripts (remove bridge-install)

#### 7.2 Update Documentation
- [ ] Update `README.md` - Remove panel installation instructions
- [ ] Update `MCP_QUICK_START.md` - CLI-only setup
- [ ] Update `MCP_TOOLS_GUIDE.md` - Remove batch processing notes
- [ ] Create `MIGRATION.md` - Guide for users upgrading
- [ ] Update architecture diagrams

#### 7.3 Update Build Process
- [ ] Remove JSX panel build from `scripts/build-jsx.js`
- [ ] Keep JSX module builds (may still be useful)
- [ ] Update TypeScript config if needed

---

## Implementation Details

### Platform-Specific Execution

#### macOS (osascript)
```bash
osascript -e 'tell application "Adobe After Effects 2025" to DoScript "$.evalFile(\"/path/to/script.jsx\")"'
```

Or inline:
```bash
osascript -e 'tell application "Adobe After Effects 2025" to DoScript "var result = {foo: \"bar\"}; JSON.stringify(result);"'
```

#### Windows (COM Automation)
```javascript
// Via VBScript temp file
const vbsScript = `
Set ae = CreateObject("AfterEffects.Application")
result = ae.DoScript("${escapedJSX}")
WScript.Echo result
`;
execSync(`cscript //nologo ${vbsPath}`);
```

Or PowerShell:
```powershell
$ae = New-Object -ComObject AfterEffects.Application
$ae.DoScript("${jsx}")
```

### Error Handling Strategy

```typescript
try {
  const result = await cliExecutor.executeScript(jsx, timeout);
  return { success: true, data: result };
} catch (error) {
  if (error.message.includes('not running')) {
    return {
      success: false,
      error: 'After Effects is not running. Use launch-after-effects first.'
    };
  }
  if (error.message.includes('timeout')) {
    return {
      success: false,
      error: 'Script execution timed out'
    };
  }
  return {
    success: false,
    error: error.message
  };
}
```

### Timeout Recommendations

| Operation Type | Timeout | Reason |
|---------------|---------|--------|
| Query (read) | 5s | Fast data retrieval |
| Mutation (write) | 10s | Layer/comp creation |
| Import | 30s | Large file imports |
| Single frame render | 120s | Complex renders |
| Multi-frame render | 300s | Batch rendering |

---

## Testing Plan

### Phase 1: Core Infrastructure Tests
- [ ] Test `CLIExecutor.executeScript()` with simple JSX
- [ ] Test timeout handling
- [ ] Test error propagation
- [ ] Test temp file cleanup
- [ ] Test on macOS
- [ ] Test on Windows

### Phase 2: Tool Migration Tests
For each migrated tool:
- [ ] Test with valid inputs
- [ ] Test with invalid inputs
- [ ] Test error cases
- [ ] Test timeout scenarios
- [ ] Compare output with old panel-based version

### Phase 3: Integration Tests
- [ ] Test rapid sequential calls (no 500ms delay)
- [ ] Test concurrent tool execution
- [ ] Test with AE not running
- [ ] Test with AE running but no project open
- [ ] Test with multiple AE instances

### Phase 4: Performance Tests
- [ ] Measure latency improvement vs panel approach
- [ ] Test render operations with large comps
- [ ] Test import with many files
- [ ] Memory leak tests (temp file cleanup)

---

## Rollout Strategy

### Option A: Big Bang (All at Once)
- Complete all phases
- Release as v3.0.0
- Breaking change - requires user migration

**Pros:** Clean break, simpler codebase
**Cons:** High risk, all users must migrate

### Option B: Gradual Migration (Recommended)
- Keep both systems running in parallel
- Add `-cli` suffix to new tools initially
- Deprecate old tools over time
- Remove panel code in v4.0.0

**Pros:** Lower risk, gradual adoption
**Cons:** Larger codebase temporarily

### Recommended: Option B

**Version 2.1.0** - Add CLI tools alongside panel tools
- All tools get `-cli` variants
- Panel tools marked as deprecated in docs
- Users can test CLI approach

**Version 3.0.0** - Make CLI default
- Remove `-cli` suffix (CLI tools become primary)
- Panel tools renamed with `-legacy` suffix
- Panel code still included but deprecated

**Version 4.0.0** - Remove panel completely
- Delete all panel code
- Delete all `-legacy` tools
- Clean architecture

---

## Migration Checklist

### Before Starting
- [ ] Create feature branch `cli-refactor`
- [ ] Back up current codebase
- [ ] Document current tool behavior for comparison
- [ ] Set up test After Effects project

### During Development
- [ ] Keep PR sizes manageable (one phase at a time)
- [ ] Write tests for each migrated tool
- [ ] Update docs incrementally
- [ ] Test on both macOS and Windows

### Before Release
- [ ] Full regression test suite
- [ ] Performance benchmarks
- [ ] Update all documentation
- [ ] Create migration guide
- [ ] Test with real AI workflows

---

## Risk Assessment

### High Risk Items
1. **Render operations** - Complex async behavior, timeout handling
2. **Windows compatibility** - Different execution model than macOS
3. **Breaking changes** - Users must update workflows

### Mitigation Strategies
1. Extensive testing with various project sizes
2. Parallel development/testing on Windows VM
3. Gradual rollout strategy (Option B)

### Rollback Plan
- Keep panel code in separate branch
- Tag releases clearly
- Document downgrade process
- Maintain v2.x for critical fixes

---

## Success Metrics

### Performance
- [ ] Tool latency reduced by >80% (remove 500ms batch delay)
- [ ] First-call overhead <100ms
- [ ] Render operations complete within timeout

### Reliability
- [ ] Error rate <1% for non-render operations
- [ ] Successful execution rate >99%
- [ ] No memory leaks from temp files

### Code Quality
- [ ] 30% reduction in codebase size
- [ ] Simplified architecture (fewer moving parts)
- [ ] Better error messages

### User Experience
- [ ] No panel installation required
- [ ] Faster tool responses
- [ ] Clearer error messages

---

## Open Questions

1. **Batch optimization loss** - Panel could batch rapid commands. CLI executes immediately. Is this a problem for AI workflows that fire many commands quickly?

2. **Windows COM reliability** - Does Windows COM automation work as reliably as osascript on macOS?

3. **Render progress** - Panel could show progress. CLI is black box until complete. Add progress callbacks?

4. **Script size limits** - osascript has command-line length limits. Need file-based approach for large JSX?

5. **Multi-instance support** - If multiple AE instances running, how to target specific one?

---

## Next Steps

1. Review and approve this plan
2. Create GitHub issues for each phase
3. Set up project board for tracking
4. Start with Phase 1.1 (CLI Executor Service)
5. Create proof-of-concept with 2-3 simple tools
6. Evaluate before proceeding to full migration

---

## Estimated Timeline

- **Phase 1** (Core Infrastructure): 3-5 days
- **Phase 2** (Query Tools): 2-3 days
- **Phase 3** (Write Operations): 4-5 days
- **Phase 4** (Asset Operations): 2-3 days
- **Phase 5** (Render Operations): 5-7 days
- **Phase 6** (Cleanup): 2-3 days
- **Phase 7** (Documentation): 2-3 days

**Total: ~20-29 days** (assuming full-time work)

With gradual rollout: Can release incrementally after each phase.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Status:** DRAFT - Awaiting Review
