import type { ChestRarity } from './mission-chests';

export interface CollectionArtwork {
  id: string;
  rarity: ChestRarity;
  title: string;
  icon: string;
  imageAssetKey?: string;
}

export interface CollectionCraft {
  craftId: string;
  rarity: ChestRarity;
  craftIndex: number;
  artworkId: string;
  craftedAt: string;
}

export const COLLECTION_ARTWORKS: CollectionArtwork[] = [
  { id: 'common-sunrise', rarity: 'common', title: 'Bình minh', icon: 'sunrise' },
  { id: 'common-cloud', rarity: 'common', title: 'Mây trắng', icon: 'cloud' },
  { id: 'common-coffee', rarity: 'common', title: 'Tách cà phê', icon: 'coffee' },
  { id: 'uncommon-leaf', rarity: 'uncommon', title: 'Lá non', icon: 'feather' },
  { id: 'uncommon-wind', rarity: 'uncommon', title: 'Cơn gió', icon: 'wind' },
  { id: 'uncommon-garden', rarity: 'uncommon', title: 'Khu vườn', icon: 'sun' },
  { id: 'rare-compass', rarity: 'rare', title: 'La bàn', icon: 'compass' },
  { id: 'rare-anchor', rarity: 'rare', title: 'Mỏ neo', icon: 'anchor' },
  { id: 'rare-map', rarity: 'rare', title: 'Bản đồ', icon: 'map' },
  { id: 'epic-starlight', rarity: 'epic', title: 'Ánh sao', icon: 'star' },
  { id: 'epic-lightning', rarity: 'epic', title: 'Tia chớp', icon: 'zap' },
  { id: 'epic-key', rarity: 'epic', title: 'Chìa khóa', icon: 'key' },
  { id: 'epic-repose', rarity: 'epic', title: 'Nghỉ ngơi', icon: 'image', imageAssetKey: 'epic-repose' },
  { id: 'epic-study', rarity: 'epic', title: 'Học tập', icon: 'image', imageAssetKey: 'epic-study' },
  { id: 'legendary-world', rarity: 'legendary', title: 'Thế giới', icon: 'globe' },
  { id: 'legendary-trophy', rarity: 'legendary', title: 'Bảo vật', icon: 'award' },
  { id: 'legendary-orbit', rarity: 'legendary', title: 'Quỹ đạo vàng', icon: 'target' },
  { id: 'legendary-crossing', rarity: 'legendary', title: 'Vượt sông', icon: 'image', imageAssetKey: 'legendary-crossing' },
];

const artworkById = new Map(COLLECTION_ARTWORKS.map((artwork) => [artwork.id, artwork]));

export function artworkForCraft(rarity: ChestRarity, craftIndex: number): CollectionArtwork {
  if (!Number.isSafeInteger(craftIndex) || craftIndex < 1) throw new Error('Lượt ghép tranh không hợp lệ.');
  const options = COLLECTION_ARTWORKS.filter((artwork) => artwork.rarity === rarity);
  const index = stableHash(`${rarity}:${craftIndex}`) % options.length;
  return options[index];
}

export function isCollectionArtwork(rarity: ChestRarity, artworkId: string): boolean {
  return artworkById.get(artworkId)?.rarity === rarity;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
