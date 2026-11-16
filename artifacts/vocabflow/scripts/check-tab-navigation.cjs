const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const appRoot = join(__dirname, "..");
const layoutPath = join(appRoot, "app", "(tabs)", "_layout.tsx");
const layout = readFileSync(layoutPath, "utf8");

const screenNames = [...layout.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)].map(
  ([, name]) => name,
);
assert.deepEqual(screenNames, ["dictionary", "courses", "review", "index", "blank"]);

const titles = [...layout.matchAll(/title:\s*"([^"]+)"/g)].map(([, title]) => title);
assert.deepEqual(titles, ["Thư Viện", "Khóa học", "Ôn tập", "Sổ từ", "Nhiệm Vụ"]);

assert.match(
  layout,
  /tabBarActiveTintColor:\s*colors\.buttonForeground/,
  "The selected label uses the dark text color intended for gold surfaces.",
);
assert.match(
  layout,
  /tabBarActiveBackgroundColor:\s*colors\.button/,
  "The selected tab background uses the existing gold button color.",
);
assert.match(
  layout,
  /height:\s*isWeb\s*\?\s*104\s*:\s*72\s*\+\s*insets\.bottom/,
  "The tab bar reserves room for its content and native bottom safe area.",
);
assert.match(
  layout,
  /marginBottom:\s*isWeb\s*\?\s*34\s*:\s*0/,
  "The web tab content leaves its 34px bottom safe area clear.",
);
assert.match(layout, /lineHeight:\s*14/);
assert.match(layout, /includeFontPadding:\s*false/);

for (const icon of ["library", "courses", "review", "notebook", "missions"]) {
  assert.ok(
    existsSync(join(appRoot, "assets", "navigation", `${icon}.png`)),
    `The ${icon} tab artwork still exists.`,
  );
}

console.log(
  "PASS: five destinations and icons stay in order; selected text, tab height, and safe-area spacing are readable.",
);
