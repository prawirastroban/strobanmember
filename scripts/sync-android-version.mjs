#!/usr/bin/env node
// Sync APP_VERSION + APP_BUILD_NUMBER from src/lib/appVersion.ts logic
// into android/app/build.gradle (versionName + versionCode).
// Run AFTER `npm run build` and BEFORE `npx cap sync android`.

import fs from "node:fs";
import path from "node:path";

function readCentralVersion() {
  // Single source of truth: src/config/version.ts
  const versionFile = path.resolve("src/config/version.ts");
  if (!fs.existsSync(versionFile)) return null;
  const src = fs.readFileSync(versionFile, "utf8");
  const nameMatch = src.match(/APP_VERSION\s*=\s*"([^"]+)"/);
  const codeMatch = src.match(/APP_BUILD_NUMBER\s*=\s*(\d+)/);
  if (!nameMatch || !codeMatch) return null;
  return {
    versionName: nameMatch[1],
    versionCode: parseInt(codeMatch[1], 10),
  };
}

function computeFallbackVersion() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const versionName = `${d.getFullYear()}.${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
  const digits = versionName.replace(/\D/g, "").slice(0, 12);
  const versionCode = parseInt(digits, 10);
  return { versionName, versionCode };
}

const gradlePath = path.resolve("android/app/build.gradle");
if (!fs.existsSync(gradlePath)) {
  console.error(`[sync-android-version] ${gradlePath} not found.`);
  console.error("Run `npx cap add android` first to generate the Android project.");
  process.exit(1);
}

const { versionName, versionCode } = readCentralVersion() ?? computeFallbackVersion();
let gradle = fs.readFileSync(gradlePath, "utf8");

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

fs.writeFileSync(gradlePath, gradle);
console.log(`[sync-android-version] versionName=${versionName} versionCode=${versionCode}`);