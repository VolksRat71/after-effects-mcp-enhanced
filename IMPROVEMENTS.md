# After Effects MCP - Improvement Roadmap

Based on real-world usage creating the Falling Impulse Lottie animation, here are the key improvements needed for the After Effects MCP server.

## 🚨 CURRENT STATUS (2025-09-24 11:30 AM)

### ✅ TESTED AND WORKING (Session 2025-09-24)

1. **✅ Asset Import Tool** (`import-assets`)
   - Import images/videos from disk paths
   - Auto-add to composition with position/scale options
   - Status: FULLY WORKING - filter issue completely resolved
   - Fixed filter() issue in src/index.ts lines 1556-1568
   - **VERIFIED**: Successfully imported 3 JPG files without any errors (2025-09-24 11:38 AM)

2. **✅ Replace Footage Tool** (`replace-footage`)
   - Replace layer source footage with new files
   - Find layer by index or name
   - Status: FULLY WORKING
   - Successfully replaced MCP Auto Bridge.png with qr.png

3. **✅ Layer Property Inspector** (`get-layer-properties`)
   - Get all transform properties with current values
   - Include keyframe times and values
   - List applied effects
   - Status: FULLY WORKING
   - Returns position, scale, rotation, opacity, anchorPoint with keyframes

4. **✅ Animation Templates** (`apply-animation-template`)
   - 12 pre-built animations: fade-in, fade-out, slide-left, slide-right, slide-up, slide-down, bounce, spin, zoom-in, zoom-out, shake, slide-and-fall
   - Customizable duration and start time
   - Status: FULLY WORKING
   - Bounce animation created 7 position keyframes successfully

### 🔧 Recent Fixes Applied:
- Fixed ExtendScript filter() error in import-assets (lines 1556-1568 in src/index.ts)
- Bridge script installed at: /Applications/Adobe After Effects 2025/Scripts/ScriptUI Panels/mcp-bridge-auto.jsx
- All 4 tools tested with MCP-Testing.aep project

### ⚠️ NEXT SESSION IMPORTANT:
1. **Restart Claude Code completely** before testing import-assets again (to load filter fix)
2. Bridge is already installed and working
3. All tools are functional and tested

## 🔴 Critical Fixes

### 1. Composition Index Lookup Issue ✅ COMPLETED
**Problem:** The MCP can't find compositions by index. It expects index 1, 2, 3... but After Effects compositions have project item IDs like 39.

**Current Error:**
```
"Composition not found at index 1"
```

**Solution:** ✅ IMPLEMENTED
- Fixed composition lookup to use position among compositions, not project item ID
- Added `getCompositionByIndex()` helper function to filter and count only CompItem objects
- Updated setLayerKeyframe and setLayerExpression to use the new helper

**Code Location:** `src/scripts/mcp-bridge-auto.jsx` lines 390-420

## 🚀 New Features to Add

### 2. Custom Script Runner Tool ✅ COMPLETED
Added ability to run custom ExtendScript code directly without writing to disk:

```javascript
mcp__after-effects-mcp__runCustomScript({
  script: `
    var comp = app.project.activeItem;
    // Custom ExtendScript code here
  `,
  description: "What this script does"
})
```

### 3. Bulk Keyframe Operations ✅ COMPLETED & TESTED
Create tools for common animation tasks:

```javascript
// Set multiple keyframes at once - WORKING!
mcp__after-effects-mcp__setMultipleKeyframes({
  compIndex: 1,
  layerIndex: 1,
  keyframes: [
    {property: "Position", time: 0, value: [100, 100]},
    {property: "Scale", time: 0, value: [100, 100]},
    {property: "Opacity", time: 0, value: 100}
  ]
})

// Copy all animation from one layer to another - WORKING!
mcp__after-effects-mcp__copyAnimation({
  sourceLayer: "blue.png",
  targetLayers: ["green.png", "orange.png"],
  timeOffset: 4.5,
  properties: ["Position", "Scale", "Rotation", "Opacity"]
})
```

**Test Results (2025-09-24):**
- Successfully set 9 keyframes across Position, Scale, Rotation, and Opacity
- Copied animations with time offsets to 3 target layers
- All keyframe interpolation preserved correctly

### 4. Asset Import and Layer Creation ⚠️ PARTIALLY WORKING
Import assets and add them to compositions:

