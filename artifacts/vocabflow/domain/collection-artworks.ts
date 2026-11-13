import type { ChestRarity } from "./mission-chests";

export interface CollectionArtwork {
  id: string;
  rarity: ChestRarity;
  title: string;
  shortTitle?: string;
  icon: string;
  imageAssetKey?: string;
  illustration?: "corvi-chest";
  material?: string;
  description?: string;
  biography?: string;
  biographyEn?: string;
  quote?: string;
  sourceLabel?: string;
  unlockMode?: "automatic";
}

export interface CollectionCraft {
  craftId: string;
  rarity: ChestRarity;
  craftIndex: number;
  artworkId: string;
  craftedAt: string;
  /** Older backups and clients omit this and retain their original 20-piece cost. */
  pieceCost?: 20 | 100;
}

export const FIRST_STATUE_ID = "legendary-ho-chi-minh-marble";

export const COLLECTION_ARTWORKS: CollectionArtwork[] = [
  {
    id: FIRST_STATUE_ID,
    rarity: "legendary",
    title: "Tượng Chủ tịch Hồ Chí Minh",
    shortTitle: "Bác Hồ",
    icon: "award",
    imageAssetKey: "ho-chi-minh-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Nguyễn Ái Quốc, vị lãnh tụ của dân tộc Việt Nam và Chủ tịch nước Việt Nam Dân chủ Cộng hòa từ năm 1945 đến năm 1969.",
    quote: "Không có gì quý hơn độc lập, tự do.",
    biography: `Chủ tịch Hồ Chí Minh (19.05.1890 – 02.09.1969) là vị lãnh tụ vĩ đại của dân tộc Việt Nam, nhà hoạt động lỗi lạc của phong trào cộng sản quốc tế.

THÂN THẾ
• Tên khai sinh: Nguyễn Sinh Cung
• Tên khi đi học: Nguyễn Tất Thành
• Tên hoạt động cách mạng: Nguyễn Ái Quốc, cùng nhiều bí danh và bút danh khác
• Ngày sinh: 19 tháng 5 năm 1890
• Quê quán: Làng Sen (Kim Liên), huyện Nam Đàn, tỉnh Nghệ An
• Thân sinh: Cụ Phó bảng Nguyễn Sinh Sắc
• Thân mẫu: Bà Hoàng Thị Loan
• Ngày mất: 2 tháng 9 năm 1969 tại Hà Nội, thọ 79 tuổi

QUÁ TRÌNH HOẠT ĐỘNG VÀ SỰ NGHIỆP
• 1911: Ngày 5 tháng 6, rời cảng Nhà Rồng (Sài Gòn) ra nước ngoài tìm đường cứu nước.
• 1919: Tham gia Đảng Xã hội Pháp.
• 1920: Tham dự Đại hội Tours và tham gia thành lập Đảng Cộng sản Pháp.
• 1930: Chủ trì hội nghị thành lập Đảng Cộng sản Việt Nam ngày 3 tháng 2.
• 1941: Trở về nước sau hơn 30 năm hoạt động ở nước ngoài; trực tiếp lãnh đạo phong trào cách mạng trong nước và thành lập Mặt trận Việt Minh.
• 1945: Lãnh đạo Cách mạng Tháng Tám thành công. Ngày 2 tháng 9, tại Quảng trường Ba Đình (Hà Nội), đọc Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.
• 1945–1969: Giữ cương vị Chủ tịch nước Việt Nam Dân chủ Cộng hòa, lãnh đạo nhân dân trong kháng chiến chống Pháp (1946–1954) và kháng chiến chống Mỹ cứu nước.`,
    biographyEn: `“Nothing is more precious than independence and freedom.”
— President Ho Chi Minh

President Ho Chi Minh (May 19, 1890 – September 2, 1969) was the great leader of the Vietnamese people and an outstanding activist in the international communist movement.

PERSONAL BACKGROUND
• Birth name: Nguyen Sinh Cung
• Name used during his schooling: Nguyen Tat Thanh
• Revolutionary name: Nguyen Ai Quoc, along with many other aliases and pen names
• Date of birth: May 19, 1890
• Hometown: Sen Village (Kim Lien), Nam Dan District, Nghe An Province
• Father: Nguyen Sinh Sac, a scholar who earned the Phó bảng (junior doctorate) degree
• Mother: Hoang Thi Loan
• Date of death: September 2, 1969, in Hanoi, at the age of 79

LIFE AND REVOLUTIONARY CAREER
• 1911: On June 5, he left Nha Rong Wharf in Saigon to travel abroad in search of a path to national liberation.
• 1919: Joined the French Socialist Party.
• 1920: Attended the Tours Congress and took part in founding the French Communist Party.
• 1930: Chaired the conference that established the Communist Party of Vietnam on February 3.
• 1941: Returned to Vietnam after more than 30 years abroad, directly led the revolutionary movement at home, and founded the Viet Minh Front.
• 1945: Led the August Revolution to victory. On September 2, at Ba Dinh Square in Hanoi, he read the Declaration of Independence, proclaiming the birth of the Democratic Republic of Vietnam.
• 1945–1969: Served as President of the Democratic Republic of Vietnam and led the people through the resistance against France (1946–1954) and the resistance against the United States.`,
    sourceLabel: "Cổng thông tin điện tử Hồ Chí Minh",
  },
];

const LEGACY_PAINTING_IDS = new Set([
  "common-sunrise",
  "common-cloud",
  "common-coffee",
  "uncommon-leaf",
  "uncommon-wind",
  "uncommon-garden",
  "rare-compass",
  "rare-anchor",
  "rare-map",
  "epic-starlight",
  "epic-lightning",
  "epic-key",
  "epic-repose",
  "epic-study",
  "legendary-world",
  "legendary-trophy",
  "legendary-orbit",
  "legendary-crossing",
  "legendary-corvi",
]);

export function isLegacyCollectionPaintingId(id: string): boolean {
  return LEGACY_PAINTING_IDS.has(id);
}

const artworkById = new Map(
  COLLECTION_ARTWORKS.map((artwork) => [artwork.id, artwork]),
);

export function artworkForCraft(
  rarity: ChestRarity,
  craftIndex: number,
): CollectionArtwork {
  if (!Number.isSafeInteger(craftIndex) || craftIndex < 1)
    throw new Error("Lượt ghép tượng không hợp lệ.");
  const options = COLLECTION_ARTWORKS.filter(
    (artwork) =>
      artwork.rarity === rarity && artwork.unlockMode !== "automatic",
  );
  if (options.length === 0) {
    throw new Error("Chưa có tượng ở phẩm chất này để ghép.");
  }
  const index = stableHash(`${rarity}:${craftIndex}`) % options.length;
  return options[index];
}

export function isValidCollectionCraftArtwork(
  rarity: ChestRarity,
  craftIndex: number,
  artworkId: string,
): boolean {
  const artwork = artworkById.get(artworkId);
  if (!artwork || artwork.rarity !== rarity) return false;
  if (artwork.unlockMode === "automatic") return true;
  try {
    return artworkForCraft(rarity, craftIndex).id === artworkId;
  } catch {
    return false;
  }
}

export function isCollectionArtwork(
  rarity: ChestRarity,
  artworkId: string,
): boolean {
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
