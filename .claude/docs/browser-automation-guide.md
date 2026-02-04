# Browser Automation Guide: agent-browser vs Playwright

## Quick Comparison

| Feature | agent-browser | Playwright MCP |
|---------|--------------|----------------|
| **Setup** | ✅ Already configured | ✅ Available but unused |
| **Interface** | CLI commands (bash-style) | Tool API calls |
| **Best for** | Manual testing, debugging, screenshots | Automated tests, CI/CD, scripts |
| **Learning curve** | Low - familiar CLI syntax | Medium - API-based |
| **Use in Claude** | Direct bash or skill invocation | Function calls via MCP |
| **Session mgmt** | Built-in named sessions | Browser contexts |
| **State persistence** | Save/load state files | Programmatic storage |

## When to Use Each

### Use agent-browser when:
- ✅ Quick manual testing during development
- ✅ Debugging UI issues interactively
- ✅ Taking screenshots for documentation
- ✅ Exploring page structure with snapshots
- ✅ One-off testing scenarios

### Use Playwright MCP when:
- ✅ Writing automated test suites
- ✅ CI/CD integration
- ✅ Complex multi-step workflows
- ✅ Need programmatic control
- ✅ Generating test scripts

## ComfyStudio Testing Patterns

### Pattern 1: Quick Visual Regression Check

**agent-browser approach** (recommended for dev):
```bash
# Start dev server
yarn dev

# Quick visual check
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser screenshot --full /tmp/comfystudio-baseline.png

# Make code changes...

# Compare
agent-browser reload
agent-browser wait --load networkidle
agent-browser screenshot --full /tmp/comfystudio-after.png
```

### Pattern 2: Canvas Interaction Testing

**agent-browser approach**:
```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i

# Example output:
# button "Brush Tool" [ref=e1]
# canvas [ref=e5]
# slider "Brush Size" [ref=e8]

agent-browser click @e1              # Select brush tool
agent-browser fill @e8 "50"          # Set brush size
agent-browser click @e5              # Click canvas
agent-browser screenshot canvas-interaction.png
```

**Playwright MCP approach**:
```javascript
// Would require writing script
await page.goto('http://localhost:3000');
await page.click('[aria-label="Brush Tool"]');
await page.fill('[aria-label="Brush Size"]', '50');
await page.click('canvas');
```

### Pattern 3: Tool System Validation

**agent-browser approach** (faster for exploration):
```bash
/test-comfystudio tools

# Interactive exploration
agent-browser snapshot -i
agent-browser click @e3  # Switch tool
agent-browser snapshot -i  # See updated state
agent-browser get text @e7  # Check active tool name
```

### Pattern 4: Error Detection

**agent-browser approach**:
```bash
agent-browser open http://localhost:3000
agent-browser console > logs.txt
agent-browser errors > errors.txt

# Check for issues
grep -i "error\|warning" logs.txt
```

### Pattern 5: Generation Workflow Testing

**Full workflow test**:
```bash
# Start both servers
yarn start  # ComfyUI + ComfyStudio

# Test generation flow
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser snapshot -i

# Find prompt input (example ref)
agent-browser fill @e10 "a beautiful landscape"

# Find generate button
agent-browser click @e15

# Wait for generation
agent-browser wait --text "Complete" --timeout 30000

# Capture result
agent-browser screenshot generation-result.png
```

## Integration with Your Workflow

### During Development

Use agent-browser for rapid feedback:

```bash
# Terminal 1
yarn dev

# Terminal 2 - Keep browser session open
agent-browser open http://localhost:3000

# After making changes:
agent-browser reload
agent-browser snapshot -i
agent-browser screenshot
```

### Before Committing

Quick sanity check:

```bash
# Your new commit hook could include:
yarn build:types && \
yarn comfystudio-ui test && \
agent-browser open http://localhost:3000 && \
agent-browser wait --load networkidle && \
agent-browser console | grep -i error && \
agent-browser close
```

### Post-Deployment

Visual verification:

```bash
agent-browser open https://your-comfystudio-deployment.com
agent-browser screenshot --full production-$(date +%Y%m%d).png
agent-browser console > production-console.log
agent-browser errors > production-errors.log
```

## Real ComfyStudio Use Cases

### Use Case 1: Dock Layout Changes

Testing the floating tools panel (you just added):

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i
# Look for: button "Tools" [ref=e1]

agent-browser click @e1  # Open floating panel
agent-browser wait 500
agent-browser screenshot dock-open.png

agent-browser click @e1  # Close panel
agent-browser wait 500
agent-browser screenshot dock-closed.png
```

### Use Case 2: Tool State Persistence

Verify tool settings persist:

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i

# Set brush size
agent-browser fill @e5 "75"

# Switch tool
agent-browser click @e2  # Eraser

# Switch back to brush
agent-browser click @e1

# Verify size persisted
agent-browser get value @e5  # Should return "75"
```

### Use Case 3: Execution System Integration

Once you integrate the execution system:

```bash
agent-browser open http://localhost:3000
agent-browser record start /tmp/execution-test.webm

# Trigger execution
agent-browser click @e10  # Select tool
agent-browser click @e15  # Execute

# Monitor progress
agent-browser wait --text "Executing"
agent-browser wait --text "Completed"

agent-browser record stop
agent-browser screenshot execution-complete.png
```

## Tips & Best Practices

### 1. Use Named Sessions for Parallel Testing

```bash
# Test different viewports simultaneously
agent-browser --session desktop set viewport 1920 1080
agent-browser --session desktop open http://localhost:3000

agent-browser --session mobile set device "iPhone 14"
agent-browser --session mobile open http://localhost:3000

# Compare
agent-browser --session desktop screenshot desktop.png
agent-browser --session mobile screenshot mobile.png
```

### 2. Save Authenticated State

Once you add auth:

```bash
# Login once
agent-browser open http://localhost:3000/login
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
agent-browser state save auth.json

# Reuse later
agent-browser state load auth.json
agent-browser open http://localhost:3000/dashboard
```

### 3. Interactive Debugging

Keep browser open for exploration:

```bash
agent-browser --headed open http://localhost:3000

# See what you're doing
agent-browser click @e1
agent-browser highlight @e5  # Highlight element
agent-browser get box @e5    # See dimensions
```

### 4. JSON Output for Scripting

Parse results programmatically:

```bash
# Get interactive elements as JSON
agent-browser snapshot -i --json | jq '.elements[] | select(.role=="button")'

# Check element state
agent-browser is visible @e1 --json | jq '.visible'
```

## Migration Path (if needed)

If you later want automated Playwright tests:

1. **Explore with agent-browser** (now)
   - Understand page structure
   - Identify reliable selectors
   - Document workflows

2. **Capture workflows** (when ready)
   - Record interactions
   - Note successful patterns
   - Document edge cases

3. **Convert to Playwright** (optional future)
   - Use learnings from agent-browser
   - Write automated tests
   - Integrate with CI/CD

For now, stick with agent-browser for manual testing!

## Summary

**For ComfyStudio development**, agent-browser is the better choice because:

1. ✅ Already configured and permitted
2. ✅ Faster for exploratory testing
3. ✅ Better for debugging UI issues
4. ✅ Simpler CLI interface
5. ✅ Perfect for development workflow
6. ✅ Easy to integrate with skills

**Use Playwright MCP later** when you need:
- Automated regression tests
- CI/CD integration
- Test suite generation
- Complex scripting needs
