# After Effects MCP - Improvement Roadmap

Based on real-world usage creating the Falling Impulse Lottie animation, here are the key improvements needed for the After Effects MCP server.

## 🔴 Critical Fixes

### 1. Composition Index Lookup Issue
**Problem:** The MCP can't find compositions by index. It expects index 1, 2, 3... but After Effects compositions have project item IDs like 39.

**Current Error:**
```
"Composition not found at index 1"
```

**Solution:**
- Fix composition lookup to use position among compositions, not project item ID
- Update `getCompositionByIndex()` to filter and count only CompItem objects

**Code Location:** Look for composition lookup logic in the bridge scripts

## 🚀 New Features to Add

### 2. Custom Script Runner Tool
Add ability to run custom ExtendScript code directly without writing to disk:

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
   - Fix composition index lookup
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

## 💡 Future Considerations

- **Lottie Export Integration:** Add Bodymovin export commands
- **Preview Generation:** Create preview renders
- **Project Templates:** Save and load entire project setups
- **Undo/Redo Support:** Track operations for reversal
- **Real-time Sync:** Watch for changes and update automatically

---

*Last Updated: 2025-09-23*
*Based on: Falling Impulse Lottie Animation Project*