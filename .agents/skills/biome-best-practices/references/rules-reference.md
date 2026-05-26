# Biome Rules Quick Reference

## Most Useful Rules by Category

### Correctness (Catches Bugs)

| Rule | What It Catches |
| --- | --- |
| `noUnusedImports` | Dead imports cluttering the file |
| `noUnusedVariables` | Variables declared but never read |
| `useExhaustiveDependencies` | Missing React hook dependencies |
| `useHookAtTopLevel` | Hooks called conditionally or in loops |
| `noUndeclaredVariables` | References to undefined variables |
| `noInvalidUseBeforeDeclaration` | Using variables before declaration |
| `noUnreachable` | Code after return/throw/break |
| `noConstAssign` | Reassigning const variables |
| `useJsxKeyInIterable` | Missing key prop in JSX lists |
| `noChildrenProp` | Passing children as a prop instead of nesting |

### Suspicious (Likely Mistakes)

| Rule | What It Catches |
| --- | --- |
| `noExplicitAny` | Using `any` type (loses type safety) |
| `noDoubleEquals` | Using `==` instead of `===` |
| `noDebugger` | Leftover debugger statements |
| `noConsoleLog` | Console.log in production code |
| `noDuplicateCase` | Duplicate switch cases |
| `noFallthroughSwitchClause` | Switch cases without break |
| `noShadowRestrictedNames` | Shadowing built-in names |
| `noArrayIndexKey` | Using array index as React key |
| `noAssignInExpressions` | Assignment in conditions |
| `noConfusingVoidType` | Misuse of void type |

### Style (Consistency)

| Rule | What It Enforces |
| --- | --- |
| `useConst` | `const` over `let` when no reassignment |
| `noVar` | `let`/`const` over `var` |
| `useTemplate` | Template literals over string concatenation |
| `useConsistentArrayType` | Consistent array type syntax |
| `useImportType` | `import type` for type-only imports |
| `useExportType` | `export type` for type-only exports |
| `useNamingConvention` | Consistent naming (camelCase, PascalCase, etc.) |
| `noNonNullAssertion` | Avoid `!` non-null assertions |
| `useNumberNamespace` | `Number.parseInt` over global `parseInt` |
| `useSelfClosingElements` | Self-close empty JSX elements |

### Complexity (Simplification)

| Rule | What It Simplifies |
| --- | --- |
| `noForEach` | Prefer `for...of` over `.forEach()` |
| `useFlatMap` | `.filter().map()` → `.flatMap()` |
| `useOptionalChain` | `a && a.b` → `a?.b` |
| `noUselessSwitchCase` | Empty switch cases |
| `noUselessFragments` | Unnecessary React fragments |
| `noUselessTypeConstraint` | `T extends unknown` (redundant) |
| `noExcessiveCognitiveComplexity` | Functions that are too complex |
| `useLiteralKeys` | `obj["key"]` → `obj.key` |
| `useSimplifiedLogicExpression` | Simplifiable boolean expressions |

### Performance

| Rule | What It Catches |
| --- | --- |
| `noAccumulatingSpread` | Spread in loops (O(n²) copies) |
| `noDelete` | `delete obj.key` (deoptimizes objects) |
| `noBarrelFile` | Barrel files that hurt tree-shaking |
| `noReExportAll` | `export * from` (hurts tree-shaking) |

### Security

| Rule | What It Catches |
| --- | --- |
| `noDangerouslySetInnerHtml` | XSS via dangerouslySetInnerHTML |
| `noGlobalEval` | `eval()` usage |

### Accessibility (a11y)

| Rule | What It Enforces |
| --- | --- |
| `useAltText` | Alt text on images |
| `useButtonType` | Type attribute on buttons |
| `noBlankTarget` | `rel="noreferrer"` with `target="_blank"` |
| `useValidAnchor` | Valid href on anchor elements |
| `useKeyWithClickEvents` | Keyboard handlers with click handlers |
| `useSemanticElements` | Semantic HTML over ARIA roles |
| `noAriaUnsupportedElements` | ARIA on elements that don't support it |
| `useValidAriaRole` | Valid ARIA role values |

## Rule Severity Levels

```json
{
  "rules": {
    "correctness": {
      "noUnusedImports": "error",    // Fails CI
      "noUnusedVariables": "warn",   // Shows warning, passes CI (except biome ci)
      "someRule": "off"              // Disabled entirely
    }
  }
}
```

- **`error`** — Reported as error, fails `biome ci`
- **`warn`** — Reported as warning, passes `biome check` but fails `biome ci`
- **`off`** — Rule is disabled

## Suppression Comments

### Single Rule

```typescript
// biome-ignore lint/suspicious/noExplicitAny: required for third-party API
const data: any = externalLib.getData();
```

### Multiple Rules

```typescript
// biome-ignore lint/suspicious/noExplicitAny: legacy code
// biome-ignore lint/style/noNonNullAssertion: guaranteed by validation
const value = (input as any).field!;
```

### Format Suppression

```typescript
// biome-ignore format: manual alignment
const routes = [
  { path: "/",        component: Home    },
  { path: "/about",   component: About   },
  { path: "/contact", component: Contact },
];
```

### Explanation is Required

Biome requires an explanation after the colon in suppression comments. This encourages documenting why a rule is suppressed:

```typescript
// WRONG: No explanation
// biome-ignore lint/suspicious/noExplicitAny

// CORRECT: With explanation
// biome-ignore lint/suspicious/noExplicitAny: API returns untyped JSON
```

## Recommended Starter Configuration

For a TypeScript project with React:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      },
      "style": {
        "noNonNullAssertion": "off",
        "useImportType": "warn"
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
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", "build", "coverage"]
  }
}
```
