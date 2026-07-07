# Coverage Policy

Harbor enforces a **70% code coverage threshold** on all production code paths.

## Policy

1. Frontend coverage is **blocking** in CI — `vitest run --coverage` exits non-zero if below 70%.
2. Backend coverage is **non-blocking** (informational only) — Rust tests are validated by the `test` CI job; `cargo llvm-cov` is run on macOS for platform-specific coverage reporting.
3. The 70% threshold applies to **statements, branches, functions, and lines**.

## Commands

```bash
poe coverage            # Backend coverage (warning-only, 70% threshold)
poe coverage-ui         # Frontend coverage (blocking in CI, 70% threshold)
poe coverage-full       # Full workspace llvm-cov summary
```

## CI Jobs

| Job | Platform | Behavior |
|-----|----------|----------|
| `Coverage (≥70%)` | Ubuntu | Frontend coverage via Vitest — **blocks CI** if below 70% |
| `macOS Check` → coverage | macOS | Backend `cargo llvm-cov` — **informational only** |

## Threshold Configuration

Frontend thresholds are configured in `vite.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  },
},
```

## Scope

- **Frontend:** Components, pages, contexts, hooks in `packages/ui/src/`
- **Backend:** All crates in the workspace via `cargo llvm-cov --workspace`
