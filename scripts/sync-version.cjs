/**
 * Platform Version Synchronization Script
 *
 * Purpose:
 * Synchronizes version information from package.json
 * to native Android and iOS project files.
 *
 * Source of Truth:
 *   package.json
 *
 * Reads:
 *   version (e.g. 1.4.0)
 *   build   (e.g. 42)
 *
 * Updates:
 *
 * Android
 * --------
 * android/app/build.gradle
 *   versionName -> version
 *   versionCode -> build
 *
 * iOS
 * ----
 * ios/App/App.xcodeproj/project.pbxproj
 *   MARKETING_VERSION       -> version
 *   CURRENT_PROJECT_VERSION -> build
 *
 * Result:
 * - package.json
 * - Android project
 * - iOS project
 *
 * all share identical version information.
 *
 * This script does not modify application code,
 * databases, backups, or Capacitor configuration.
 * It only updates release metadata.
 */


const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');

const version = pkg.version;
const build = pkg.build;

console.log(`Syncing version ${version} (${build})`);

//
// ANDROID
//
const gradlePath = path.join(
  __dirname,
  '../android/app/build.gradle'
);

let gradle = fs.readFileSync(
  gradlePath,
  'utf8'
);

gradle = gradle.replace(
  /versionName\s+"[^"]+"/,
  `versionName "${version}"`
);

gradle = gradle.replace(
  /versionCode\s+\d+/,
  `versionCode ${build}`
);

fs.writeFileSync(
  gradlePath,
  gradle
);

console.log('✓ Android updated');

//
// iOS
//
const pbxprojPath = path.join(
  __dirname,
  '../ios/App/App.xcodeproj/project.pbxproj'
);

let pbxproj = fs.readFileSync(
  pbxprojPath,
  'utf8'
);

pbxproj = pbxproj.replace(
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${version};`
);

pbxproj = pbxproj.replace(
  /CURRENT_PROJECT_VERSION = [^;]+;/g,
  `CURRENT_PROJECT_VERSION = ${build};`
);

fs.writeFileSync(
  pbxprojPath,
  pbxproj
);

console.log('✓ iOS updated');

console.log('Version sync complete');