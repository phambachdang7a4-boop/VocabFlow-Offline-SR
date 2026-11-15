export const STATUE_PUZZLE_TILE_COUNT = 9;

export type StatuePuzzle = number[];

export function createStatuePuzzle(
  random: () => number = Math.random,
): StatuePuzzle {
  const tiles = Array.from({ length: STATUE_PUZZLE_TILE_COUNT }, (_, index) => index);
  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new Error("Giá trị xáo trộn puzzle không hợp lệ.");
    }
    const swapIndex = Math.floor(sample * (index + 1));
    [tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
  }
  if (isStatuePuzzleSolved(tiles)) {
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
}

export function swapStatuePuzzleTiles(
  tiles: StatuePuzzle,
  firstIndex: number,
  secondIndex: number,
): StatuePuzzle {
  if (
    tiles.length !== STATUE_PUZZLE_TILE_COUNT ||
    !Number.isSafeInteger(firstIndex) ||
    !Number.isSafeInteger(secondIndex) ||
    firstIndex < 0 ||
    secondIndex < 0 ||
    firstIndex >= tiles.length ||
    secondIndex >= tiles.length
  ) {
    throw new Error("Vị trí mảnh ghép không hợp lệ.");
  }
  if (firstIndex === secondIndex) return [...tiles];
  const next = [...tiles];
  [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
  return next;
}

export function isStatuePuzzleSolved(tiles: StatuePuzzle): boolean {
  return (
    tiles.length === STATUE_PUZZLE_TILE_COUNT &&
    tiles.every((tile, index) => tile === index)
  );
}
