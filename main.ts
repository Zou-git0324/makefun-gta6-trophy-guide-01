// GTA VI trophy guide — submission packager.
//
// What this script does, in plain terms: it takes the finished guide (the
// static site in app/ plus the screenshots/ captures of it running) and
// stages them into the hand-in folder, then asks the vendored make.fun
// helper to write the dossier.json summary the scorer reads. Nothing here
// builds or transforms the guide itself; app/ is plain HTML/CSS/JS served
// as-is, and the trophy data lives in app/data/trophies.json.
//
// Run it from this directory with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container the hand-in folder is /output; locally the
// MAKEFUN_OUTPUT_DIR variable stands in for it. To look at the guide in a
// browser instead, run `node serve.ts` and open http://localhost:8080.
//
// The vendored helper (vendor/makefun-frontend.ts) is the scorer's own
// code — leave it alone. The caps below are the scorer's gate limits, and
// they must stay exactly as given: text_max_bytes is the only one that
// shapes the dossier bytes, while the rest make this script refuse an
// entry the scorer would refuse (too many screenshots, one too large, or
// an app/ tree over the file-count / byte budgets).

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The scorer's gate limits for this bounty (see reference/gate.json).
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

// Where the guide and its screenshots live relative to this file, and
// where they land inside the hand-in folder.
const SOURCE_FOLDERS = ['app', 'screenshots'] as const;

/** Folder this file sits in, and the hand-in folder to fill. */
function locateFolders() {
  const sourceRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
  const handInRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  return { sourceRoot, handInRoot };
}

/** Fail fast with a readable message when a folder we need is absent. */
function requireFolder(path: string, label: string): void {
  let found = false;
  try {
    found = statSync(path).isDirectory();
  } catch {
    found = false;
  }
  if (!found) {
    throw new Error(`cannot hand in: ${label} is missing (looked for ${path})`);
  }
}

/**
 * Stage one folder from the source tree into the hand-in folder.
 * The screenshots folder is optional: if a run has no captures yet, an
 * empty folder is still created and the missing source is just noted.
 */
function stageFolder(
  sourceRoot: string,
  handInRoot: string,
  name: (typeof SOURCE_FOLDERS)[number],
  required: boolean,
): void {
  const from = join(sourceRoot, name);
  const to = join(handInRoot, name);
  mkdirSync(to, { recursive: true });
  if (!existsSync(from)) {
    if (required) {
      throw new Error(`cannot hand in: ${name}/ is missing (looked for ${from})`);
    }
    console.log(`note: no ${name}/ beside main.ts, leaving ${to} empty`);
    return;
  }
  cpSync(from, to, { recursive: true });
  console.log(`staged ${name}/ -> ${to}`);
}

/** Build the scorer's summary from the staged hand-in folder and save it. */
function publishSummary(handInRoot: string): void {
  const summary = buildDossier(handInRoot, {
    text_max_bytes: GATE_LIMITS.text_max_bytes,
    screenshots: {
      max: GATE_LIMITS.screenshots.max,
      max_bytes: GATE_LIMITS.screenshots.max_bytes,
    },
    app_max_files: GATE_LIMITS.app_max_files,
    app_max_bytes: GATE_LIMITS.app_max_bytes,
  });
  const target = join(handInRoot, 'dossier.json');
  writeFileSync(target, summary);
  console.log(`wrote ${target} (${summary.byteLength} bytes)`);
}

function main(): void {
  const { sourceRoot, handInRoot } = locateFolders();
  console.log(`handing in from ${sourceRoot} to ${handInRoot}`);
  mkdirSync(handInRoot, { recursive: true });
  requireFolder(join(sourceRoot, 'app'), 'the guide (app/)');
  stageFolder(sourceRoot, handInRoot, 'app', true);
  stageFolder(sourceRoot, handInRoot, 'screenshots', false);
  publishSummary(handInRoot);
  console.log('hand-in complete');
}

main();
