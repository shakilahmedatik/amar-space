# Biome Configuration Patterns

## Schema Versions

Always pin the schema version in `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json"
}
```

This enables IDE autocompletion and validation for the config file.

## File Handling

### Include/Exclude Patterns

```json
{
  "files": {
    "include": ["src/**", "tests/**"],
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".next",
      ".turbo",
      "coverage",
      "*.min.js",
      "*.generated.ts",
      "**/*.d.ts"
    ],
    "ignoreUnknown": true,
    "maxSize": 1048576
  }
}
```

### Per-Path Overrides

Apply different rules to different file patterns:

```json
{
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          },
          "correctness": {
            "noUnusedVariables": "off"
          }
        }
      }
    },
    {
      "include": ["scripts/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "off"
          }
        }
      }
    },
    {
      "include": ["**/*.config.ts", "**/*.config.js"],
      "formatter": {
        "lineWidth": 120
      }
    }
  ]
}
```

## VCS Integration

```json
{
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  }
}
```

When `useIgnoreFile` is true, Biome respects `.gitignore` patterns.

## Formatter Configuration

### Full Formatter Options

```json
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80,
    "lineEnding": "lf",
    "attributePosition": "auto"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "asNeeded",
      "trailingCommas": "all",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteProperties": "asNeeded"
    }
  },
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  },
  "css": {
    "formatter": {
      "quoteStyle": "double"
    }
  }
}
```

### Matching Prettier Defaults

If migrating from Prettier and want minimal diff:

```json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  }
}
```

## Linter Configuration

### Enabling Rule Groups

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "recommended": true
      },
      "suspicious": {
        "recommended": true
      },
      "style": {
        "recommended": true
      },
      "complexity": {
        "recommended": true
      },
      "performance": {
        "recommended": true
      },
      "security": {
        "recommended": true
      },
      "a11y": {
        "recommended": true
      }
    }
  }
}
```

### Rule with Options

Some rules accept configuration options:

```json
{
  "linter": {
    "rules": {
      "style": {
        "useNamingConvention": {
          "level": "warn",
          "options": {
            "strictCase": false,
            "conventions": [
              {
                "selector": { "kind": "variable" },
                "formats": ["camelCase", "CONSTANT_CASE"]
              },
              {
                "selector": { "kind": "typeLike" },
                "formats": ["PascalCase"]
              }
            ]
          }
        },
        "useConsistentArrayType": {
          "level": "warn",
          "options": { "syntax": "shorthand" }
        }
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      }
    }
  }
}
```

## Organize Imports

```json
{
  "organizeImports": {
    "enabled": true
  }
}
```

Biome automatically groups and sorts imports. The default order is:
1. Side-effect imports
2. Node built-in modules (prefixed with `node:`)
3. External dependencies
4. Internal/aliased imports
5. Parent relative imports
6. Sibling relative imports

## Environment-Specific Configs

### Development vs Production

Use separate configs or overrides for different environments:

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noConsoleLog": "warn",
        "noDebugger": "error"
      }
    }
  }
}
```

In CI, use `biome ci` which treats warnings as errors:

```bash
# Development: warnings are just warnings
bunx biome check .

# CI: warnings become errors
bunx biome ci .
```

## Extending Configurations

### Monorepo Pattern

```
project-root/
├── biome.json              (base config)
├── apps/
│   ├── web/
│   │   └── biome.json      (extends ../../biome.json)
│   └── api/
│       └── biome.json      (extends ../../biome.json)
└── packages/
    └── shared/
        └── biome.json      (extends ../../biome.json)
```

Each workspace `biome.json`:
```json
{
  "extends": ["../../biome.json"]
}
```

### Shared Config Package

For larger organizations, publish a shared config:

```json
{
  "extends": ["@myorg/biome-config/biome.json"]
}
```
