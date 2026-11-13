const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const rootLayout = readFileSync(join(__dirname, "../app/_layout.tsx"), "utf8");
const tabsLayout = readFileSync(join(__dirname, "../app/(tabs)/_layout.tsx"), "utf8");

assert.doesNotMatch(
  rootLayout,
  /PanLoadingScreen|pan-loading-(light|dark)\.png/,
  "Startup waits no longer display Pan's loading artwork.",
);
assert.match(
  rootLayout,
  /testID="startup-loading-backdrop"/,
  "Brief initialization waits use a plain themed backdrop.",
);
assert.match(
  rootLayout,
  /if\s*\(!fontsLoaded\s*&&\s*!fontError\)\s*return null/,
  "Native font and system splash readiness remain unchanged.",
);

for (const tab of ["dictionary", "courses", "review", "index", "blank"]) {
  assert.ok(tabsLayout.includes(`"${tab}"`), `The existing ${tab} route remains a tab.`);
}
assert.doesNotMatch(
  tabsLayout,
  /PanLoadingScreen|pan-tab-transition|<Modal|Animated\./,
  "Changing tabs no longer flashes Pan's loading artwork or overlay.",
);
assert.doesNotMatch(
  tabsLayout,
  /<View style=\{styles\.tabRoot\}>/,
  "The tabs navigator remains at the layout root.",
);

console.log("PASS: Pan loading artwork removed; startup and tab navigation remain intact.");
