#!/usr/bin/env node
// Same gate as `npm audit --audit-level=moderate`, except for advisories that
// were reviewed and have no fix to take. Each exception names the advisory,
// why it does not reach Deep Space, and a review date: past that date it
// fails again, so an exception never outlives the reason it was granted.
import { execFileSync } from 'node:child_process';

const BLOCKING = new Set(['moderate', 'high', 'critical']);

const ALLOWED = [
  {
    url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
    reason: 'node-forge RSA signature verification. No patched node-forge exists; it only arrives through postman-runtime, which uses it to convert keys for ASAP auth. The API client never builds ASAP auth and nothing verifies signatures with node-forge.',
    reviewBy: '2026-11-02',
  },
  {
    url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
    reason: 'braces stack exhaustion on deeply nested patterns. No patched braces exists; it only arrives through patch-package (devDependency, postinstall) via micromatch, which expands glob patterns from this repository, never user input, and is not packaged into the app.',
    reviewBy: '2026-11-02',
  },
  {
    url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp',
    reason: 'http-cache-semantics max-stale cross-user cache disclosure. No patched release exists; it only arrives through electron-builder (devDependency) when the build downloads Electron, with no shared cache between users, and is not packaged into the app.',
    reviewBy: '2026-11-02',
  },
];

let report;
try {
  report = JSON.parse(execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 }));
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  if (!error.stdout) throw error;
  report = JSON.parse(error.stdout);
}

const today = new Date().toISOString().slice(0, 10);
const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'object' && via?.url) advisories.set(via.url, via);
  }
}

const blocking = [];
for (const advisory of advisories.values()) {
  if (!BLOCKING.has(advisory.severity)) continue;
  const allowed = ALLOWED.find((entry) => entry.url === advisory.url);
  if (allowed && today <= allowed.reviewBy) {
    console.log(`allowed until ${allowed.reviewBy}: ${advisory.name} (${advisory.severity}) ${advisory.url}`);
    continue;
  }
  blocking.push({ advisory, expired: Boolean(allowed) });
}

if (blocking.length) {
  for (const { advisory, expired } of blocking) {
    console.error(`${expired ? 'exception expired, review again: ' : ''}${advisory.name} (${advisory.severity}) ${advisory.title} ${advisory.url}`);
  }
  process.exit(1);
}
console.log('npm audit: no blocking advisories.');
