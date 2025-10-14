# Adobe Creative Suite MCP - CLI Refactor & Illustrator Extension Plan

## Executive Summary

Transform the After Effects MCP server from a panel-based polling architecture to a pure CLI execution model, while simultaneously extending support to Adobe Illustrator. This creates a unified Adobe Creative Suite automation platform using `osascript` (macOS) and COM automation (Windows), eliminating ScriptUI panel dependencies and enabling seamless creative workflows between applications.

**Key Goals:**
1. Remove panel-based polling architecture from After Effects
2. Implement pure CLI execution for both After Effects and Illustrator
3. Create unified architecture for multi-app workflows
4. Enable AI to "see" and control both applications
5. Support asset pipeline from Illustrator → After Effects

---

## Current Architecture Analysis

### How It Works Now (Panel-Based - After Effects Only)

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
```

### Components to Remove
- ❌ `src/dist/mcp-bridge-auto.jsx` - ScriptUI panel
- ❌ `src/services/fileManager.ts` - Command queue system
- ❌ `src/dist/modules/base/command-executor.jsx` - Batch processor
- ❌ `scripts/bridge-install.js` - Panel installer
- ❌ File polling mechanism
- ❌ Result file reading

---

## Proposed Architecture (CLI-Only, Multi-App)

### Unified Adobe Creative Suite Architecture

```
┌─────────────────┐
│   MCP Tool      │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Unified │
    │   CLI   │
    │ Executor│
    └────┬────┘
         │
    ┌────┴────────────┐
    │                  │
┌───▼───┐        ┌────▼────┐
│  AE   │        │   AI    │
│  CLI  │        │   CLI   │
└───┬───┘        └────┬────┘
    │                  │
┌───▼──────┐    ┌─────▼─────┐
│  After   │    │Illustrator│
│ Effects  │◄───┤    GUI    │
│   GUI    │    └───────────┘
└──────────┘    Asset Pipeline
```

### Core Architecture Components

**`src/services/adobeCLI.ts`** - Unified Adobe CLI Service

```typescript
export class AdobeCLI {
  // Application registry
  private apps = {
    'After Effects': new AfterEffectsCLI(),
    'Illustrator': new IllustratorCLI()
  };

  // Execute in any Adobe app
  async execute(app: AdobeApp, script: string): Promise<any>

  // Check app status
  async isRunning(app: AdobeApp): boolean

  // Launch application
  async launch(app: AdobeApp, options?: LaunchOptions): Promise<void>

