# ComfyStudio Automation Setup - Complete ✅

This document summarizes all Claude Code automations configured for ComfyStudio.

## What's Configured

### 1. ✅ MCP Servers

#### context7
- **Status**: Active and connected
- **Purpose**: Live documentation for React, Konva, Zustand, React Query, ComfyUI
- **Usage**: Automatic - I query it when you ask library-specific questions
- **Test**: Ask me "How do I optimize Konva rendering performance?"

#### playwright
- **Status**: Available but not primary
- **Purpose**: Automated browser testing (API-based)
- **Usage**: Available if needed for CI/CD later
- **Recommendation**: Use agent-browser instead for development

#### greptile
- **Status**: Active and connected
- **Purpose**: Codebase search and PR review
- **Usage**: Code exploration and review workflows

### 2. ✅ Skills

#### monorepo-test
- **Location**: `.claude/skills/monorepo-test/SKILL.md`
- **Purpose**: Run tests with correct workspace syntax
- **Usage**: `/monorepo-test [path] [flags]`
- **Examples**:
  ```bash
  /monorepo-test                          # All tests
  /monorepo-test src/execution            # Execution tests
  /monorepo-test Tools/integration.test.tsx  # Specific file
  /monorepo-test --watch                  # Watch mode
  ```

#### test-comfystudio
- **Location**: `.claude/skills/test-comfystudio/SKILL.md`
- **Purpose**: Browser testing with agent-browser
- **Usage**: `/test-comfystudio [workflow]`
- **Workflows**:
  - `smoke` - Quick health check
  - `canvas` - Canvas interactions
  - `tools` - Tool system
  - `dock` - Dock layout
  - `generation` - Generation workflow

### 3. ✅ Hooks

#### Auto-format on Edit/Write
- **Location**: `.claude/settings.local.json`
- **Trigger**: After I edit or write TypeScript files
- **Action**: Runs `yarn comfystudio-ui lint:fix` on the file
- **Scope**: `packages/comfystudio-ui/src/**/*.ts*` and `packages/*/src/**/*.ts*`
- **Status**: "Auto-formatting code..." shown during execution

### 4. ✅ Browser Automation

#### agent-browser
- **Status**: Fully configured with permissions
- **Purpose**: Interactive browser testing
- **Advantages over Playwright**:
  - CLI-based (easier to use)
  - Already permitted in settings
  - Better for exploratory testing
  - Perfect for development workflow

## Quick Reference

### Testing Code

```bash
# Run tests (handles monorepo correctly)
/monorepo-test src/execution

# Run specific test with flags
/monorepo-test Tools/State.test.ts --watch

# All tests with coverage
/monorepo-test --coverage
```

### Testing UI

```bash
# Start dev server first
yarn dev

# Quick smoke test
/test-comfystudio smoke

# Interactive canvas testing
/test-comfystudio canvas
agent-browser snapshot -i      # Get element refs
agent-browser click @e1        # Interact
agent-browser screenshot       # Capture

# Close browser
agent-browser close
```

### Querying Documentation

Just ask naturally:
```
"How do I handle drag events in react-konva?"
"What's the best Zustand pattern for computed values?"
"How to invalidate React Query cache on WebSocket events?"
```

I'll automatically use context7 to fetch current documentation.

### Manual Browser Commands

```bash
# Open ComfyStudio
agent-browser open http://localhost:3000

# Get page structure with element refs
agent-browser snapshot -i

# Interact with elements (use refs from snapshot)
agent-browser click @e1
agent-browser fill @e2 "text"
agent-browser screenshot

# Check console and errors
agent-browser console
agent-browser errors

# Close
agent-browser close
```

## Files Created

```
.claude/
├── settings.local.json          # Permissions + auto-format hooks
├── skills/
│   ├── monorepo-test/
│   │   └── SKILL.md            # Test runner skill
│   └── test-comfystudio/
│       └── SKILL.md            # Browser testing skill
└── docs/
    ├── browser-automation-guide.md      # agent-browser vs Playwright
    └── automation-setup-complete.md     # This file
```

## What's Next (Optional)

### Recommended: execution-reviewer Subagent

Create a specialized reviewer for your execution system:

```bash
# I can help you create this
.claude/agents/execution-reviewer.md
```

This would validate:
- State machine rules (7-state FSM)
- Pure function constraints
- History writes (atomic, fsync)
- Terminal state immutability

### Optional: Additional Hooks

#### PreToolUse: Block Sensitive Files
```json
{
  "PreToolUse": [{
    "matcher": "Edit",
    "hooks": [{
      "type": "command",
      "command": "if [[ \"$TOOL_FILE_PATH\" == *yarn.lock ]] || [[ \"$TOOL_FILE_PATH\" == *.env ]]; then echo 'Blocked: sensitive file'; exit 1; fi"
    }]
  }]
}
```

#### PostToolUse: Run Related Tests
```json
{
  "PostToolUse": [{
    "matcher": "Edit",
    "hooks": [{
      "type": "command",
      "command": "if [[ \"$TOOL_FILE_PATH\" =~ src/execution ]]; then yarn comfystudio-ui test src/execution/__tests__ --run; fi"
    }]
  }]
}
```

### Optional: Team Sharing

Share MCP servers with your team:

```bash
# Create .mcp.json in repo root
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
EOF

git add .mcp.json
git commit -m "feat: add context7 MCP for team"
```

## Using the Automations

### Development Workflow

1. **Start developing**:
   ```bash
   yarn dev
   ```

2. **I edit code**:
   - Auto-format hook runs automatically
   - Prettier + ESLint applied
   - No manual cleanup needed

3. **Test changes**:
   ```bash
   /monorepo-test src/Tools
   ```

4. **Visual check**:
   ```bash
   /test-comfystudio canvas
   agent-browser snapshot -i
   agent-browser screenshot
   ```

5. **Ask questions**:
   ```
   "How should I optimize this Konva layer?"
   ```
   I'll automatically fetch latest docs via context7

### Feature Development Workflow

1. **Plan feature**:
   ```
   "I want to add an undo button to the canvas toolbar"
   ```

2. **I explore codebase**:
   - Use Grep/Glob to find relevant files
   - Query context7 for React patterns
   - Check existing tool implementations

3. **I implement**:
   - Edit files (auto-format runs)
   - Run tests via `/monorepo-test`
   - Test UI via `/test-comfystudio`

4. **You verify**:
   ```bash
   agent-browser open http://localhost:3000
   agent-browser snapshot -i
   # Test the new undo button
   ```

## Troubleshooting

### Skill Not Found

If `/monorepo-test` or `/test-comfystudio` don't work:
1. Restart Claude Code to reload skills
2. Or use the underlying commands directly:
   - `yarn comfystudio-ui test <path>`
   - `agent-browser open http://localhost:3000`

### Hooks Not Running

Check if hooks are enabled:
```json
{
  "disableAllHooks": false  // Should be false or omitted
}
```

### Browser Won't Open

Verify agent-browser is working:
```bash
agent-browser --version
agent-browser --help
```

### Port Conflicts

If port 3000 is taken:
```bash
# Check what's using it
lsof -i :3000

# Start on different port
yarn dev --port 5173
agent-browser open http://localhost:5173
```

## Summary

You now have:

✅ **Live documentation** (context7) - Always current library docs
✅ **Smart testing** (monorepo-test) - No more module resolution errors
✅ **Browser automation** (agent-browser) - Interactive UI testing
✅ **Auto-formatting** (hooks) - Code style enforced automatically
✅ **UI testing workflows** (test-comfystudio) - Common testing patterns

All configured and ready to use!
