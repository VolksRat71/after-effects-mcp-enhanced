# Render Tools Test Guide for Claude Sessions

This document provides a comprehensive guide for testing the After Effects MCP render tools with Claude. These tools allow AI assistants to visually understand what they're working with in After Effects.

## Prerequisites

Before testing:
1. After Effects is running with a project open
2. MCP Bridge Auto panel is open and auto-run is enabled
3. Test composition exists (e.g., "Test Comp" or "Main Comp")
4. MCP server is running (`npm run dev`)

## Tool Overview

### 🔍 Debug Tools (For AI Visual Understanding)
- **Purpose**: Allow AI to "see" what it's working with
- **Output**: `build/temp/` directory
- **Cleanup**: Automatic after 1 hour
- **Use Case**: Visual debugging, understanding animations, checking states

### 📸 Export Tools (For User Deliverables)
- **Purpose**: Create permanent exports for users
- **Output**: `build/dist/` directory
- **Cleanup**: Never (manual deletion required)
- **Use Case**: Final renders, deliverables, archives

## Test Scenarios

### Test 1: AI Visual Debugging - Single Frame

**Purpose**: Test AI's ability to visually inspect a composition

```
User: "Can you help me see what's happening at 2 seconds in my Main Comp?"

Expected AI Response:
1. Use render-frame-debug tool with comp="Main Comp" and time=2
2. Wait for render completion
3. Use Read tool on the output file to view the image
4. Describe what it sees in the frame
```

**Verification**:
- Check `build/temp/` for `debug_frame_*.png`
- Verify AI can read and describe the image
- File should auto-cleanup after 1 hour

### Test 2: AI Animation Analysis - Multiple Frames

**Purpose**: Test AI's ability to understand animation over time

```
User: "I need help understanding the animation between 0 and 3 seconds. Can you analyze the motion?"

Expected AI Response:
1. Use render-frames-sampled-debug with:
   - comp="Main Comp"
   - startTime=0
   - endTime=3
   - sampleCount=5 (for overview)
2. Wait for render completion
3. Use Read tool on each frame in sequence
4. Analyze and describe the animation progression
```

**Verification**:
- Check `build/temp/debug_session_*/` for 5 frames
- Verify AI describes motion/changes between frames
- Session directory should auto-cleanup after 1 hour

### Test 3: User Export - Single Frame

**Purpose**: Test permanent frame export for user

```
User: "Export frame at 1.5 seconds as 'hero_shot.png' for my presentation"

Expected AI Response:
1. Use render-frame-export with:
   - comp="Main Comp"
   - time=1.5
   - outputFile="hero_shot.png"
2. Inform user file is saved to build/dist/hero_shot.png
3. Note that file is permanent (no auto-cleanup)
```

**Verification**:
- Check `build/dist/` for `hero_shot.png`
- File persists indefinitely
- Correct time was rendered

### Test 4: User Export - Animation Sequence

**Purpose**: Test permanent sequence export for user

```
User: "I need an image sequence of my animation from 0 to 2 seconds, 10 frames total, for external editing"

Expected AI Response:
1. Use render-frames-sampled-export with:
   - comp="Main Comp"
   - startTime=0
   - endTime=2
   - sampleCount=10
   - sessionName="animation_sequence_v1"
   - outputPrefix="frame"
2. Inform user files are in build/dist/animation_sequence_v1/
3. Note permanent storage
```

**Verification**:
- Check `build/dist/animation_sequence_v1/` for 10 frames
- Files named `frame_0_00000.png` through `frame_N_NNNNN.png`
- Directory persists indefinitely

### Test 5: AI Debugging Complex Animation

**Purpose**: Test AI's ability to debug visual issues

```
User: "Something looks wrong with my animation around the 1 second mark. Can you help identify the issue?"

Expected AI Response:
1. Use render-frames-sampled-debug with:
   - comp="Main Comp"
   - startTime=0.5
   - endTime=1.5
   - sampleFps=10 (for detailed inspection)
   - maxFrames=10
2. Read each frame
3. Identify visual anomalies or issues
4. Provide specific feedback about what's wrong
```

**Verification**:
- AI identifies specific frames where issues occur
- Provides actionable feedback
- Uses visual evidence to support conclusions

### Test 6: Mixed Workflow - Debug then Export

**Purpose**: Test workflow from debugging to final export

```
User: "Help me find the best frame for a thumbnail, then export it"

Expected AI Response:
1. First use render-frames-sampled-debug to sample key moments
2. Analyze frames to identify best thumbnail
3. Once identified, use render-frame-export with:
   - Specific time/frame identified
   - outputFile="thumbnail_final.png"
4. Confirm export location
```

**Verification**:
- Debug frames in `build/temp/`
- Final export in `build/dist/`
- AI makes informed decision based on visual analysis

## Error Scenarios to Test

### Error 1: Missing Composition
```
Use render-frame-debug with comp="NonExistentComp"
Expected: Error message about composition not found
```

### Error 2: Invalid Time Range
```
Use render-frames-sampled-debug with startTime=5, endTime=2
Expected: Error about endTime must be greater than startTime
```

### Error 3: Multiple Sampling Strategies
```
Use render-frames-sampled-debug with both sampleCount=5 and sampleFps=10
Expected: Error about only one sampling strategy allowed
```

## Cleanup Verification

### After 1 Hour:
1. Check that debug files in `build/temp/` are automatically removed
2. Verify export files in `build/dist/` remain

### Manual Cleanup:
- User export files must be manually deleted when no longer needed
- Provide instructions: "Your exports are in build/dist/ and will remain until you delete them"

## AI Understanding Verification

The AI should demonstrate understanding of:

1. **Tool Selection**:
   - Uses debug tools for analysis/understanding
   - Uses export tools only for user deliverables
   - Never uses export tools for its own analysis

2. **Visual Analysis**:
   - Can describe composition contents
   - Identifies animation changes between frames
   - Spots visual issues or anomalies
   - Makes recommendations based on visual inspection

3. **File Management**:
   - Knows debug files are temporary
   - Knows export files are permanent
   - Provides correct file locations to users

## Sample Test Session Flow

```
1. Start with simple visual inspection (Test 1)
2. Progress to animation analysis (Test 2)
3. Test error handling (Error scenarios)
4. Perform user exports (Tests 3-4)
5. Complex debugging scenario (Test 5)
6. Complete workflow (Test 6)
7. Wait 1 hour and verify cleanup
```

## Expected Behaviors

✅ **Correct Behaviors**:
- AI uses debug tools proactively to understand visual context
- AI describes what it sees accurately
- AI only uses export tools when user explicitly requests output
- AI provides file locations correctly

❌ **Incorrect Behaviors**:
- Using export tools for its own analysis
- Not using visual tools when debugging animations
- Forgetting to inform users about file locations
- Mixing up temp vs dist directories

## Notes for Testers

- The AI should feel empowered to "look" at the composition whenever it would help
- Visual debugging should feel natural, like the AI can actually see
- Export tools should only be used for explicit user requests
- File paths should always be communicated clearly

Remember: The goal is for the AI to have "eyes" into After Effects, making it a more effective assistant for visual and animation work.