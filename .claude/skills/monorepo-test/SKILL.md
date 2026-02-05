---
name: monorepo-test
description: Run tests in ComfyStudio monorepo with correct workspace syntax
disable-model-invocation: true
---

# Monorepo Test Runner

Run Vitest tests in the ComfyStudio monorepo using the correct workspace-prefixed command. This avoids module resolution issues that occur when running tests from the repo root without the workspace prefix.

## Usage

```bash
/monorepo-test [path-or-pattern] [flags]
```

### Examples

```bash
# Run all tests
/monorepo-test

# Run specific test file
/monorepo-test Tools/integration.test.tsx

# Run all execution tests
/monorepo-test src/execution

# Run tests in watch mode
/monorepo-test --watch

# Run with coverage
/monorepo-test --coverage

# Run specific test pattern with flags
/monorepo-test src/Tools --watch --coverage
```

## Why This Exists

ComfyStudio uses Yarn 3 workspaces with a specific testing pattern:

❌ **Wrong**: `yarn test src/execution` (fails with "cannot find module")
✅ **Right**: `yarn comfystudio-ui test src/execution`

This skill ensures tests always run with the correct workspace prefix, regardless of your current directory.

## Implementation

```bash
#!/bin/bash
# Parse arguments
ARGS=("$@")
TEST_PATH=""
FLAGS=()

# Separate path from flags
for arg in "${ARGS[@]}"; do
  if [[ "$arg" == --* ]] || [[ "$arg" == -* ]]; then
    FLAGS+=("$arg")
  elif [[ -z "$TEST_PATH" ]]; then
    TEST_PATH="$arg"
  else
    FLAGS+=("$arg")
  fi
done

# Default to running all tests if no path specified
if [[ -z "$TEST_PATH" ]]; then
  echo "Running all tests..."
  yarn comfystudio-ui test "${FLAGS[@]}"
else
  echo "Running tests for: $TEST_PATH"
  yarn comfystudio-ui test "$TEST_PATH" "${FLAGS[@]}"
fi
```
