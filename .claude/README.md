# ComfyStudio Claude Code Setup

This directory contains all Claude Code automations, skills, agents, and configuration for ComfyStudio development.

## Quick Start

```bash
# Run tests
/monorepo-test src/execution

# Test UI
yarn dev
/test-comfystudio smoke

# Review execution changes
/review-execution state

# Ask about libraries
"How do I optimize Konva layer performance?"
```

## Directory Structure

```
.claude/
├── README.md                    # This file
├── settings.local.json          # Permissions + hooks
├── agents/
│   └── execution-reviewer.md   # Specialized execution system reviewer
├── skills/
│   ├── monorepo-test/          # Smart test runner for workspaces
│   ├── test-comfystudio/       # Browser testing workflows
│   └── review-execution/       # Execution review launcher
└── docs/
    ├── automation-setup-complete.md   # Setup summary
    ├── browser-automation-guide.md    # agent-browser vs Playwright
    └── subagents-guide.md             # How to use subagents
```

## Configured Automations

### 🔌 MCP Servers

| Server | Status | Purpose |
|--------|--------|---------|
| **context7** | ✅ Active | Live documentation for React, Konva, Zustand, etc. |
| **playwright** | ✅ Available | Browser automation (not primary) |
| **greptile** | ✅ Active | Codebase search and PR review |
| **supabase** | ⚠️  Auth needed | Database operations (if needed) |

**Usage**: Automatic - I query context7 when you ask library questions.

### 🎯 Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| **monorepo-test** | `/monorepo-test [path]` | Run tests with correct workspace syntax |
| **test-comfystudio** | `/test-comfystudio [workflow]` | Browser testing with agent-browser |
| **review-execution** | `/review-execution [scope]` | Launch execution-reviewer agent |

**Examples**:
```bash
/monorepo-test src/Tools --watch
/test-comfystudio canvas
/review-execution state
```

### ⚡ Hooks

| Hook | Trigger | Action |
|------|---------|--------|
| **Auto-format** | After Edit/Write on TS files | Runs `yarn comfystudio-ui lint:fix` |

**Scope**: `packages/comfystudio-ui/src/**/*.ts*` and `packages/*/src/**/*.ts*`

**Status message**: "Auto-formatting code..."

### 🤖 Subagents

| Agent | Purpose | Use When |
|-------|---------|----------|
| **execution-reviewer** | Validate execution system changes | After editing `src/execution/` |

**Review checklist**:
- ✅ State machine integrity (unidirectional flow)
- ✅ History persistence (atomic writes, fsync)
- ✅ Observation boundary (UI observes, not mutates)
- ✅ Pure functions (no side effects)
- ✅ Revision tracking (monotonic)
- ✅ Cancellation safety (race conditions)
- ✅ Test coverage (306 tests)

### 🌐 Browser Automation

**Primary**: agent-browser (CLI-based)

**Common commands**:
```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i              # Get refs
agent-browser click @e1                # Interact
agent-browser screenshot               # Capture
agent-browser console                  # Logs
agent-browser close
```

**Alternative**: Playwright MCP (available but not primary)

## Common Workflows

### Development Workflow

```bash
# 1. Start dev server
yarn dev

# 2. Make changes (auto-format runs automatically)
vim packages/comfystudio-ui/src/Tools/State.ts

# 3. Test changes
/monorepo-test src/Tools

# 4. Visual check
/test-comfystudio tools
agent-browser snapshot -i
agent-browser screenshot

# 5. Ask questions
"How should I memoize this Zustand selector?"
```

### Execution System Workflow

```bash
# 1. Make changes to execution system
vim packages/comfystudio-ui/src/execution/state/fsm.ts

# 2. Review with specialized agent
/review-execution state

# 3. Fix any issues
# (agent provides specific recommendations)

# 4. Re-run tests
/monorepo-test src/execution/state

# 5. Commit when approved
git add src/execution/
git commit -m "fix(execution): correct state transitions"
```

### Browser Testing Workflow

```bash
# 1. Start dev server
yarn dev

# 2. Run smoke test
/test-comfystudio smoke

# 3. Interactive testing
/test-comfystudio canvas
agent-browser snapshot -i
# Output shows: button "Brush" [ref=e1], canvas [ref=e5]

agent-browser click @e1
agent-browser click @e5
agent-browser screenshot canvas-test.png

# 4. Check for errors
agent-browser console
agent-browser errors

# 5. Close
agent-browser close
```

