# Packages (Deep Modules)

Each top-level directory under `src/` is a **deep module**: a lot of behaviour
behind a small interface. Enforced by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
via `.dependency-cruiser.cjs` (run with `pnpm run lint:boundaries`).

## Layout

```
src/<package>/
  index.ts              ← entry point (public). Import this from outside.
  client.ts             ← another entry point. Packages may expose SEVERAL.
  lib/                  ← implementation: hidden from outside.
  tests/                ← co-located tests + fixtures (private).
```

The public surface is the package's **root files**. Anything in a subfolder
is private. A package may expose several small entry points instead of funnelling
through one giant barrel.

## The four rules

1. **Entry-point boundary** — import a package only through its root files,
   never anything in its subfolders.
2. **Intra-package freedom** — a package's own files import each other freely.
3. **Tests through the entry points** — tests import any package's entry points
   and their own `tests/` fixtures, never internals (not even their own).
4. **No cycles**.

## Shared infrastructure

These `src/` directories are **not** packages — freely importable, not subject
to boundary rules: `assets/`, `test/`, `constants/`, `types/`, `data/`.

## Adding a package

Add a root file as the entry point. Implementation goes in a subfolder.
No barrel files that re-export a whole subtree — keep entry points small.
