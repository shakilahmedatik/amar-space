# Biome CLI Commands Reference

## Primary Commands

### `biome check`

The all-in-one command. Runs linting, formatting, and import sorting.

```bash
# Check everything (read-only, reports issues)
bunx biome check .

# Fix all auto-fixable issues (safe fixes only)
bunx biome check --write .

# Fix including unsafe fixes
bunx biome check --write --unsafe .

# Check specific files
bunx biome check src/index.ts src/utils.ts

# Check with specific config
bunx biome check --config-path ./config .
```

### `biome ci`

Designed for CI pipelines. Same as `check` but treats warnings as errors.

```bash
bunx biome ci .
```

Differences from `biome check`:
- Warnings are treated as errors (non-zero exit)
- No `--write` flag (read-only by design)
- Optimized output for CI logs

### `biome format`

Format files only (no linting).

```bash
# Check formatting (read-only)
bunx biome format .

# Apply formatting
bunx biome format --write .

# Format specific files
bunx biome format --write src/**/*.ts

# Format stdin
echo "const x=1" | bunx biome format --stdin-file-path=file.ts
```

### `biome lint`

Lint files only (no formatting).

```bash
# Lint everything
bunx biome lint .

# Lint with auto-fix
bunx biome lint --write .

# Lint with unsafe fixes
bunx biome lint --write --unsafe .

# Lint specific files
bunx biome lint src/
```

## Setup Commands

### `biome init`

Create a new `biome.json` configuration file:

```bash
bunx biome init
```

### `biome migrate`

Migrate from other tools:

```bash
# Migrate ESLint config
bunx biome migrate eslint

# Migrate Prettier config
bunx biome migrate prettier

# Migrate both
bunx biome migrate eslint
bunx biome migrate prettier
```

## Utility Commands

### `biome explain`

Get detailed information about a rule:

```bash
bunx biome explain noUnusedVariables
bunx biome explain useConst
```

### `biome rage`

Debug information about Biome's configuration and environment:

```bash
bunx biome rage
```

Outputs:
- Biome version
- Platform info
- Resolved configuration
- File discovery info

### `biome search`

Search for patterns in code using GritQL:

```bash
bunx biome search "console.log($msg)" .
```

## Useful Flags

### Common Flags (All Commands)

| Flag | Description |
| --- | --- |
| `--config-path <path>` | Path to config directory |
| `--colors <mode>` | Color output: `off`, `force` |
| `--log-level <level>` | `none`, `debug`, `info`, `warn`, `error` |
| `--diagnostic-level <level>` | Filter diagnostics: `info`, `warn`, `error` |

### Check/Lint/Format Flags

| Flag | Description |
| --- | --- |
| `--write` | Apply fixes/formatting |
| `--unsafe` | Include unsafe fixes (with `--write`) |
| `--changed` | Only check changed files (VCS) |
| `--since <ref>` | Check files changed since git ref |
| `--staged` | Only check staged files |
| `--no-errors-on-unmatched` | Don't error on unmatched files |
| `--files-ignore-unknown` | Skip files Biome doesn't recognize |
| `--max-diagnostics <n>` | Limit number of diagnostics shown |

### CI-Optimized Usage

```bash
# Only check files changed in this PR
bunx biome ci --changed --since=origin/main

# Check only staged files (pre-commit hook)
bunx biome check --write --staged --no-errors-on-unmatched --files-ignore-unknown=true
```

## Exit Codes

| Code | Meaning |
| --- | --- |
| 0 | Success, no issues |
| 1 | Issues found (lint errors, format diffs) |
| 2 | Biome configuration error |

## Integration with Package Managers

### Bun

```json
{
  "scripts": {
    "check": "biome check --write .",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "ci": "biome ci ."
  }
}
```

### npm/pnpm/yarn

```json
{
  "scripts": {
    "check": "npx biome check --write .",
    "lint": "npx biome lint .",
    "format": "npx biome format --write .",
    "ci": "npx biome ci ."
  }
}
```

## Performance Tips

1. **Use `biome check`** over separate `lint` + `format` (single AST parse)
2. **Use `--changed`** in CI to only check modified files
3. **Use `files.ignore`** in config to skip generated/vendored code
4. **Biome is parallel by default** — no need for `--parallel` flags
5. **Binary is self-contained** — no Node.js runtime overhead for the core tool
