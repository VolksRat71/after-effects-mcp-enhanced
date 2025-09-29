# After Effects MCP Quick Start

## Prerequisites
✓ After Effects is running with a project open
✓ MCP Bridge panel is open (Window > mcp-bridge-auto.jsx)
✓ "Auto-run commands" is checked in the panel

## Essential Tools

### Visual Understanding (Use These First!)
- **render-frame-debug** - See a single frame (YOU can view the image)
- **render-frames-sampled-debug** - See animation over time
- **get-results** - ALWAYS use after any command to get output

### Core Creation
- **create-composition** - Make a new comp
- **create-text-layer** - Add text
- **create-shape-layer** - Add shapes
- **set-layer-properties** - Move, scale, rotate things

### Animation
- **set-layer-keyframe** - Animate properties
- **apply-animation-template** - Quick animations (fade, slide, bounce)

### User Exports
- **render-frame-export** - Export single frame for user
- **render-frames-sampled-export** - Export animation sequence

## Workflow Example

```javascript
// 1. Check what compositions exist
list-compositions
get-results

// 2. See what it looks like
render-frame-debug({ comp: "Main Comp", time: 0 })
get-results
// Now READ the image file to see it!

// 3. Add something
create-text-layer({ compIndex: 1, text: "Hello", position: [960, 540] })
get-results

// 4. Animate it
apply-animation-template({ template: "fade-in", compIndex: 1, layerIndex: 1 })
get-results

// 5. Check the animation
render-frames-sampled-debug({
  comp: "Main Comp",
  startTime: 0,
  endTime: 2,
  sampleCount: 5
})
get-results
// Read each frame to see the animation!

// 6. Export for user (only if requested)
render-frame-export({ comp: "Main Comp", time: 1, outputFile: "final.png" })
get-results
```

## Key Points
- **SEE what you're doing** - Use render-debug tools liberally
- **Always get-results** - Every command needs this to see output
- **1-based indexing** - First comp/layer is 1, not 0
- **Auto-cleanup** - Debug renders delete after 1 hour
- **TIFF→PNG** - Automatic conversion happens in background

## Need More?
See MCP_TOOLS_GUIDE.md for complete documentation of all 30+ tools.
