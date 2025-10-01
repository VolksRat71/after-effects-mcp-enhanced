# After Effects MCP Tools Guide for AI Assistants

## Overview
You have access to Adobe After Effects through the Model Context Protocol (MCP). This guide explains every tool available and when to use them. The After Effects application must be running with the MCP Bridge panel open for these tools to work.

## Important Context
- **After Effects must be running** with a project open
- **MCP Bridge Auto panel** must be open (Window > mcp-bridge-auto.jsx) with "Auto-run" enabled
- **Commands are processed automatically** - rapid commands (within 500ms) batch together for efficient execution
- **Results are retrieved** using the `get-results` tool after execution
- **Files are rendered as TIFF** initially but automatically converted to PNG
- **Batch processing** - Multiple commands execute sequentially with progress tracking and ETA

## Tool Categories

### 🎬 Composition Management

#### create-composition
**Purpose**: Create a new composition in the project
**When to use**: Starting a new animation, setting up a scene
**Parameters**:
- `name` (required): Composition name
- `width` (required): Width in pixels
- `height` (required): Height in pixels
- `frameRate`: Frames per second (default: 30)
- `duration`: Duration in seconds (default: 10)
- `backgroundColor`: RGB color object (default: black)

**Example**:
```javascript
{
  name: "Main Animation",
  width: 1920,
  height: 1080,
  frameRate: 30,
  duration: 10
}
```

#### list-compositions
**Purpose**: Get all compositions in the current project
**When to use**: Understanding project structure, finding composition to work with
**Returns**: List of compositions with names and indices

#### get-project-info
**Purpose**: Get overall project information
**When to use**: Understanding project settings, frame rate, duration
**Returns**: Project metadata including dimensions and timing

### 🎨 Layer Creation & Management

#### create-text-layer
**Purpose**: Add text to a composition
**When to use**: Adding titles, captions, labels
**Parameters**:
- `compIndex`: Which composition (1-based)
- `text`: The text content
- `fontName`: Font to use
- `fontSize`: Size in pixels
- `position`: [x, y] coordinates

#### create-shape-layer
**Purpose**: Create geometric shapes
**When to use**: Adding backgrounds, design elements, masks
**Parameters**:
- `compIndex`: Which composition
- `shapeType`: "rectangle", "ellipse", "polygon", "star"
- `fillColor`: RGB color object
- `strokeColor`: RGB color object
- `strokeWidth`: Width in pixels

#### create-solid-layer
**Purpose**: Create solid color or adjustment layers
**When to use**: Backgrounds, adjustment layers for effects
**Parameters**:
- `compIndex`: Which composition
- `name`: Layer name
- `color`: RGB color object
- `width`, `height`: Dimensions

#### set-layer-properties
**Purpose**: Modify any layer's properties
**When to use**: Positioning, scaling, rotating, changing opacity
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer (1-based)
- Properties to change (position, scale, rotation, opacity, etc.)

#### get-layer-properties
**Purpose**: Get detailed information about a layer
**When to use**: Understanding current state, debugging animations
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer
- `includeKeyframes`: Get keyframe data (true/false)

### 🎭 Animation Tools

#### set-layer-keyframe
**Purpose**: Set a single keyframe on a property
**When to use**: Creating custom animations, precise timing control
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer
- `propertyName`: "Position", "Scale", "Rotation", "Opacity"
- `timeInSeconds`: When to set the keyframe
- `value`: The value (array for Position/Scale, number for others)

#### set-multiple-keyframes
**Purpose**: Set multiple keyframes at once
**When to use**: Complex animations, efficiency
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer
- `keyframes`: Array of keyframe objects with property, time, value

#### copy-animation
**Purpose**: Copy all keyframes from one layer to others
**When to use**: Duplicating animations, creating synchronized motion
**Parameters**:
- `compIndex`: Which composition
- `sourceLayerIndex`: Layer to copy from
- `targetLayerIndices`: Array of layers to copy to
- `timeOffset`: Offset each layer by this many seconds

#### set-layer-expression
**Purpose**: Apply expressions for procedural animation
**When to use**: Creating dynamic relationships, automated motion
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer
- `propertyName`: Which property
- `expressionString`: JavaScript expression code

#### apply-animation-template
**Purpose**: Apply pre-built animations
**When to use**: Quick common animations without manual keyframing
**Templates available**:
- `fade-in`, `fade-out`: Opacity animations
- `slide-left`, `slide-right`, `slide-up`, `slide-down`: Position animations
- `bounce`: Bouncing motion with scale
- `spin`: 360-degree rotation
- `zoom-in`, `zoom-out`: Scale animations
- `shake`: Random position shake
- `slide-and-fall`: Complex motion

### 🎬 Visual Debugging Tools (FOR AI USE)

#### render-frame-debug
**Purpose**: Render a single frame so YOU can SEE what's happening
**When to use**:
- Debugging visual issues
- Understanding composition state
- Checking animation at specific time
- Verifying your changes worked
**Output**: PNG in `build/temp/` (auto-deleted after 1 hour)
**Parameters**:
- `comp`: Composition name
- `time` or `frame`: When to capture
- `format`: "png" or "jpg"

**IMPORTANT**: Use this liberally to understand what you're working with!

#### render-frames-sampled-debug
**Purpose**: Render multiple frames to understand animation
**When to use**:
- Analyzing motion over time
- Debugging animation issues
- Understanding timing problems
- Checking smoothness
**Output**: PNG sequence in `build/temp/session_*/` (auto-deleted after 1 hour)
**Parameters**:
- `comp`: Composition name
- `startTime`, `endTime`: Time range
- `sampleCount` OR `sampleFps` OR `frameStep`: How many frames
- `maxFrames`: Limit (default: 100)