```javascript
// Import new assets from disk - PENDING
mcp__after-effects-mcp__importAssets({
  files: [
    "/path/to/product1.png",
    "/path/to/product2.png"
  ],
  addToComp: true,
  compIndex: 1,
  position: [960, 540]
})

// Add existing project footage to composition - WORKING via custom script!
// Currently possible through custom scripts:
var footage = app.project.item(footageID);
comp.layers.add(footage);

// Replace footage in existing layers - PENDING
mcp__after-effects-mcp__replaceFootage({
  layerName: "Product 1",
  newFootagePath: "/path/to/new-image.png"
})
```

**Test Results (2025-09-24):**
- ✅ Can add existing project footage items to compositions via custom scripts
- ✅ Successfully added kerv_logo.png, blue.png, and backpack images to MCP Test Comp
- ⏳ Full asset import from disk paths not yet implemented as dedicated tool
- 💡 Workaround: Use custom script to access and manipulate existing project items

### 5. Animation Templates
Pre-built animation patterns:

```javascript
mcp__after-effects-mcp__applyAnimationTemplate({
  template: "slideAndFall",
  layer: "Product 1",
  timing: {
    slideInDuration: 0.4,
    fallDuration: 0.4,
    startTime: 0
  },
  parameters: {
    entryPosition: [1920, 20],
    restPosition: [1440, 150],
    fallPosition: [1450, 380],
    finalRotation: -12,
    finalScale: 50
  }
})
```

### 6. Layer Management Tools
Better layer organization:

```javascript
// Get layers by type or name pattern
mcp__after-effects-mcp__findLayers({
  pattern: "Product*",
  type: "footage"
})

// Batch operations
mcp__after-effects-mcp__batchSetProperties({
  layers: ["Container Back", "Container Front"],
  properties: {
    position: [1597, 730],
    scale: [100, 100]
  }
})
```

## 🛠 Improvements to Existing Tools

### 7. Better Error Handling
- **setValue vs setValueAtTime:** Automatically detect if property has keyframes and use appropriate method
- **Descriptive errors:** Return which composition/layer wasn't found and why
- **Parameter validation:** Check parameters before sending to After Effects

### 8. Enhanced setLayerKeyframe
Handle edge cases better:

```javascript
mcp__after-effects-mcp__setLayerKeyframe({
  compIndex: 1,
  layerIndex: 1,
  propertyName: "Scale",
  timeInSeconds: 0,
  value: [100, 100], // Auto-detect 2D vs 3D
  easing: "easeOut", // Optional preset easing
  clearExisting: false // Option to clear existing keyframes
})
```

### 9. Property Detection
Add tool to inspect layer properties:

```javascript
mcp__after-effects-mcp__getLayerProperties({
  compIndex: 1,
  layerIndex: 1,
  includeKeyframes: true
})
// Returns all properties with their keyframe times and values
```

## 📋 Implementation Priority

1. **High Priority** (Blocking issues)
   - ✅ Fix composition index lookup - COMPLETED & TESTED
   - ⏳ Handle setValue vs setValueAtTime automatically - PENDING

2. **Medium Priority** (Major improvements)
   - ✅ Custom script runner - COMPLETED & TESTED
   - ⏳ Copy animation tool - PENDING
   - ⏳ Asset import - PENDING

3. **Low Priority** (Nice to have)
   - Animation templates
   - Batch operations
   - Enhanced error messages

## 🔍 Testing Requirements

Create test cases for:
- Finding compositions by name and index
- Setting keyframes on properties with and without existing keyframes
- Copying animations between layers
- Importing and replacing assets
- Running custom scripts

## 📝 Documentation Needs

- Update README with new tools
- Add examples for common animation workflows
- Document ExtendScript limitations and workarounds
- Create troubleshooting guide for common errors

## 🎯 Use Case: Falling Impulse Animation

This animation required:
1. Creating a composition ✅
2. Importing multiple assets ❌ (had to use solids as placeholders)
3. Setting up layer hierarchy ⚠️ (manual process)
4. Creating keyframe animations ⚠️ (composition index issues)
5. Copying animations between layers ❌ (had to write custom scripts)
6. Adjusting timing and easing ⚠️ (limited easing control)
7. Exporting for Lottie ❌ (not covered by MCP)

With these improvements, the entire process could be automated through MCP commands.

## 📜 Command History System

### 10. Command History Tracking ✅ COMPLETED
Implemented persistent command history to track all operations:

**File:** `build/temp/ae_command_history.json`

```javascript
// Structure for command history
{
  "commands": [
    {
      "id": "cmd_1234567890",
      "timestamp": "2025-09-23T10:30:00.000Z",
      "tool": "setLayerKeyframe",
      "parameters": {
        "compIndex": 1,
        "layerIndex": 7,
        "propertyName": "Position",
        "timeInSeconds": 0,
        "value": [1920, 20, 0]
      },
      "result": "success",
      "error": null,
      "duration": 125 // ms
    }
  ],
  "session": {
    "startTime": "2025-09-23T10:00:00.000Z",
    "projectName": "FallingImpulseLottie",
    "commandCount": 147
  }
}
```

**New Tool:** Query command history

```javascript
mcp__after-effects-mcp__getCommandHistory({
  filter: {
    tool: "setLayerKeyframe", // optional
    timeRange: {
      from: "2025-09-23T10:00:00.000Z",
      to: "2025-09-23T11:00:00.000Z"
    },
    result: "error" // or "success"
  },
  limit: 50
})
```

**Benefits:**
- Debug what commands were sent
- Replay command sequences
- Generate scripts from history
- Track performance and errors
- Undo/redo functionality

## 🔧 Installation Improvements

### 11. Cross-Platform Installation System ✅ PARTIALLY COMPLETED

**Problem:**
- macOS requires `sudo` for installing panels to After Effects
- Windows and macOS have different installation paths and methods
- No unified installation process between platforms

**Current Issues:** ✅ FIXED
- macOS: ~~Manual sudo required~~ Now uses osascript for native password prompt
- Windows: Different path structure (still handled)
- ~~No password forwarding mechanism~~ Implemented osascript approach for macOS

**Proposed Solution:**

```javascript
// Unified installation script
npm run install-bridge

// Platform detection and appropriate installation
if (process.platform === 'darwin') {
  // macOS installation
  // Option 1: Use sudo-prompt package for GUI password prompt
  // Option 2: Create installer app with proper permissions
  // Option 3: Use osascript for native macOS authorization
} else if (process.platform === 'win32') {
  // Windows installation with admin privileges if needed
}
```

**Installation Structure Standardization:**
```
after-effects-mcp/
├── bridge/
│   ├── mcp-bridge-auto.jsx      # Main bridge panel (same for both platforms)
│   ├── mcp-bridge-lib.jsx       # Shared library functions
│   └── platform/
│       ├── mac/
│       │   └── install.js       # macOS-specific installer
│       └── windows/
│           └── install.js       # Windows-specific installer
├── scripts/                      # ExtendScript files
├── src/                         # Node.js MCP server
└── install.js                   # Unified installer entry point
```

**Key Requirements:**
- Single `npm run install-bridge` command for both platforms
- Automatic platform detection
- Proper permission handling (sudo on macOS, UAC on Windows)
- Bridge files in consistent relative locations
- Shared ExtendScript code between platforms
- Clear error messages for installation issues

**Password Handling Options for macOS:**
1. **sudo-prompt npm package:** Shows native password dialog
2. **osascript approach:** Uses AppleScript for authorization
3. **Installation helper app:** Separate app with proper entitlements
4. **User instructions:** Clear guide for manual installation fallback

## 💡 Future Considerations

- **Lottie Export Integration:** Add Bodymovin export commands
- **Preview Generation:** Create preview renders
- **Project Templates:** Save and load entire project setups
- **Undo/Redo Support:** Track operations for reversal (using command history)
- **Real-time Sync:** Watch for changes and update automatically
- **Multi-version Support:** Handle different After Effects versions gracefully

---

*Last Updated: 2025-09-24 12:09 PM*
*Status: Major improvements completed and tested - All critical fixes verified working + housekeeping system implemented*

## ✅ Completed and Tested Features

### Successfully Implemented:
1. **Composition Index Fix** - `getCompositionByIndex()` function properly finds compositions by position
2. **Custom Script Runner** - Can execute ExtendScript files directly via MCP
3. **Command History Tracking** - Logs all commands to `build/temp/ae_command_history.json`
4. **macOS Installation** - Uses osascript for native password prompts (sudo-prompt as backup)
5. **Bulk Keyframe Operations** - `set-multiple-keyframes` tool working perfectly
6. **Animation Copy** - `copy-animation` tool successfully copies with time offsets
7. **Automatic Housekeeping** - Cleans up temporary JSX files to prevent accumulation