### Library Documentation Workflow

Just ask naturally:

```
"How do I handle drag events in react-konva?"
"What's the best pattern for computed values in Zustand?"
"How to invalidate React Query cache from WebSocket events?"
```

I'll automatically query context7 for current documentation.

## File Locations

### Configuration Files

```
.claude/settings.local.json      # Your personal settings (gitignored)
CLAUDE.md                        # Project instructions (checked in)
.claude.local.md                 # Personal notes (gitignored)
```

### Skills

```
.claude/skills/monorepo-test/SKILL.md
.claude/skills/test-comfystudio/SKILL.md
.claude/skills/review-execution/SKILL.md
```

### Agents

```
.claude/agents/execution-reviewer.md
```

### Documentation

```
.claude/docs/automation-setup-complete.md
.claude/docs/browser-automation-guide.md
.claude/docs/subagents-guide.md
```

## Customization

### Adding More Hooks

Edit `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "statusMessage": "Running..."
          }
        ]
      }
    ]
  }
}
```

### Creating More Subagents

1. Create agent file: `.claude/agents/your-agent.md`
2. Define expertise and review checklist
3. Create wrapper skill: `.claude/skills/review-your-domain/SKILL.md`
4. Use with `/review-your-domain`

### Adding More Skills

1. Create directory: `.claude/skills/your-skill/`
2. Create file: `.claude/skills/your-skill/SKILL.md`
3. Add frontmatter:
   ```yaml
   ---
   name: your-skill
   description: What it does
   disable-model-invocation: true  # For user-only
   ---
   ```
4. Use with `/your-skill`

## Troubleshooting

### Skill Not Found

```bash
# Restart Claude Code to reload skills
# Or use the underlying command directly
```

### Hooks Not Running

Check if disabled:
```json
{
  "disableAllHooks": false  // Should be false or omitted
}
```

### MCP Server Not Connected

```bash
# Check status
claude mcp list

# Reconnect if needed
claude mcp restart context7
```

### Tests Failing

Use workspace-prefixed command:
```bash
# Wrong
yarn test src/execution

# Right
yarn comfystudio-ui test src/execution
# Or
/monorepo-test src/execution
```

### Browser Won't Open

Check agent-browser:
```bash
agent-browser --version
agent-browser --help
```

## Team Sharing

### Share MCP Servers

Create `.mcp.json` in repo root:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

Then commit:
```bash
git add .mcp.json
git commit -m "feat: add context7 MCP for team"
```

### Share Skills

Skills in `.claude/skills/` can be committed to the repo:

```bash
git add .claude/skills/
git commit -m "feat: add testing skills"
```

### Share Agents

Agents in `.claude/agents/` can be committed:

```bash
git add .claude/agents/
git commit -m "feat: add execution-reviewer agent"
```

## Next Steps

### Recommended

1. ✅ Try the automations you just set up
2. ⚠️  Create more domain-specific subagents (plugin-reviewer, tool-reviewer)
3. ⚠️  Add pre-commit hooks integration
4. ⚠️  Set up CI/CD with subagent reviews

### Optional

1. Create more testing workflows in test-comfystudio
2. Add TypeScript type-checking hook
3. Create PR template that suggests running reviews
4. Document team conventions in CLAUDE.md

## Resources

- **Project docs**: `CLAUDE.md` - Main project instructions
- **Automation summary**: `.claude/docs/automation-setup-complete.md`
- **Browser guide**: `.claude/docs/browser-automation-guide.md`
- **Subagents guide**: `.claude/docs/subagents-guide.md`
- **Execution README**: `packages/comfystudio-ui/src/execution/README.md`

## Getting Help

- **Claude Code docs**: Ask "How do I configure hooks?"
- **ComfyStudio questions**: Ask about architecture, patterns, etc.
- **Library questions**: Ask about React, Konva, Zustand (uses context7)
- **Testing help**: Use `/test-comfystudio` workflows

## Summary

You have:

✅ **4 MCP servers** (context7, playwright, greptile, supabase)
✅ **3 skills** (monorepo-test, test-comfystudio, review-execution)
✅ **1 subagent** (execution-reviewer)
✅ **1 hook** (auto-format on Edit/Write)
✅ **Browser automation** (agent-browser configured)

All configured and ready to use!
