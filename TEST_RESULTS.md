# TEST RESULTS - Render Frame Tools

**Test Date:** September 28, 2025
**Tester:** Claude Code
**Project:** after-effects-mcp-enhanced
**Composition Used:** RenderTest (1920x1080, 30fps, 5 seconds)

---

## Executive Summary

Testing was conducted for the render-frame and render-frames-sampled tools. **TEST 1 initially failed but passed after clearing the Render Queue**, revealing a critical issue with render queue cleanup. Tests 11 and 12 are being executed to verify multi-frame rendering behavior.

---

## Test Execution Log

### Pre-Test Setup
✅ **PASS** - Composition detected successfully
- Composition: "RenderTest"
- Dimensions: 1920x1080
- Frame Rate: 30fps
- Duration: 5 seconds

---

### TEST 1: Single Frame Render (Basic)
**Status:** ✅ **PASS** (after manual intervention)

**Test Parameters:**
```json
{
  "comp": "RenderTest",
  "format": "png"
}
```

**Expected Behavior:**
- Command queues successfully
- Render executes in After Effects
- PNG file created in build/temp/
- get-results returns success with metadata

**Test Execution:**

**Attempt 1 - FAILED:**
1. Command queued successfully ✅
2. Expected output path: `build\temp\frame_1759084842245_627ac6a9.png`
3. After Effects displayed error dialog ❌

**Error Encountered:**
> **After Effects Error:**
> "The name of the selected output module is already in use. Please choose another name."

**Screenshot:** See `Screenshot 2025-09-28 134058.png` for visual confirmation of the error dialog.

**Attempt 2 - PASSED:**
1. **Manual action:** Cleared Render Queue in After Effects
2. Command queued successfully ✅
3. Render executed successfully ✅
4. get-results returned:
```json
{
  "success": true,
  "comp": "RenderTest",
  "frame": 19,
  "time": 0.63333333333333,
  "width": 1920,
  "height": 1080,
  "outputPath": "C:/Users/natha/Desktop/testing/after-effects-mcp-enhanced/build/temp/frame_1759085173679_c9755547_00019.png",
  "converted": true
}
```

**Critical Finding:**
The render scripts **DO NOT clean up the Render Queue** between runs. When leftover render queue items exist from previous renders, the output module naming collides with existing items, causing the error. Once the Render Queue is manually cleared, renders work correctly.

**Root Cause:**
- Render queue items accumulate from previous runs
- Output module names conflict with existing queue items
- No automatic cleanup of completed render queue items

**Impact:** Users must manually clear the Render Queue between render operations, or sequential renders will fail.

---

## Critical Issues Identified

### Issue #1: Render Queue Not Cleaned Up Between Runs
**Severity:** CRITICAL
**Component:** All render tools (renderFrame.jsx, renderFramesSampled.jsx)

**Description:**
The render scripts do not automatically clear or clean up the After Effects Render Queue between operations. This causes output module naming conflicts when leftover render queue items exist from previous renders.

**Evidence:**
- Error dialog shown in `Screenshot 2025-09-28 134058.png`
- Error message: "The name of the selected output module is already in use"
- TEST 1 failed on first attempt with items in queue
- TEST 1 passed on second attempt after manually clearing the queue

**Root Cause Confirmed:**
- Render queue items accumulate from previous render operations
- **After Effects automatically names output modules** based on composition name and frame range
- When rendering the same comp/frames again, AE generates the same default module name
- This collides with the module name on existing queue items from previous renders
- Neither `renderFrame.jsx` nor `renderFramesSampled.jsx` explicitly sets unique output module names
- The `outputModule.name` property is **read-only** in After Effects, so you cannot programmatically rename modules to avoid collisions
- No automatic cleanup logic exists in the render scripts

**Why This Happens:**
After Effects uses a default naming scheme for output modules (likely based on composition name). When you:
1. Render frame 0 from "RenderTest" → AE creates output module with default name (e.g., "RenderTest")
2. Queue item stays in render queue after completion
3. Render frame 0 from "RenderTest" again → AE tries to create another output module with the same default name
4. **Collision:** "The name of the selected output module is already in use"

**Required Fix:**
The render scripts should clear the Render Queue before adding new items. Add this at the start of renderFrame.jsx and renderFramesSampled.jsx:

