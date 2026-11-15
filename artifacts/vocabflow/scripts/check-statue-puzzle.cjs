const assert = require("node:assert/strict");
const { join } = require("node:path");
const { loadTs } = require("./test-support.cjs");

const {
  STATUE_PUZZLE_TILE_COUNT,
  createStatuePuzzle,
  isStatuePuzzleSolved,
  swapStatuePuzzleTiles,
} = loadTs(join(__dirname, "../domain/statue-puzzle.ts"));

const scrambled = createStatuePuzzle(() => 0.5);
assert.equal(scrambled.length, STATUE_PUZZLE_TILE_COUNT);
assert.deepEqual([...scrambled].sort((a, b) => a - b), [
  0, 1, 2, 3, 4, 5, 6, 7, 8,
]);
assert.equal(isStatuePuzzleSolved(scrambled), false);

const oneSwapAway = [1, 0, 2, 3, 4, 5, 6, 7, 8];
const solved = swapStatuePuzzleTiles(oneSwapAway, 0, 1);
assert.deepEqual(solved, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
assert.equal(isStatuePuzzleSolved(solved), true);
assert.deepEqual(
  swapStatuePuzzleTiles(solved, 2, 2),
  solved,
  "Tapping the same tile twice leaves the board unchanged.",
);
assert.throws(
  () => swapStatuePuzzleTiles(solved, -1, 2),
  /không hợp lệ/,
);
assert.throws(
  () => createStatuePuzzle(() => 1),
  /không hợp lệ/,
);

console.log("PASS: statue puzzle shuffling, tile swapping, and solved state.");