### 📸 User Export Tools (FOR USER DELIVERABLES)

#### render-frame-export
**Purpose**: Export a single frame for the user
**When to use**: User requests specific frame, thumbnail, poster
**Output**: PNG in `build/dist/` (permanent)
**Parameters**:
- `comp`: Composition name
- `time` or `frame`: When to capture
- `outputFile`: Filename for the export

#### render-frames-sampled-export
**Purpose**: Export animation sequence for user
**When to use**: User needs image sequence, animation preview
**Output**: PNG sequence in `build/dist/session_*/` (permanent)
**Parameters**:
- `comp`: Composition name
- `startTime`, `endTime`: Time range
- `sampleCount` OR `sampleFps` OR `frameStep`: Sampling method
- `sessionName`: Directory name
- `outputPrefix`: File prefix

### 📦 Asset Management

#### import-assets
**Purpose**: Import images or videos into project
**When to use**: Adding footage, images, external media
**Parameters**:
- `files`: Array of absolute file paths
- `addToComp`: Add to composition (true/false)
- `compIndex`: Which composition
- `position`: Where to place
- `scale`: Size adjustment

#### replace-footage
**Purpose**: Replace existing layer's source file
**When to use**: Updating assets, swapping images
**Parameters**:
- `compIndex`: Which composition
- `layerIndex` or `layerName`: Which layer
- `newFootagePath`: New file path

### 🎨 Effects

#### apply-effect
**Purpose**: Apply After Effects built-in effects
**When to use**: Adding visual effects, filters
**Parameters**:
- `compIndex`: Which composition
- `layerIndex`: Which layer
- `effectName`: Name of the effect
- `effectSettings`: Parameters for the effect

#### apply-effect-template
**Purpose**: Apply pre-configured effect setups
**When to use**: Quick common effects
**Templates**:
- `gaussian-blur`: Soft blur
- `directional-blur`: Motion blur
- `color-balance`: Color correction
- `brightness-contrast`: Exposure adjustment
- `glow`: Light emission
- `drop-shadow`: Shadow effect
- `cinematic-look`: Film style

### 🛠 Utility Tools

#### run-custom-script
**Purpose**: Execute custom ExtendScript code
**When to use**: Advanced operations not covered by other tools
**Parameters**:
- `script`: ExtendScript code
- `description`: What the script does

#### get-results
**Purpose**: Get results from the last executed command
**When to use**: ALWAYS after running any tool to see the output
**Returns**: JSON with operation results

#### get-command-history
**Purpose**: See what commands have been executed
**When to use**: Debugging, understanding workflow
**Parameters**:
- `filter`: Optional filters for history

#### get-help
**Purpose**: Get help about using the MCP
**When to use**: User asks about capabilities
**Returns**: Help documentation

## Workflow Patterns

### Creating and Animating
1. Create composition
2. Add layers (text, shapes, solids)
3. Set initial properties
4. Add keyframes or animation templates
5. Use `render-frame-debug` to check your work
6. Apply effects if needed
7. Export final result with `render-frame-export` if user requests

### Debugging Visual Issues
1. Use `render-frame-debug` to see current state
2. Check layer properties with `get-layer-properties`
3. Make adjustments with `set-layer-properties`
4. Render again to verify fix
5. Use `render-frames-sampled-debug` for animation issues

### Working with User Assets
1. Use `import-assets` to bring in user files
2. Position and scale appropriately
3. Apply animations or effects
4. Use debug renders to verify
5. Export with export tools when requested

## Best Practices

### Always Verify Visually
- Use `render-frame-debug` frequently to SEE what you're doing
- Don't assume changes worked - verify with renders
- For animations, use `render-frames-sampled-debug` to check motion

### Index Usage
- Compositions and layers use 1-based indexing
- First composition is index 1, not 0
- First layer is index 1, not 0

### Error Handling
- Always use `get-results` after commands
- Check for error messages in results
- If composition not found, use `list-compositions` first

### Performance
- Rendering takes time - warn users about delays
- Limit frame counts with `maxFrames` parameter
- Use appropriate sampling (don't render every frame)

### File Management
- Debug renders auto-delete after 1 hour
- User exports are permanent
- TIFF files are automatically converted to PNG

## Common Tasks Quick Reference

**"Show me what frame 30 looks like"**
```javascript
render-frame-debug({ comp: "Main Comp", frame: 30 })
```

**"Export a thumbnail at 2 seconds"**
```javascript
render-frame-export({
  comp: "Main Comp",
  time: 2,
  outputFile: "thumbnail.png"
})
```

**"Add text to the composition"**
```javascript
create-text-layer({
  compIndex: 1,
  text: "Hello World",
  fontSize: 72,
  position: [960, 540]
})
```

**"Make it fade in"**
```javascript
apply-animation-template({
  template: "fade-in",
  compIndex: 1,
  layerIndex: 1,
  duration: 1
})
```

**"Show me the animation from 0 to 3 seconds"**
```javascript
render-frames-sampled-debug({
  comp: "Main Comp",
  startTime: 0,
  endTime: 3,
  sampleCount: 10
})
```

## Remember
- You can SEE what you're working with - use the debug render tools!
- Always get results after running commands
- Verify your changes worked before moving on
- Help the user understand what you're doing
- After Effects must be running for any of this to work