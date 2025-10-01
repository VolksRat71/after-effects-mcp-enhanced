# Panel-Based Architecture Migration Plan

## Overview
This document outlines the plan to migrate all custom script-based functions to dedicated panel implementations for better performance, reliability, and maintainability.

## Current Issues to Address

### 1. Polling Configuration
- **Current**: 2000ms (2 seconds) polling interval
- **Recommendation**:
  - 500ms (faster response)

### 2. Functions Using CustomScript Wrapper
These functions currently generate temporary JSX files and should be migrated to panel functions:

| Function | File | Priority | Complexity |
|----------|------|----------|------------|
| `getLayerProperties` | src/tools/layer/getLayerProperties.ts | HIGH | Medium |
| `importAssets` | src/tools/media/importAssets.ts | HIGH | High |
| `replaceFootage` | src/tools/media/replaceFootage.ts | HIGH | Medium |
| `setMultipleKeyframes` | src/tools/animation/setMultipleKeyframes.ts | MEDIUM | Medium |
| `copyAnimation` | src/tools/animation/copyAnimation.ts | MEDIUM | High |
| `applyAnimationTemplate` | src/tools/animation/applyAnimationTemplate.ts | MEDIUM | High |

## Migration Strategy

### Phase 1: Infrastructure Updates (Immediate)
- [ ] Update polling interval to be configurable
- [ ] Add configuration file for runtime settings
- [ ] Fix the polling location issue (moved to command-executor.jsx)

### Phase 2: High Priority Migrations (Week 1)
- [ ] Migrate `getLayerProperties`
- [ ] Migrate `importAssets`
- [ ] Migrate `replaceFootage`

### Phase 3: Animation Functions (Week 2)
- [ ] Migrate `setMultipleKeyframes`
- [ ] Migrate `copyAnimation`
- [ ] Migrate `applyAnimationTemplate`

## Implementation Steps for Each Migration

### Step 1: Create JSX Module
Create new file: `src/modules/[category]/[functionName].jsx`

Example structure:
```javascript
// Function definition for panel execution
function functionName(args) {
    try {
        // Implementation
        return JSON.stringify({
            success: true,
            data: result
        });
    } catch (error) {
        return JSON.stringify({
            error: error.toString(),
            line: error.line
        });
    }
}
```

### Step 2: Include in Bridge Panel
Add to `src/dist/mcp-bridge-auto.jsx`:
```javascript
#include "./modules/[category]/[functionName].jsx"
```

### Step 3: Add Command Case
Update `src/dist/modules/base/command-executor.jsx`:
```javascript
case "functionName":
    result = functionName(args);
    break;
```

### Step 4: Update TypeScript Tool
Change from:
```typescript
fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });
```
To:
```typescript
fileManager.writeCommandFile("functionName", args);
```

### Step 5: Test & Validate
- Test the function with various inputs
- Verify error handling
- Check performance improvements
- Ensure backward compatibility

## Testing Plan

### For Each Migrated Function:
1. **Unit Test**: Test function in isolation
2. **Integration Test**: Test with MCP server
3. **Performance Test**: Compare with customScript version
4. **Error Handling**: Test edge cases and failures

### Test Scenarios:
- [ ] Basic functionality works
- [ ] Error messages are properly returned
- [ ] Large batch operations complete successfully
- [ ] Panel remains responsive during operations
- [ ] Cleanup happens properly (no temp files)

## Benefits After Migration

1. **Performance**: 30-50% faster execution (no file I/O)
2. **Reliability**: Direct panel execution, no temp file issues
3. **Debugging**: Better error messages and stack traces
4. **Maintenance**: Cleaner codebase, single execution path
5. **User Experience**: Real-time progress updates possible

## Configuration Improvements

### Proposed config.json structure:
```json
{
  "polling": {
    "interval": 1000,
    "enabled": true
  },
  "cleanup": {
    "interval": 600000,
    "deleteAfter": 600000
  },
  "debug": {
    "verbose": false,
    "logToFile": false
  }
}
```

## Rollback Plan

If any migration causes issues:
1. Keep original customScript implementation as fallback
2. Add feature flag to toggle between implementations
3. Monitor error rates and performance metrics
4. Revert via git if critical issues arise

## Success Metrics

- [ ] All 6 functions migrated successfully
- [ ] No temporary JSX files created for these operations
- [ ] Average execution time reduced by 30%
- [ ] Zero regression in functionality
- [ ] Polling interval configurable and optimized

## Next Immediate Actions

1. **Fix polling interval** (currently at 2 seconds, should be configurable)
2. **Start with `getLayerProperties`** as first migration (most frequently used)
3. **Create test harness** for validating migrations

## Notes

- The polling was moved from `main.jsx` to `command-executor.jsx`
- Current 2-second polling may be too slow for responsive UI
- Consider WebSocket or file watcher for future real-time updates