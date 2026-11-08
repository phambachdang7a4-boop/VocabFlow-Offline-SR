const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const { filterNotebookWords } = loadTs(
  join(__dirname, "../domain/notebook-filter.ts"),
  {
    "@/utils/text": {
      fold: (value) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim(),
    },
  },
);

const words = [
  {
    id: 1,
    term: "grandma",
    meaning: "Bà",
    example: "",
    level: 1,
    frozen: true,
  },
  {
    id: 2,
    term: "grandfather",
    meaning: "Ông",
    example: "",
    level: 1,
    frozen: false,
  },
  {
    id: 3,
    term: "mother",
    meaning: "Mẹ",
    example: "",
    level: 2,
    frozen: false,
  },
];

assert.deepEqual(
  filterNotebookWords(words, "", null).map((word) => word.id),
  [1, 2, 3],
  "The unfiltered notebook still includes frozen words.",
);
assert.deepEqual(
  filterNotebookWords(words, "", 1).map((word) => word.id),
  [2],
  "Level filters exclude frozen words without changing their saved level.",
);
assert.deepEqual(
  filterNotebookWords(words, "ba", 1).map((word) => word.id),
  [],
  "A search combined with a level filter still excludes frozen matches.",
);
assert.deepEqual(
  filterNotebookWords(words, "ba", null).map((word) => word.id),
  [1],
  "Search without a level filter can still find a frozen word.",
);

const screen = readFileSync(join(__dirname, "../app/(tabs)/index.tsx"), "utf8");
assert.match(screen, /kicker=\{`\$\{words\.length\} từ trong sổ`\}/);
assert.match(screen, /NotebookStatistics totalWords=\{words\.length\}/);

console.log(
  "PASS: frozen words stay searchable and counted but are hidden from level-filtered results.",
);