  // Cross-app workflows
  async transferAsset(from: AdobeApp, to: AdobeApp, asset: AssetSpec): Promise<any>
}
```

---

## Implementation Phases

### Phase 0: Unified Infrastructure (NEW) ✨ PRIORITY

#### 0.1 Create Adobe CLI Base Classes
- [ ] Create `src/services/adobe/adobeCLI.base.ts`
- [ ] Define common interfaces (`AdobeApp`, `ScriptResult`, `LaunchOptions`)
- [ ] Implement platform detection and routing
- [ ] Create error handling framework
- [ ] Add logging infrastructure

#### 0.2 Create Unified App Launcher
- [ ] Create `src/utils/adobeLauncher.ts`
- [ ] Extend current `appLauncher.ts` to support multiple apps
- [ ] Add Illustrator paths for macOS/Windows
- [ ] Implement `isRunning()` for both apps
- [ ] Add `launch()` with app selection

#### 0.3 Create Shared JSX Utilities
- [ ] Create `src/utils/jsx/jsxBuilder.ts`
- [ ] Common functions for both apps
- [ ] JSON serialization helpers
- [ ] Path escaping utilities
- [ ] Cross-app asset preparation

---

### Phase 1: After Effects CLI Migration

#### 1.1 Create AE CLI Executor
- [ ] Create `src/services/adobe/afterEffectsCLI.ts`
- [ ] Implement `executeScript()` using DoScript
- [ ] Add aerender support for headless operations
- [ ] Migrate from file-based communication
- [ ] Add timeout handling

#### 1.2 Migrate Query Tools
- [ ] `get-project-info` → Pure CLI
- [ ] `list-compositions` → Pure CLI
- [ ] `get-layer-properties` → Pure CLI
- [ ] Remove dependency on result files

#### 1.3 Migrate Mutation Tools
- [ ] `create-composition` → Pure CLI
- [ ] `set-layer-keyframe` → Pure CLI
- [ ] `apply-animation-template` → Pure CLI
- [ ] `apply-effect` → Pure CLI

---

### Phase 2: Illustrator Integration (NEW) 🎨

#### 2.1 Create Illustrator CLI Executor
- [ ] Create `src/services/adobe/illustratorCLI.ts`
- [ ] Implement `DoJavaScript` for macOS
- [ ] Implement COM automation for Windows
- [ ] Add error handling specific to AI
- [ ] Create result parsing

#### 2.2 Implement Core Illustrator Tools
- [ ] `illustrator-new-document`
- [ ] `illustrator-open-document`
- [ ] `illustrator-get-document-info`
- [ ] `illustrator-list-artboards`
- [ ] `illustrator-get-selection`

#### 2.3 Creation Tools
- [ ] `illustrator-create-shape` (rectangle, ellipse, polygon, star)
- [ ] `illustrator-create-path` (pen tool paths)
- [ ] `illustrator-create-text` (point, area, path text)
- [ ] `illustrator-create-symbol`
- [ ] `illustrator-import-asset`

#### 2.4 Manipulation Tools
- [ ] `illustrator-transform` (scale, rotate, position)
- [ ] `illustrator-pathfinder` (boolean operations)
- [ ] `illustrator-align-distribute`
- [ ] `illustrator-apply-color`
- [ ] `illustrator-apply-effect`

#### 2.5 Export Tools
- [ ] `illustrator-export-selection`
- [ ] `illustrator-export-artboard`
- [ ] `illustrator-export-for-screens`
- [ ] `illustrator-prepare-for-ae` ⭐ (Critical for pipeline)

#### 2.6 Visual Debugging (AI Vision)
- [ ] `illustrator-render-preview` (like AE frame renders)
- [ ] `illustrator-capture-artboard`
- [ ] `illustrator-diff-artboards` (compare versions)

---

### Phase 3: Cross-Application Pipeline 🔄

#### 3.1 Asset Transfer System
- [ ] Create `src/services/adobe/assetPipeline.ts`
- [ ] Implement AI → AE transfer with layer preservation
- [ ] Support for:
  - Native .ai files with layers
  - SVG with grouping
  - PDF with vector preservation
  - Individual layer exports

#### 3.2 Unified Workflow Tools
- [ ] `pipeline-create-in-ai-import-to-ae`
- [ ] `pipeline-update-ai-refresh-ae`
- [ ] `pipeline-export-ae-comp-to-ai`
- [ ] `pipeline-sync-colors` (share swatches)

#### 3.3 Smart Asset Management
- [ ] Track asset relationships
- [ ] Auto-update on source changes
- [ ] Version control integration
- [ ] Asset library management

---

### Phase 4: Render Operations (Both Apps)

#### 4.1 After Effects Renders (CLI)
- [ ] Migrate `render-frame-debug` to pure CLI
- [ ] Migrate `render-frames-sampled` to pure CLI
- [ ] Add aerender support for production renders
- [ ] Implement progress tracking

#### 4.2 Illustrator Exports (NEW)
- [ ] `illustrator-export-png` (artboards/assets)
- [ ] `illustrator-export-svg` (web-ready)
- [ ] `illustrator-export-pdf` (print-ready)
- [ ] `illustrator-batch-export` (multiple formats)

#### 4.3 Unified Render Pipeline
- [ ] Create `src/services/adobe/renderManager.ts`
- [ ] Queue management for both apps
- [ ] Format conversion service
- [ ] Thumbnail generation
- [ ] Preview system

---

### Phase 5: Advanced Features

#### 5.1 Template System
- [ ] After Effects project templates
- [ ] Illustrator document templates
- [ ] Cross-app template bundles
- [ ] Dynamic template generation

#### 5.2 Batch Operations
- [ ] Multi-file processing
- [ ] Automated workflows
- [ ] Watch folder integration
- [ ] Cloud storage support

#### 5.3 AI Vision Enhancement
- [ ] Visual diff system
- [ ] Design iteration tracking
- [ ] Composition analysis
- [ ] Style matching

---

## Technical Implementation Details

### Unified CLI Execution

#### macOS Implementation
```typescript
class AdobeCLIMacOS {
  async executeAE(script: string): Promise<any> {
    const cmd = `osascript -e 'tell application "Adobe After Effects" to DoScript "${escapeAppleScript(script)}"'`;
    return await exec(cmd);
  }

  async executeAI(script: string): Promise<any> {
    const cmd = `osascript -e 'tell application "Adobe Illustrator" to do javascript "${escapeAppleScript(script)}"'`;
    return await exec(cmd);
  }
}
```

#### Windows Implementation
```typescript
class AdobeCLIWindows {
  async executeAE(script: string): Promise<any> {
    return await this.executeCOM("AfterEffects.Application", "DoScript", script);
  }

  async executeAI(script: string): Promise<any> {
    return await this.executeCOM("Illustrator.Application", "DoJavaScript", script);
  }

