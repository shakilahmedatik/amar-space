# Migrating to Biome from ESLint + Prettier

## Overview

Biome replaces both ESLint (linting) and Prettier (formatting) with a single, faster tool. This guide covers the migration process step by step.

## Step 1: Install Biome

```bash
bun add -D @biomejs/biome
```

## Step 2: Auto-Migrate Existing Config

Biome can read your existing ESLint and Prettier configs:

```bash
# Migrate ESLint rules to biome.json
bunx biome migrate eslint

# Migrate Prettier options to biome.json
bunx biome migrate prettier
```

This generates a `biome.json` with equivalent rules where possible.

## Step 3: Review Generated Config

Not all ESLint rules have Biome equivalents. After migration:

1. Check the terminal output for unsupported rules
2. Review `biome.json` for accuracy
3. Decide if missing rules are critical or can be dropped

### Common ESLint Rules and Biome Equivalents

| ESLint Rule | Biome Rule |
| --- | --- |
| `no-unused-vars` | `correctness/noUnusedVariables` |
| `no-console` | `suspicious/noConsoleLog` |
| `no-debugger` | `suspicious/noDebugger` |
| `eqeqeq` | `suspicious/noDoubleEquals` |
| `no-var` | `style/noVar` |
| `prefer-const` | `style/useConst` |
| `no-explicit-any` | `suspicious/noExplicitAny` |
| `react-hooks/exhaustive-deps` | `correctness/useExhaustiveDependencies` |
| `react-hooks/rules-of-hooks` | `correctness/useHookAtTopLevel` |
| `jsx-a11y/*` | `a11y/*` |
| `import/order` | `organizeImports` (built-in) |
| `@typescript-eslint/no-unused-vars` | `correctness/noUnusedVariables` |
| `@typescript-eslint/no-explicit-any` | `suspicious/noExplicitAny` |

### Rules Without Direct Equivalents

Some ESLint plugin rules don't have Biome equivalents yet:
- `eslint-plugin-import` (partial — import sorting is built-in)
- `eslint-plugin-testing-library`
- `eslint-plugin-jest` (partial coverage)
- Custom organization-specific rules

## Step 4: Update Scripts

Replace ESLint/Prettier scripts in `package.json`:

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "ci": "biome ci ."
  }
}
```

**Before:**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

**After:**
```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "ci": "biome ci ."
  }
}
```

## Step 5: Update CI Pipeline

**Before (ESLint + Prettier):**
```yaml
- run: npx eslint .
- run: npx prettier --check .
```

**After (Biome):**
```yaml
- run: bunx biome ci .
```

The `biome ci` command checks formatting, linting, and import sorting in one pass and exits non-zero on any issue.

## Step 6: Update IDE Settings

### VS Code

1. Install the "Biome" extension
2. Uninstall/disable ESLint and Prettier extensions (or scope them)
3. Update `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

## Step 7: Clean Up

Remove old config files and dependencies:

```bash
# Remove old dependencies
bun remove eslint prettier \
  eslint-config-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  eslint-plugin-import \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser

# Remove old config files
rm -f .eslintrc* .eslintignore .prettierrc* .prettierignore
```

## Step 8: Format the Codebase

Run Biome on the entire codebase to establish the new baseline:

```bash
# Format and fix everything
bunx biome check --write .

# Commit the formatting changes separately
git add -A
git commit -m "chore: migrate to biome, reformat codebase"
```

## Incremental Migration

If you can't migrate all at once:

1. **Start with formatting only** — disable linter, enable formatter
2. **Add linting gradually** — enable one rule category at a time
3. **Use `warn` level** — avoid blocking CI while cleaning up
4. **Use overrides** — apply stricter rules to new code paths

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "recommended": false
      }
    }
  }
}
```

## Handling Conflicts During Migration

### Suppressing Existing Violations

For large codebases with many existing violations:

```bash
# Suppress all existing violations with comments
bunx biome check --write --suppress .
```

This adds `// biome-ignore` comments to all existing violations, letting you enforce rules on new code immediately.

### Gradual Rule Adoption

```json
{
  "linter": {
    "rules": {
      "correctness": { "recommended": true },
      "suspicious": { "recommended": true },
      "style": { "recommended": false },
      "complexity": { "recommended": false }
    }
  }
}
```

Enable `style` and `complexity` once the team is comfortable.
