// @ts-check
// Deep-module enforcement for dependency-cruiser (react-app).
//
// Each PACKAGE under src/ is a DEEP MODULE: behaviour behind a small
// interface. A package's PUBLIC SURFACE is its ENTRY POINTS — the files at
// the package root. Implementation lives in SUBFOLDERS and is private.
//
// Shared infrastructure (assets/, test/, constants/, types/, data/) is NOT a
// package — it is freely importable and not subject to boundary rules.
//
// The only thing you should ever need to edit here is the PACKAGES list.

/** Packages root, relative to this config file (react-app/). */
const PACKAGES_ROOT = "src";

/**
 * Packages under src/. Each entry is a directory whose ROOT FILES are entry
 * points and whose SUBFOLDERS are private internals. `features/` is NOT a
 * package — it is a namespace prefix; each `features/<name>/` is a package.
 * Anything not listed here is treated as shared infrastructure (assets/,
 * test/, constants/, types/, data/) and is free to import / be imported.
 */
const PACKAGES = [
  "api",
  "components",
  "features/auth",
  "features/blog",
  "features/books",
  "features/fishing",
  "features/home",
  "features/moments",
  "features/pages",
  "features/pic",
  "features/rss",
  "features/todo",
  "hooks",
  "lib",
  "router",
  "stores",
  "utils",
];

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
// Escape "/" in package paths (e.g. "features/auth") for use in regex
const PKG = PACKAGES.map((p) => p.replace(/\//g, "\\/")).join("|");

/**
 * A package's private internals: anything nested inside a package subfolder.
 * Root files are entry points and are NOT matched here.
 */
const PACKAGE_INTERNALS = `^${R}/(${PKG})\\/[^/]+/`;

const IN_PACKAGES = `^${R}/(${PKG})\\/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: "error",
      // importer is NOT inside any package (app code, shared infra, root)
      from: { pathNot: IN_PACKAGES },
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "Packages reach each other only through entry points — never through internals. Intra-package imports are free.",
      severity: "error",
      // importer is inside a package ($1), but not a test file
      from: { path: IN_PACKAGES, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`, // same package → intra-package freedom
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "Tests exercise packages through entry points: any package's root files and their own tests/ fixtures, never internals.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`, // own tests/ fixtures → allowed
      },
    },
    {
      name: "tests-folder-is-private",
      comment: "A package's tests/ folder is reachable only from tests.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` },
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // --- Layering (optional, off by default) ----------------------------------
    // Layering controls WHICH packages may depend on which. Fill in as the
    // architecture matures, e.g.:
    //
    // { name: "features-may-not-depend-on-api", severity: "error",
    //   from: { path: `^${R}/features/` },
    //   to:   { path: `^${R}/api/` } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