### Test Results (2025-09-24):
- ✅ Composition indexing works correctly (tested with 3 compositions)
- ✅ Custom scripts execute successfully (dramatic animation test with wiggle, spin, pulse, bounce)
- ✅ History tracking captures all 13 test commands with stats
- ✅ Bulk keyframes: Set 9 keyframes across 4 properties in one call
- ✅ Animation copy: Copied animations to 3 layers with 0.5s time offsets
- ✅ Asset manipulation: Added existing footage items to compositions via custom script
- ✅ Bridge script updated in After Effects with all fixes

### Working with Assets:
**Current Capabilities:**
- ✅ Can list all project items (footage, compositions, solids)
- ✅ Can add existing project footage to any composition
- ✅ Can position, scale, and animate footage layers
- ✅ Can access items by ID or name through custom scripts

**Still Needed:**
- ⏳ Direct import of assets from disk paths
- ⏳ Replace footage in existing layers
- ⏳ Batch import multiple files at once

**Workaround Example:**
```javascript
// Use custom script to add existing footage to composition
mcp__after-effects-mcp__run-custom-script({
  script: `
    var comp = app.project.item(compID);
    var footage = app.project.item(footageID);
    var layer = comp.layers.add(footage);
    layer.position.setValue([960, 540]);
    layer.scale.setValue([50, 50]);
  `
})
```

*Based on: MCP-Testing.aep with multiple test compositions and footage items*

## 🧹 Automatic Housekeeping System (2025-09-24 12:09 PM)

### Problem Solved:
- Temporary JSX script files were accumulating in `build/temp` directory
- 20+ files would build up in just one session
- No automatic cleanup mechanism existed

### Implementation:
Added two-tier cleanup system in `src/index.ts`:

1. **Startup Cleanup (`cleanupOldJSXFiles`)**:
   - Runs automatically when MCP server starts
   - Deletes JSX files older than 1 hour
   - Preserves recent files from current/recent sessions
   - Logs cleanup activity to console

2. **Runtime Cleanup (`scheduleFileCleanup`)**:
   - Schedules deletion 5 minutes after each script execution
   - Uses individual `setTimeout` for each file
   - Handles locked/missing files gracefully

### Test Results:
- ✅ Successfully cleaned 9 old files on startup (23 → 14 files)
- ✅ Preserved files from last hour of activity
- ✅ Command history JSON preserved permanently
- ✅ No impact on script execution performance

### Files Affected by Cleanup:
- **Cleaned**: `*.jsx` files older than 1 hour (on startup) or 5 minutes (runtime)
- **Preserved**:
  - `ae_command_history.json` (permanent)
  - Communication JSONs while in use
  - Recent JSX files for debugging

## 📋 TESTING CHECKLIST AFTER RESTART

### Test 1: Asset Import
```javascript
mcp__after-effects-mcp__import-assets({
  files: ["/path/to/test/image.png"],
  addToComp: true,
  compIndex: 3, // MCP Feature Test
  position: [960, 540],
  scale: [75, 75]
})
```

### Test 2: Replace Footage
```javascript
mcp__after-effects-mcp__replace-footage({
  compIndex: 2, // MCP Test Comp
  layerName: "kerv_logo.png",
  newFootagePath: "/path/to/different/image.png"
})
```

### Test 3: Get Layer Properties
```javascript
mcp__after-effects-mcp__get-layer-properties({
  compIndex: 3,
  layerIndex: 1,
  includeKeyframes: true
})
```

### Test 4: Animation Templates
```javascript
// Test different templates
mcp__after-effects-mcp__apply-animation-template({
  template: "bounce",
  compIndex: 3,
  layerIndex: 2,
  duration: 1.5,
  startTime: 0
})

mcp__after-effects-mcp__apply-animation-template({
  template: "slide-and-fall",
  compIndex: 3,
  layerIndex: 3,
  duration: 2
})
```

### Current Project State:
- **Project**: MCP-Testing.aep
- **Compositions**:
  1. FallingImpulseLottie
  2. MCP Test Comp (has kerv_logo, blue, backpack images)
  3. MCP Feature Test (has 4 animated solids)
- **Available Footage**: backpack-red-back.png, backpack-red-front.png, blue.png, green.png, img_0.png, kerv_logo.png, magenta.png, orange.png, scrolling.png