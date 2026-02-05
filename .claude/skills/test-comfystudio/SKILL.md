---
name: test-comfystudio
description: Test ComfyStudio UI using agent-browser with common workflows
disable-model-invocation: true
---

# Test ComfyStudio UI

Interactive browser testing for ComfyStudio's React canvas application using agent-browser.

## Usage

```bash
/test-comfystudio [workflow]
```

### Available Workflows

```bash
/test-comfystudio smoke        # Quick smoke test - verify app loads
/test-comfystudio canvas       # Test canvas interactions
/test-comfystudio tools        # Test tool switching and panels
/test-comfystudio dock         # Test dock layout and panels
/test-comfystudio generation   # Test image generation flow
```

## Implementation

### Smoke Test

```bash
#!/bin/bash
WORKFLOW="${1:-smoke}"
DEV_SERVER="http://localhost:3000"

echo "🧪 Testing ComfyStudio: $WORKFLOW"
echo "================================"

case "$WORKFLOW" in
  smoke)
    echo "Starting smoke test..."
    agent-browser open "$DEV_SERVER"
    sleep 2

    # Take screenshot
    agent-browser screenshot /tmp/comfystudio-smoke.png
    echo "✓ Screenshot saved: /tmp/comfystudio-smoke.png"

    # Get page structure
    agent-browser snapshot -i > /tmp/comfystudio-snapshot.txt
    echo "✓ Snapshot saved: /tmp/comfystudio-snapshot.txt"

    # Check for errors
    agent-browser console > /tmp/comfystudio-console.txt
    agent-browser errors > /tmp/comfystudio-errors.txt

    if grep -q "error" /tmp/comfystudio-errors.txt; then
      echo "❌ JavaScript errors found:"
      cat /tmp/comfystudio-errors.txt
    else
      echo "✓ No JavaScript errors"
    fi

    echo ""
    echo "✅ Smoke test complete"
    ;;

  canvas)
    echo "Testing canvas interactions..."
    agent-browser open "$DEV_SERVER"
    sleep 2

    agent-browser snapshot -i
    echo ""
    echo "📋 Available interactive elements shown above"
    echo "Use refs (e.g., @e1) to interact with canvas elements"
    echo ""
    echo "Common canvas tests:"
    echo "  - Click and drag on canvas"
    echo "  - Zoom in/out (mouse wheel or buttons)"
    echo "  - Pan the canvas"
    echo "  - Test brush tool interactions"
    ;;

  tools)
    echo "Testing tool system..."
    agent-browser open "$DEV_SERVER"
    sleep 2

    agent-browser snapshot -i
    echo ""
    echo "📋 Tool panel elements shown above"
    echo "Look for tool buttons and settings panels"
    echo ""
    echo "Common tool tests:"
    echo "  - Switch between tools"
    echo "  - Adjust tool settings (sliders, dropdowns)"
    echo "  - Verify tool cursor changes"
    ;;

  dock)
    echo "Testing dock layout..."
    agent-browser open "$DEV_SERVER"
    sleep 2

    agent-browser snapshot -i
    echo ""
    echo "📋 Dock elements shown above"
    echo "Look for dock panels, tabs, and resize handles"
    echo ""
    echo "Common dock tests:"
    echo "  - Open/close panels"
    echo "  - Resize panels"
    echo "  - Drag tabs between panels"
    ;;

  generation)
    echo "Testing generation workflow..."
    agent-browser open "$DEV_SERVER"
    sleep 2

    agent-browser snapshot -i
    echo ""
    echo "📋 Generation UI elements shown above"
    echo "Look for prompt input, settings, and generate button"
    echo ""
    echo "Common generation tests:"
    echo "  - Enter prompt text"
    echo "  - Adjust generation settings"
    echo "  - Click generate button"
    echo "  - Monitor progress indicators"
    ;;

  *)
    echo "Unknown workflow: $WORKFLOW"
    echo ""
    echo "Available workflows:"
    echo "  smoke       - Quick app health check"
    echo "  canvas      - Canvas interaction tests"
    echo "  tools       - Tool system tests"
    echo "  dock        - Dock layout tests"
    echo "  generation  - Generation workflow tests"
    exit 1
    ;;
esac

echo ""
echo "Browser is still open. Run more commands:"
echo "  agent-browser snapshot -i      # Get updated refs"
echo "  agent-browser click @e1        # Click element"
echo "  agent-browser screenshot       # Take screenshot"
echo "  agent-browser close           # Close browser"
```

## Examples

### Quick Health Check

```bash
/test-comfystudio smoke
```

This will:
1. Open ComfyStudio at http://localhost:3000
2. Take screenshot
3. Capture page structure
4. Check for JavaScript errors
5. Report results

### Interactive Canvas Testing

```bash
/test-comfystudio canvas

# Then interact using refs from snapshot:
agent-browser click @e5              # Click brush tool
agent-browser hover @e10             # Hover over canvas
agent-browser drag @e10 @e11         # Drag on canvas
agent-browser screenshot --full      # Capture result
```

### Tool System Testing

```bash
/test-comfystudio tools

# Then test tool interactions:
agent-browser click @e3              # Switch to eraser tool
agent-browser snapshot -i            # Get updated refs
agent-browser fill @e8 "50"          # Change brush size
agent-browser screenshot             # Verify settings panel
```

## Tips

### Starting Dev Server First

Before testing, ensure the dev server is running:

```bash
# Terminal 1: Start dev server
yarn dev

# Terminal 2: Run tests
/test-comfystudio smoke
```

### Saving Test Results

All test artifacts are saved to `/tmp/`:
- Screenshots: `/tmp/comfystudio-*.png`
- Snapshots: `/tmp/comfystudio-*.txt`
- Console logs: `/tmp/comfystudio-console.txt`
- Errors: `/tmp/comfystudio-errors.txt`

### Recording Workflows

Record a video of your testing session:

```bash
/test-comfystudio canvas
agent-browser record start /tmp/canvas-test.webm
# Perform interactions...
agent-browser record stop
```

### Testing with ComfyUI Backend

If testing full integration with ComfyUI:

```bash
# Terminal 1: Start ComfyUI
comfy launch -- --enable-cors-header

# Terminal 2: Start ComfyStudio
yarn start

# Terminal 3: Run tests
/test-comfystudio generation
```

## Troubleshooting

### Port 3000 Not Available

If dev server is on a different port:

```bash
# Edit the DEV_SERVER variable in skill
agent-browser open "http://localhost:5173"  # Vite's default alternate port
```

### Network Idle Timeout

For slow-loading pages:

```bash
agent-browser open "$DEV_SERVER"
agent-browser wait --load networkidle
agent-browser snapshot -i
```

### Canvas Not Rendering

Check console for WebGL/Konva errors:

```bash
agent-browser console
agent-browser errors
```
