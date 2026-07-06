/**
 * Release Automation Script
 *
 * Purpose:
 * Maintains a single source of truth for application versioning.
 *
 * Usage:
 *   npm run release patch
 *   npm run release minor
 *   npm run release major
 *
 * What it does:
 * 1. Reads the current version and build number from package.json.
 * 2. Updates the semantic version according to the selected release type:
 *      patch -> 1.4.0 -> 1.4.1
 *      minor -> 1.4.0 -> 1.5.0
 *      major -> 1.4.0 -> 2.0.0
 * 3. Increments the build number.
 * 4. Writes the updated values back to package.json.
 * 5. Executes sync-version.cjs to propagate the new version
 *    and build number to Android and iOS projects.
 *
 * Notes:
 * - package.json is the single source of truth.
 * - Build numbers should always increase and never be reused.
 * - Versioning follows Semantic Versioning (SemVer):
 *     MAJOR.MINOR.PATCH
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(
  __dirname,
  '../package.json'
);

const pkg = JSON.parse(
  fs.readFileSync(packagePath, 'utf8')
);

const releaseType = process.argv[2];

if (
  !['patch', 'minor', 'major'].includes(releaseType)
) {
  console.error(
    'Usage: npm run release patch|minor|major'
  );
  process.exit(1);
}

let [major, minor, patch] =
  pkg.version.split('.').map(Number);

switch (releaseType) {
  case 'patch':
    patch++;
    break;

  case 'minor':
    minor++;
    patch = 0;
    break;

  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
}

pkg.version =
  `${major}.${minor}.${patch}`;

pkg.build =
  (pkg.build || 0) + 1;

fs.writeFileSync(
  packagePath,
  JSON.stringify(pkg, null, 2) + '\n'
);

console.log(
  `Version: ${pkg.version}`
);

console.log(
  `Build: ${pkg.build}`
);

const { execSync } = require('child_process');

execSync(
  'node scripts/sync-version.cjs',
  { stdio: 'inherit' }
);