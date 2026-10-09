#!/usr/bin/env node
// Fails when an npm dependency (prod or dev) has a license outside licenses.allow.json.
//
// Usage: node scripts/check-licenses.mjs [--verbose]
//   --verbose   also print every package that passed
//
// Reads `pnpm licenses list --json` for the whole workspace, plus the `--prod`
// variant to know which packages ship in production (dev-only exceptions).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateLicenses, formatTable } from './lib/evaluate-licenses.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

function pnpmLicenses(...extra) {
  const output = execFileSync('pnpm', ['licenses', 'list', '--json', ...extra], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(output);
}

const policy = JSON.parse(readFileSync(join(root, 'licenses.allow.json'), 'utf8'));
const report = pnpmLicenses();
const production = Object.values(pnpmLicenses('--prod'))
  .flat()
  .map((pkg) => pkg.name);

const result = evaluateLicenses(report, policy, { production });

const counts = {};
for (const row of result.results) counts[row.status] = (counts[row.status] ?? 0) + 1;
console.log(
  `Checked ${result.results.length} packages: ` +
    Object.entries(counts)
      .map(([status, n]) => `${n} ${status}`)
      .join(', '),
);

const excepted = result.results.filter((row) => row.status === 'exception');
if (excepted.length > 0) {
  console.log('\nAccepted by exception:\n');
  console.log(formatTable(excepted));
}

if (verbose) {
  console.log('\nAll packages:\n');
  console.log(formatTable(result.results));
}

for (const name of result.unusedExceptions) {
  console.warn(
    `\nWarning: exception for "${name}" matches no package; remove it from licenses.allow.json.`,
  );
}

if (!result.ok) {
  console.error(`\n${result.failures.length} package(s) need attention:\n`);
  console.error(formatTable(result.failures));
  console.error(
    '\nSwitch to another package, or add a per-package entry with a reason to "exceptions" in licenses.allow.json after review.',
  );
  process.exit(1);
}

console.log('\nLicense check passed.');
