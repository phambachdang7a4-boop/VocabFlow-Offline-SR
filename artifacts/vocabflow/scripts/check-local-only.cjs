const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const appDir = join(__dirname, "..");
const rootLayout = readFileSync(join(appDir, "app/_layout.tsx"), "utf8");
const settings = readFileSync(join(appDir, "app/settings.tsx"), "utf8");
const packageJson = JSON.parse(
  readFileSync(join(appDir, "package.json"), "utf8"),
);
const devScript = packageJson.scripts.dev;

assert.match(rootLayout, /activateGuestDatabase\(\)/);
assert.match(rootLayout, /<VocabularyProvider key="local">/);
assert.doesNotMatch(
  rootLayout,
  /ClerkProvider|useAuth|SyncProvider|setAuthTokenGetter/,
);
assert.doesNotMatch(
  settings,
  /useClerk|useUser|useSyncStatus|guest-sign-in|reset-cloud-data/,
);
assert.match(settings, /Không cần đăng nhập hoặc kết nối mạng để mở ứng dụng/);
assert.match(settings, /testID="account-export-data"/);
assert.match(settings, /testID="account-import-data"/);
assert.match(settings, /resetLocalOnly/);

for (const dependency of [
  "@clerk/expo",
  "@workspace/api-client-react",
  "expo-auth-session",
  "expo-network",
  "expo-secure-store",
]) {
  assert.equal(
    packageJson.dependencies?.[dependency] ??
      packageJson.devDependencies?.[dependency],
    undefined,
    `${dependency} is not required by the local-only mobile app.`,
  );
}
assert.doesNotMatch(devScript, /CLERK|EXPO_PUBLIC_CLERK/);
assert.equal(
  existsSync(join(appDir, "app/(auth)")),
  false,
  "The sign-in routes are removed.",
);

console.log(
  "Local-only startup checks passed: guest SQLite, no auth/cloud provider, local backup/restore, and no login routes.",
);