  private async executeCOM(progId: string, method: string, script: string): Promise<any> {
    const ps = `
      $app = [System.Runtime.InteropServices.Marshal]::GetActiveObject("${progId}")
      $result = $app.${method}(@'
${script}
'@)
      Write-Output $result
    `;
    return await exec(`powershell -Command "${ps}"`);
  }
}
```

### Cross-App Communication Pattern

```typescript
// Example: Create logo in Illustrator, animate in After Effects
async function createAnimatedLogo(logoSpec: LogoSpec) {
  const cli = new AdobeCLI();

  // 1. Create in Illustrator
  const aiResult = await cli.execute('Illustrator', `
    var doc = app.documents.add();
    // ... create logo elements ...
    doc.saveAs(new File("/tmp/logo.ai"));
    return JSON.stringify({file: "/tmp/logo.ai", layers: doc.layers.length});
  `);

  // 2. Import to After Effects
  const aeResult = await cli.execute('After Effects', `
    var io = new ImportOptions(new File("${aiResult.file}"));
    io.importAs = ImportAsType.COMPOSITION;
    var item = app.project.importFile(io);
    return JSON.stringify({comp: item.name, id: item.id});
  `);

  // 3. Apply animation
  await cli.execute('After Effects', `
    var comp = app.project.itemByID(${aeResult.id});
    // ... apply animations ...
  `);

  return { success: true, composition: aeResult.comp };
}
```

---

## Migration Strategy

### Recommended Approach: Parallel Development

**Version 2.1.0** - Add Illustrator + CLI infrastructure
- Keep existing AE panel tools working
- Add new CLI-based tools with `-cli` suffix
- Add all Illustrator tools as new additions
- Both systems run in parallel

**Version 3.0.0** - CLI becomes primary
- Remove `-cli` suffix from new tools
- Deprecate panel tools with `-legacy` suffix
- Full Illustrator integration complete
- Cross-app workflows enabled

**Version 4.0.0** - Pure CLI + Multi-App
- Remove all panel code
- Remove all legacy tools
- Unified Adobe Creative Suite MCP
- Clean, maintainable architecture

---

## Testing Plan

### Unit Tests
- [ ] CLI executors for both apps
- [ ] Script generation utilities
- [ ] Error handling scenarios
- [ ] Platform-specific code paths

### Integration Tests
- [ ] AE tool migration verification
- [ ] AI tool functionality
- [ ] Cross-app asset transfer
- [ ] Render operations
- [ ] File import/export

### End-to-End Tests
- [ ] Complete creative workflows
- [ ] AI vision capabilities
- [ ] Performance benchmarks
- [ ] Multi-app coordination

---

## Success Metrics

### Performance
- Tool latency <100ms (no polling delay)
- Cross-app transfer <2s
- Render initiation <500ms
- Script execution <50ms

### Reliability
- 99%+ success rate for CLI operations
- Graceful handling of app crashes
- Automatic recovery mechanisms
- Clear error messages

### User Experience
- No panel installation required
- Seamless app switching
- Visual feedback via frame renders
- Intuitive tool naming

### Code Quality
- 40% reduction in codebase size
- Unified architecture
- Consistent API design
- Comprehensive documentation

---

## Risk Assessment & Mitigation

### Risks
1. **Windows COM reliability** - Different behavior across Windows versions
2. **Illustrator scripting limitations** - Less mature than AE scripting
3. **Cross-app sync issues** - File locks, timing problems
4. **Breaking changes** - Users must migrate workflows

### Mitigation
1. Multiple fallback methods for Windows
2. Extensive Illustrator testing and documentation
3. Robust file handling and retry logic
4. Gradual migration with backward compatibility

---

## Resource Requirements

### Development Time
- Phase 0 (Infrastructure): 5-7 days
- Phase 1 (AE Migration): 10-12 days
- Phase 2 (AI Integration): 8-10 days
- Phase 3 (Pipeline): 5-7 days
- Phase 4 (Renders): 5-7 days
- Phase 5 (Advanced): 10-15 days

**Total: 43-58 days** (can be done incrementally)

### Testing Resources
- macOS development machine
- Windows test environment
- Both Adobe applications licensed
- Sample creative assets

---

## Next Steps

1. **Immediate Actions**
   - Review and approve this plan
   - Set up Illustrator development environment
   - Create proof-of-concept for AI CLI control
   - Test cross-app asset transfer

2. **Phase 0 Start**
   - Create unified CLI architecture
   - Implement base classes
   - Test on both platforms

3. **Parallel Development**
   - One developer on AE migration
   - One developer on AI integration
   - Regular integration points

---

## Conclusion

This unified approach transforms the project from a single-app MCP into a comprehensive Adobe Creative Suite automation platform. By combining the CLI refactor with Illustrator support, we create a powerful system where AI can:

- **See** - Render frames from both applications
- **Create** - Generate assets in the appropriate tool
- **Transfer** - Move seamlessly between applications
- **Automate** - Complex multi-app workflows

The result is a professional-grade creative automation system that leverages the strengths of both applications while maintaining a clean, maintainable architecture.

---

**Document Version:** 2.0
**Last Updated:** 2025-01-10
**Status:** READY FOR REVIEW
**Scope:** CLI Refactor + Illustrator Extension