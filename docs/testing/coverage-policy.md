# Coverage Policy (Phase 3)

This project currently uses a **non-blocking coverage policy** for high-risk runtime paths.

## Policy

1. Coverage reporting is required for backend and UI paths.
2. The initial target for high-risk runtime paths is **70%**.
3. The target is **warning-only** in this phase (no hard fail-under gate yet).
4. `poe coverage` runs a threshold check and prints a warning if backend line coverage is below 70%, but still exits successfully.

## Scope

- Backend: includes `harbor-tauri-app` command modules via workspace coverage.
- UI: Vitest coverage report in `packages/ui`.

## Commands

```bash
poe coverage
poe coverage-ui
```

## Notes

- `poe coverage` uses `cargo llvm-cov --workspace --ignore-filename-regex main\.rs --summary-only --fail-under-lines 70` and converts threshold failures into warnings (non-blocking).
- Hard-fail CI coverage gates are deferred to a later milestone phase.

