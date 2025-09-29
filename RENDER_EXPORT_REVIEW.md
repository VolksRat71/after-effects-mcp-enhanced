# Render Export Tools Review

## Test Date
2025-09-29

## Tools Tested
- `render-frames-sampled-export` - Multi-frame export for users
- `render-frame-export` - Single frame export for users

## Results

### Single Frame Export
**Status**: ✓ Working correctly
- Exported to: `build/dist/frame_at_1_3s_00039.png`
- Format: PNG (as expected)

### Sample Frames Export
**Status**: ⚠ Format Issue
- Exported to: `build/dist/animation_review/`
- **Issue**: Frames exported as `.tif` instead of `.png`
- Expected: PNG format
- Actual: TIF format

## Notes
- All exports completed successfully
- Files are permanent (no auto-cleanup)
- Only issue is the unexpected TIF format for sampled frames export

## Action Item
- Investigate why `render-frames-sampled-export` outputs TIF instead of PNG
- Ensure format parameter is properly applied to batch exports