---
name: biome-best-practices
description: "Comprehensive Biome toolchain guidance for linting, formatting, and code analysis. Use when configuring Biome, writing or fixing lint rules, formatting code, migrating from ESLint/Prettier, setting up CI pipelines, or troubleshooting Biome issues. Covers biome.json configuration, rule categories (correctness, suspicious, style, complexity, performance, security, a11y), formatter options, import sorting, monorepo setup, and IDE integration. Trigger terms: Biome, biome.json, biome lint, biome format, biome check, lint rule, formatter, code quality, static analysis."
metadata:
  tags: biome, linting, formatting, static-analysis, code-quality, typescript, javascript
---

## When to Use

Use this skill when you need to:
- Configure Biome for a new or existing project
- Set up linting and formatting rules
- Migrate from ESLint and/or Prettier to Biome
- Troubleshoot Biome errors or warnings
- Configure Biome for monorepo setups (Turborepo, Nx, etc.)
- Understand Biome rule categories and severity levels
- Set up CI/CD pipelines with Biome
- Configure import sorting and organization
- Handle framework-specific configurations (React, Next.js, Svelte, Vue)

## Quick Start

Minimal setup to get Biome running immediately:

```bash
# Install Biome
bun add -D @biomejs/biome

# Initialize configuration
bunx biome init

# Run all checks (lint + format + import sorting)
bunx biome check .

# Auto-fix issues
bunx biome check --write .

# Format only
bunx biome format --write .

# Lint only
bunx biome lint .
```

## Core Concepts

### The `biome check` Command

`biome check` is the primary command — it runs linting, formatting, and import sorting in a single pass. Prefer it over running `biome lint` and `biome format` separately.

```bash
# Check everything (read-only)
bunx biome check .

# Fix everything that can be auto-fixed
bunx biome check --write .

# Fix including unsafe fixes
bunx biome check --write --unsafe .
```

### Rule Categories

Biome organizes lint rules into these categories:

| Category | Purpose | Default |
| --- | --- | --- |
| `correctness` | Catches bugs and incorrect code | error |
| `suspicious` | Code that is likely wrong | warn |
| `style` | Enforces consistent code style | off (recommended on) |
| `complexity` | Simplifies overly complex code | off (recommended on) |
| `performance` | Identifies performance issues | off (recommended on) |
| `security` | Catches security vulnerabilities | error |
| `a11y` | Accessibility best practices | warn |
| `nursery` | New/experimental rules | off |

### Fix Safety

- **Safe fixes** (`--write`): Guaranteed to not change semantics
- **Unsafe fixes** (`--write --unsafe`): May change semantics but are usually correct

## Configuration

### Recommended `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noNonNullAssertion": "off",
        "useConsistentArrayType": {
          "level": "warn",
          "options": { "syntax": "shorthand" }
        }
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      ".next",
      "build",
      "coverage",
      "*.min.js"
    ]
  }
}
```

### Monorepo Configuration (Turborepo)

For monorepos, place a root `biome.json` and use `extends` in workspace packages:

**Root `biome.json`:**
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", "build"]
  }
}
```

**Workspace `apps/web/biome.json`:**
```json
{
  "extends": ["../../biome.json"],
  "linter": {
    "rules": {
      "correctness": {
        "useExhaustiveDependencies": "warn"
      }
    }
  }
}
```

**Root `turbo.json` task:**
```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"]
    },
    "format": {
      "dependsOn": ["^format"]
    },
    "check": {
      "dependsOn": ["^check"]
    }
  }
}
```

**Workspace `package.json` scripts:**
```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

### Framework-Specific Settings

**React / Next.js:**
```json
{
  "javascript": {
    "jsxRuntime": "reactClassic"
  },
  "linter": {
    "rules": {
      "correctness": {
        "useExhaustiveDependencies": "warn",
        "useJsxKeyInIterable": "error"
      },
      "a11y": {
        "useAltText": "error",
        "useButtonType": "warn"
      }
    }
  }
}
```

**Node.js / Backend:**
```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      },
      "suspicious": {
        "noConsoleLog": "warn"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error"
      }
    }
  }
}
```

## Common Workflows

### Migration from ESLint + Prettier

```bash
# Auto-migrate ESLint config to Biome
bunx biome migrate eslint

# Auto-migrate Prettier config to Biome
bunx biome migrate prettier

# Remove old dependencies after verifying
bun remove eslint prettier eslint-config-prettier eslint-plugin-*
```

After migration:
1. Review generated `biome.json` for accuracy
2. Run `bunx biome check .` to see current state
3. Fix issues incrementally or use `--write`
4. Update CI pipeline to use `biome check`
5. Remove `.eslintrc*`, `.prettierrc*`, `.eslintignore`, `.prettierignore`

### Setting Up Git Hooks

**With `lefthook`:**
```yaml
# lefthook.yml
pre-commit:
  commands:
    biome:
      glob: "*.{js,ts,jsx,tsx,json,css}"
      run: bunx biome check --write --no-errors-on-unmatched --files-ignore-unknown=true --staged
      stage_fixed: true
