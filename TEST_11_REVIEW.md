# TEST 11: MaxFrames Truncation - Issue Review

## Test Execution Date: 2025-09-28

## Test Status: **FAILED**

## Issues Identified

### Issue 1: Duplicate Output Module Names
**Evidence**: `alert.png` - After Effects error dialog showing "An output module with the file name you specified already exists"

**Root Cause**:
- Location: `src/dist/modules/render/renderFramesSampled.jsx:126-128`
- The script uses sequence pattern `[#####]` for TIFF output, causing naming conflicts
- All frames are being treated as part of the same sequence pattern

```javascript
// Line 107: Creates unique name like "frame_0.tif", "frame_4.tif"
var outputFile = outputPrefix + "_" + frameNumber + ".tif";

// Lines 126-128: Converts to sequence pattern causing conflicts
var fileNameWithoutExt = outputPath.substring(0, outputPath.lastIndexOf("."));
var sequencePath = fileNameWithoutExt + "[#####].tif";
outputModule.file = new File(sequencePath);
```

### Issue 2: Missing [MCP] Comment Tags
**Evidence**: `queue.png` - Render Queue screenshot showing items WITHOUT "[MCP]" prefix in Comment field

**Expected Behavior**:
- Each render queue item should have Comment: "[MCP] Frame {number}"
- This allows MCP cleanup logic (lines 95-100) to identify and remove MCP-created items

**Actual Behavior**:
- Queue items show no comment field content
- MCP cleanup logic cannot identify these items for removal
- Previous MCP renders accumulate in the queue

**Code Analysis**:
- Line 111 DOES set the comment: `rqItem.comment = "[MCP] Frame " + frameNumber;`
- Comment is being set in code but not appearing in After Effects render queue
- Possible timing issue or API limitation

### Issue 3: Output Naming Pattern
**Evidence**: `queue.png` - Shows repeated "frame_0[#####].tif" patterns

**Problem**:
- Multiple frames attempting to use similar sequence patterns
- After Effects detects conflicts and auto-renames with brackets
- This breaks the expected output paths

## Impact on Test

### Expected Results:
- ✅ Should render 10 frames (truncated from 150 due to maxFrames=10)
- ✅ Should show warning about truncation
- ✅ Should create unique output files
- ✅ Should tag items with [MCP] for cleanup

### Actual Results:
- ❌ Error dialog appears about duplicate output module names
- ❌ Render queue items lack [MCP] comment tags
- ❌ Output naming conflicts prevent successful render
- ❌ Cannot verify maxFrames truncation due to render failure

## Code References

### File: `src/dist/modules/render/renderFramesSampled.jsx`

1. **MCP Cleanup Logic** (lines 95-100):
```javascript
for (var i = app.project.renderQueue.numItems; i >= 1; i--) {
    var item = app.project.renderQueue.item(i);
    if (item.comment && item.comment.indexOf("[MCP]") === 0) {
        item.remove();
    }
}
```

2. **Comment Setting** (line 111):
```javascript
rqItem.comment = "[MCP] Frame " + frameNumber;
```

3. **Problematic Output Path Logic** (lines 126-128):
```javascript
var fileNameWithoutExt = outputPath.substring(0, outputPath.lastIndexOf("."));
var sequencePath = fileNameWithoutExt + "[#####].tif";
outputModule.file = new File(sequencePath);
```

## Recommendations

### Fix 1: Remove Sequence Pattern for Individual Frames
Instead of using `[#####]` pattern (which is for sequences), use direct file paths:
```javascript
// Replace lines 126-128 with:
outputModule.file = new File(outputPath);
```

### Fix 2: Verify Comment Setting
Add debugging or verification after setting comment:
```javascript
rqItem.comment = "[MCP] Frame " + frameNumber;
// Add verification
if (rqItem.comment !== "[MCP] Frame " + frameNumber) {
    // Handle error or retry
}
```

### Fix 3: Use Unique Output Names
Ensure each frame has a truly unique output path:
```javascript
// Consider adding timestamp or UUID to prevent any conflicts
var outputFile = outputPrefix + "_frame_" + frameNumber + "_" + Date.now() + ".tif";
```

## Test Cannot Continue
Due to the render failure, TEST 11 cannot be completed and TEST 12 would face the same issues. The code needs to be fixed before these tests can be properly executed.