```javascript
// Clear render queue before adding new items to avoid output module naming conflicts
// (AE auto-names modules based on comp/frames, causing collisions with existing queue items)
while (app.project.renderQueue.numItems > 0) {
  app.project.renderQueue.item(1).remove();
}
```

**Alternative Approaches:**
1. Clear only completed items (leave queued/rendering items): More sophisticated but safer
2. ~~Use unique output module names~~ - NOT POSSIBLE: `outputModule.name` is read-only
3. Clean up after successful renders (though this won't help if script crashes or is interrupted)

---

## Environment Details

- **OS:** Windows (MINGW64_NT-10.0-19045)
- **Working Directory:** `C:\Users\natha\Desktop\testing\after-effects-mcp-enhanced`
- **MCP Bridge Auto Panel:** Expected to be running (not verified due to error)
- **After Effects:** Running with test project open

---

## Recommendations for Developer

1. **PRIORITY 1:** Add render queue cleanup to `renderFrame.jsx` and `renderFramesSampled.jsx`
2. Decide on cleanup strategy: clear all items before render, or only clear completed items
3. Consider adding error handling for queue cleanup failures
4. Add better error reporting from the panel back to the MCP results file when AE dialogs appear
5. Document the queue cleanup behavior for users

---

## Reviewer Notes

⚠️ **Please examine the screenshot:** `Screenshot 2025-09-28 134058.png`

The screenshot clearly shows the After Effects error dialog that occurs when the Render Queue has leftover items from previous renders. This is a critical issue that must be resolved before the render-frame functionality can be considered production-ready.

The root cause has been confirmed: **no render queue cleanup logic exists in the render scripts**. This causes naming conflicts with output modules on existing queue items.

---

## Additional Tests

### TEST 11: MaxFrames Truncation
**Status:** ❌ **FAILED**

**Test Parameters:**
```json
{
  "comp": "RenderTest",
  "startTime": 0,
  "endTime": 5,
  "sampleFps": 30,
  "maxFrames": 10,
  "format": "png"
}
```

**Expected Behavior:**
- Would sample ~150 frames at 30fps over 5 seconds
- Should truncate to maxFrames=10
- Warning message about truncation
- 10 frames rendered successfully
- No output module naming conflicts

**Actual Behavior:**
❌ Script failed with error:
```
After Effects error: Unable to set "name". It is a readOnly attribute.
Line: 1350 (actual line 118 in renderFramesSampled.jsx)
```

**Root Cause:**
Line 118 in `renderFramesSampled.jsx`:
```javascript
outputModule.name = "Frame_" + frameNumber + "_" + i;
```

The `outputModule.name` property is **read-only in After Effects**. Attempting to set it causes the script to fail immediately.

**Impact:** All multi-frame sampled renders are currently broken. TEST 11 and TEST 12 cannot be completed.

**Required Fix:**
Remove or comment out line 118. The output module will use its default name, which should be sufficient. The naming conflict mentioned in the test plan notes (⚠️ FIX APPLIED) appears to have been "fixed" by attempting to rename the output module, but this is not a valid approach since the property is read-only.

### TEST 12: Inline Data with Multiple Frames
**Status:** ⏸️ **BLOCKED** - Cannot run due to TEST 11 failure

TEST 12 uses the same `render-frames-sampled` tool and will fail with the same error.

---

---

## Critical Issues Summary

### Issue #1: Render Queue Not Cleaned Up
**Severity:** HIGH
**Status:** Identified, workaround available (manually clear queue)
**Component:** renderFrame.jsx, renderFramesSampled.jsx

### Issue #2: Read-Only Property Assignment
**Severity:** CRITICAL - BLOCKS ALL MULTI-FRAME RENDERS
**Status:** Confirmed in renderFramesSampled.jsx:118
**Component:** renderFramesSampled.jsx
**Fix:** Remove line 118: `outputModule.name = "Frame_" + frameNumber + "_" + i;`

---

**Test Session Completed:** September 28, 2025, 13:52
**Overall Status:** ❌ CRITICAL FAILURES
- TEST 1: PASS (with manual workaround)
- TEST 11: FAIL (read-only property error)
- TEST 12: BLOCKED (same tool as TEST 11)

**Conclusion:** The render-frames-sampled tool is completely broken due to attempting to set a read-only property. Single-frame renders work but require manual render queue cleanup.