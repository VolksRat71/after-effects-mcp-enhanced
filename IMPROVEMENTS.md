# After Effects MCP - Improvement Roadmap

Based on real-world usage creating the Falling Impulse Lottie animation, here are the key improvements needed for the After Effects MCP server.

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

### 3. Bulk Keyframe Operations
Create tools for common animation tasks:

```javascript
// Set multiple keyframes at once
mcp__after-effects-mcp__setMultipleKeyframes({
  compIndex: 1,
  layerIndex: 1,
  keyframes: [
    {property: "Position", time: 0, value: [100, 100]},
    {property: "Scale", time: 0, value: [100, 100]},
    {property: "Opacity", time: 0, value: 100}
  ]
})

// Copy all animation from one layer to another
mcp__after-effects-mcp__copyAnimation({
  sourceLayer: "blue.png",
  targetLayers: ["green.png", "orange.png"],
  timeOffset: 4.5,
  properties: ["Position", "Scale", "Rotation", "Opacity"]
})
```

### 4. Asset Import and Layer Creation
Import assets and add them to compositions:

```javascript
mcp__after-effects-mcp__importAssets({
  files: [
    "/path/to/product1.png",
    "/path/to/product2.png"
  ],
  addToComp: true,
  compIndex: 1,
  position: [960, 540]
})

// Replace footage in existing layers
mcp__after-effects-mcp__replaceFootage({
  layerName: "Product 1",
  newFootagePath: "/path/to/new-image.png"
})
```

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
   - ✅ Fix composition index lookup - COMPLETED
   - Handle setValue vs setValueAtTime automatically

2. **Medium Priority** (Major improvements)
   - Custom script runner
   - Copy animation tool
   - Asset import

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

**File:** `temp-bridge/ae_command_history.json`

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

*Last Updated: 2025-09-24*
*Status: Major improvements completed - Composition index fix, Custom script runner, Command history tracking, macOS installation improvements*
*Based on: Falling Impulse Lottie Animation Project*