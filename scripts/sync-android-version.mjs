#!/usr/bin/env node
// Sync APP_VERSION + APP_BUILD_NUMBER from src/lib/appVersion.ts logic
// into android/app/build.gradle (versionName + versionCode).
// Run AFTER `npm run build` and BEFORE `npx cap sync android`.

import fs from "node:fs";
import path from "node:path";

function computeVersion() {
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

const { versionName, versionCode } = computeVersion();
let gradle = fs.readFileSync(gradlePath, "utf8");

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

fs.writeFileSync(gradlePath, gradle);
console.log(`[sync-android-version] versionName=${versionName} versionCode=${versionCode}`);