```

**With `husky` + `lint-staged`:**
```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json,css}": [
      "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"
    ]
  }
}
```

### CI Pipeline

```yaml
# GitHub Actions
name: Code Quality
on: [push, pull_request]
jobs:
  biome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx biome ci .
```

The `biome ci` command is designed for CI — it exits with a non-zero code on any issue and produces machine-readable output.

### Import Sorting

Biome sorts imports automatically. Configure grouping:

```json
{
  "organizeImports": {
    "enabled": true
  }
}
```

Default sort order:
1. Side-effect imports (`import './styles.css'`)
2. Node.js built-ins (`import fs from 'node:fs'`)
3. External packages (`import React from 'react'`)
4. Internal aliases (`import { Button } from '@/components'`)
5. Relative imports (`import { utils } from './utils'`)

## Best Practices

### Configuration

1. **Start with `recommended: true`** — enables all recommended rules, then disable specific ones you disagree with
2. **Use `warn` for new rules** — avoids blocking CI while teams adapt
3. **Promote warnings to errors** once the codebase is clean
4. **Use `extends`** in monorepos to share base config
5. **Pin the schema version** to avoid unexpected changes on updates

### Rule Selection

1. **Always enable `correctness`** — these catch real bugs
2. **Enable `suspicious`** — catches likely mistakes
3. **Enable `noUnusedImports`** — keeps imports clean without manual effort
4. **Enable `noUnusedVariables`** — catches dead code early
5. **Be cautious with `nursery`** — rules may change or be removed
6. **Disable rules per-file** when needed using comments:

```typescript
// biome-ignore lint/suspicious/noExplicitAny: complex third-party type
const handler: any = createHandler();
```

### Formatting

1. **Pick a style and commit** — consistency matters more than the specific choice
2. **Match existing project style** when adding Biome to an existing project
3. **Use `biome check --write`** rather than separate format + lint commands
4. **Configure `lineWidth`** based on team preference (80 or 100 are common)

### Performance

1. **Use `biome check`** instead of separate lint + format passes (single AST parse)
2. **Use `files.ignore`** to skip generated code, `node_modules`, build output
3. **Use `--changed` flag** in CI to only check modified files on PRs
4. **Biome is fast** — typically 10-100x faster than ESLint + Prettier combined

### Suppression Comments

```typescript
// Suppress a specific rule on the next line
// biome-ignore lint/correctness/noUnusedVariables: used in template
const _unused = computeValue();

// Suppress formatting for a block
// biome-ignore format: manual alignment for readability
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Multiple suppressions
// biome-ignore lint/suspicious/noExplicitAny: legacy code
// biome-ignore lint/style/noNonNullAssertion: guaranteed by runtime
const value = (data as any).field!;
```

## Constraints and Warnings

- **Biome does not support all ESLint rules** — check the [rules reference](https://biomejs.dev/linter/rules/) for coverage
- **CSS linting is supported** but with fewer rules than stylelint
- **JSON formatting is supported** — useful for `package.json`, `tsconfig.json`
- **GraphQL support** is available for formatting and linting
- **Vue/Svelte SFC support** — Biome can lint and format `<script>` blocks in `.vue` and `.svelte` files
- **No plugin system** — Biome is batteries-included; you cannot add custom rules (unlike ESLint)
- **`biome.json` is the only config format** — no `.js` or `.ts` config files
- **Biome uses its own AST** — rule behavior may differ slightly from ESLint equivalents

## Troubleshooting

### Common Issues

| Issue | Solution |
| --- | --- |
| Rule conflicts with Prettier | Remove Prettier; Biome replaces it |
| `extends` not resolving | Use relative path from the file location |
| Files not being checked | Check `files.ignore` and `files.include` patterns |
| CI failing on format | Run `biome format --write` locally before pushing |
| Unknown rule error | Check Biome version; rule may be newer than installed version |
| Slow performance | Ensure `node_modules` is in `files.ignore` |

### Useful Commands

```bash
# Check what Biome sees for a file
bunx biome explain <rule-name>

# See resolved config for debugging
bunx biome rage

# Check specific files
bunx biome check src/index.ts src/utils.ts

# Only check changed files (CI optimization)
bunx biome check --changed --since=main
```

## References

- **Official documentation:** https://biomejs.dev
- **Rules reference:** https://biomejs.dev/linter/rules/
- **Configuration reference:** https://biomejs.dev/reference/configuration/
- **CLI reference:** https://biomejs.dev/reference/cli/
- **Migration guides:** https://biomejs.dev/guides/migrate-eslint-prettier/
- **GitHub repository:** https://github.com/biomejs/biome
- **VSCode extension:** Search "Biome" in VS Code extensions
