const assert = require("node:assert/strict");
const { readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

const rootLayout = readFileSync(join(__dirname, "../app/_layout.tsx"), "utf8");
const tabsLayout = readFileSync(join(__dirname, "../app/(tabs)/_layout.tsx"), "utf8");
const loadingComponent = readFileSync(
  join(__dirname, "../components/PanLoadingScreen.tsx"),
  "utf8",
);
const artwork = join(__dirname, "../assets/images/pan-loading.png");

assert.ok(statSync(artwork).size > 100_000, "Pan artwork is bundled locally for offline use.");
assert.match(loadingComponent, /require\(["']\.\.\/assets\/images\/pan-loading\.png["']\)/);
assert.match(loadingComponent, /Đang quét dọn/, "Pan loading displays the approved exact caption.");
assert.match(loadingComponent, /useSafeAreaInsets/, "Caption placement accounts for system safe areas.");
assert.match(rootLayout, /<PanLoadingScreen\s*\/>/, "Startup initialization renders the reusable Pan screen.");
assert.doesNotMatch(rootLayout, /ActivityIndicator|Đang kiểm tra tài khoản|Đang chuẩn bị sổ từ an toàn|Đang chuẩn bị dữ liệu trên thiết bị/,
  "The replaced startup loading states no longer use their separate spinner copy.");
assert.match(rootLayout, /if\s*\(!fontsLoaded\s*&&\s*!fontError\)\s*return null/,
  "Native font/splash readiness remains unchanged; no artificial delay is inserted.");

for (const tab of ["dictionary", "courses", "review", "index", "blank"]) {
  assert.ok(tabsLayout.includes(`"${tab}"`), `The existing ${tab} route remains a tab.`);
}
assert.match(tabsLayout, /previousTab\.current\s*=\s*activeTab/,
  "The active tab is tracked to detect actual tab changes.");
assert.match(tabsLayout, /if\s*\(!previous\s*\|\|\s*previous\s*===\s*activeTab\)\s*return/,
  "Initial mount and same-tab route pushes do not show the overlay.");
assert.match(tabsLayout, /duration:\s*90[\s\S]*duration:\s*310/,
  "The tab transition fades for a short total of 400 ms.");
assert.match(tabsLayout, /<Modal[\s\S]*transparent[\s\S]*visible=\{showPan\}/,
  "The transition uses a native overlay without wrapping the tab navigator.");
assert.doesNotMatch(tabsLayout, /<View style=\{styles\.tabRoot\}>/,
  "The tabs navigator remains at the layout root so tab contents keep their full size.");
assert.match(tabsLayout, /pointerEvents="none"/,
  "The tab transition does not block the screen underneath.");
assert.match(tabsLayout, /testID="pan-tab-transition-overlay"/);

console.log("PASS: offline Pan startup loading and brief, tab-change-only overlay checks.");
