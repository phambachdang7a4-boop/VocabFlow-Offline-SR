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
  {
    id: "legendary-alexander-marble",
    rarity: "legendary",
    title: "Tượng Alexander Đại đế",
    shortTitle: "Alexander",
    icon: "award",
    imageAssetKey: "alexander-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Vua Macedonia, nhà chinh phạt và chiến lược gia quân sự thời cổ đại.",
    biography: `Alexander Đại đế (Alexandros III của Macedonia, 356 TCN – 323 TCN) là một trong những vị quân vương và nhà chiến lược quân sự vĩ đại, thành công nhất lịch sử nhân loại. Ông chưa từng thất bại trong bất kỳ trận đánh nào suốt cuộc đời chinh phạt của mình.

1. THÂN THẾ VÀ GIÁO DỤC
• Xuất thân: Sinh tại Pella, Macedonia, ông là con trai của Vua Philip II (người thống nhất Hy Lạp cổ đại) và Hoàng hậu Olympias.
• Học vấn: Từ năm 342 TCN đến năm 340 TCN, ông được triết gia vĩ đại Aristotle trực tiếp giảng dạy, khơi dậy niềm đam mê về khoa học, văn học và triết học Hy Lạp.
• Lên ngôi: Ông trở thành vị vua thứ 14 của vương triều Argead (Macedonia) vào năm 336 TCN ở tuổi 20, sau khi vua cha bị ám sát.

2. CÁC CUỘC CHINH PHẠT LỚN
Chỉ trong vòng 12 năm trị vì, quân đội của Alexander đã kiến tạo nên một trong những đế chế rộng lớn nhất thế giới cổ đại, trải dài khoảng 5 triệu km² từ Hy Lạp qua Ai Cập đến tận Tây Bắc Ấn Độ:
• Chinh phục Đế chế Ba Tư (Achaemenid): Ông đánh bại quân đội Ba Tư trong những trận chiến kinh điển như Granicus (334 TCN), Issus (333 TCN) và đỉnh cao là trận Gaugamela (331 TCN) trước Vua Darius III.
• Ai Cập và Cận Đông: Ông được người Ai Cập chào đón như người giải phóng họ khỏi ách thống trị của Ba Tư. Tại đây, ông đã thành lập thành phố Alexandria trứ danh đầu tiên.
• Mở rộng sang Ấn Độ: Ông tiến quân tới vùng Punjab và giành chiến thắng tại trận sông Hydaspes (326 TCN) trước Vua Porus. Tuy nhiên, do binh sĩ quá kiệt sức sau nhiều năm hành quân liên miên, ông buộc phải đồng ý rút quân trở về.

3. DI SẢN VÀ CHÍNH SÁCH
• Hellen hóa (Hy Lạp hóa): Alexander thúc đẩy sự giao thoa văn hóa giữa Hy Lạp và các vùng đất bị chinh phục. Ông đã lập nên khoảng 70 thành phố mang tên Alexandria để truyền bá ngôn ngữ, nghệ thuật và mô hình xã hội Hy Lạp.
• Chiến thuật quân sự: Ông hoàn thiện nghệ thuật tác chiến bằng cách kết hợp kỵ binh hạng nặng với đội hình bộ binh giáo dài (phalanx Macedonia), tạo nên một cỗ máy chiến tranh bất bại thời bấy giờ.

4. CÁI CHẾT VÀ NHỮNG BÍ ẨN
• Qua đời: Alexander Đại đế mất vào ngày 10, 11 hoặc 13 tháng 6 năm 323 TCN tại Babylon khi mới 32 tuổi. Nguyên nhân cái chết của ông vẫn gây tranh cãi với nhiều giả thuyết như sốt rét, thương hàn, viêm não hoặc bị đầu độc.
• Hậu quả: Vì không kịp chỉ định người kế vị rõ ràng, đế chế của ông nhanh chóng tan rã và bị chia cắt bởi các tướng lĩnh qua nhiều thập kỷ tranh giành quyền lực. Cho đến nay, vị trí lăng mộ của ông vẫn là một trong những bí ẩn lớn nhất của ngành khảo cổ học.`,
    biographyEn: `Alexander the Great (Alexander III of Macedon, 356 BC – 323 BC) was one of the greatest and most successful monarchs and military strategists in human history. He remained undefeated in battle throughout his entire life of conquest.

1. EARLY LIFE AND EDUCATION
• Family Background: Born in Pella, Macedonia, he was the son of King Philip II (who unified ancient Greece) and Queen Olympias.
• Tutoring: From 342 BC to 340 BC, he was directly tutored by the great philosopher Aristotle, who inspired his interest in Greek science, literature, and philosophy.
• Ascension to the Throne: He became the 14th King of the Argead dynasty (Macedonia) in 336 BC at the age of 20, following the assassination of his father.

2. MAJOR CONQUESTS
Within 12 years of his reign, Alexander’s army built one of the largest empires in the ancient world, stretching approximately 5 million square kilometers from Greece through Egypt to northwestern India:
• Conquest of the Persian Empire (Achaemenid): He defeated Persian forces in classic battles such as Granicus (334 BC), Issus (333 BC), and culminated at the Battle of Gaugamela (331 BC) against King Darius III.
• Egypt and the Near East: He was welcomed by the Egyptians as a liberator from Persian rule, and it was here that he founded the first famous city of Alexandria.
• Expansion to India: He marched to the Punjab region and achieved victory at the Battle of the Hydaspes (326 BC) against King Porus. Exhausted after years of relentless campaigning, his troops eventually forced him to turn back.

3. LEGACY AND POLICIES
• Hellenization: Alexander promoted cultural fusion between Greece and the conquered lands, founding around 70 cities named Alexandria to spread Greek language, art, and social structures.
• Military Tactics: He refined tactics by combining heavy cavalry with long-spear infantry (the Macedonian phalanx), creating an undefeated military machine of its era.

4. DEATH AND MYSTERIES
• Passing: Alexander the Great died on June 10/11 or 13, 323 BC, in Babylon at the age of 32. The exact cause of his death remains debated, with theories ranging from malaria, typhoid fever, and encephalitis to poisoning.
• Aftermath: Because he failed to name a clear successor, his empire rapidly collapsed and was fractured by his generals through decades of power struggles. To this day, the location of his tomb remains one of archaeology's greatest mysteries.`,
  },
  {
    id: "legendary-leonardo-marble",
    rarity: "legendary",
    title: "Tượng Leonardo da Vinci",
    shortTitle: "Leonardo",
    icon: "award",
    imageAssetKey: "leonardo-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Nhà bác học đa tài thời Phục Hưng, nổi bật với hội họa, kỹ thuật và giải phẫu học.",
    biography: `Leonardo da Vinci (15 tháng 4 năm 1452 – 2 tháng 5 năm 1519) là nhà bác học đa tài người Ý thời Phục Hưng đỉnh cao. Ông được xem là một trong những người có tài năng đa dạng nhất lịch sử, xuất sắc trong hội họa, phát minh, kỹ thuật, giải phẫu học và triết học tự nhiên.

THÔNG TIN CƠ BẢN
• Sinh: Ngày 15 tháng 4 năm 1452 tại làng Anchiano, gần thị trấn Vinci, Ý. Tên đầy đủ: Leonardo di ser Piero da Vinci.
• Mất: Ngày 2 tháng 5 năm 1519, thọ 67 tuổi, tại lâu đài Clos Lucé ở Amboise, Pháp.
• Thời kỳ hoạt động: Thời Phục Hưng đỉnh cao của Ý.

CUỘC ĐỜI VÀ SỰ NGHIỆP
• Tuổi trẻ và học nghề: Khoảng 14 tuổi, Leonardo bắt đầu làm việc và học nghề trong xưởng ở Florence của bậc thầy Andrea del Verrocchio.
• Đặc điểm cá nhân: Ông thuận cả hai tay, có thói quen viết chữ ngược như soi gương, ăn chay nghiêm ngặt và yêu động vật. Ông không kết hôn và không có con.
• Những người bảo trợ: Ông làm việc cho nhiều nhân vật quyền lực và triều đình ở Florence và Milan dưới thời Ludovico Sforza, phục vụ Cesare Borgia, làm việc tại Vatican dưới thời Giáo hoàng Leo X, rồi sống những năm cuối đời ở Pháp theo lời mời của Vua Francis I.

TÁC PHẨM VÀ DI SẢN
• Hội họa: Mona Lisa; Bữa ăn tối cuối cùng; Người Vitruvius; Salvator Mundi.
• Khoa học và kỹ thuật: Trong các cuốn sổ tay, ông để lại những bản phác thảo và thiết kế vượt trước thời đại về máy bay, xe bọc thép, dù, súng máy và những nghiên cứu chi tiết về giải phẫu người.`,
    biographyEn: `Leonardo da Vinci (April 15, 1452 – May 2, 1519) was an Italian polymath of the High Renaissance. He is widely considered one of the most diversely talented individuals ever to have lived, excelling as a painter, inventor, engineer, anatomist, and natural philosopher.

BASIC INFORMATION
• Born: April 15, 1452, in the village of Anchiano, near the town of Vinci, Italy (full name: Leonardo di ser Piero da Vinci).
• Died: May 2, 1519 (aged 67), at the Château du Clos Lucé in Amboise, France.
• Active Period: The Italian High Renaissance.

LIFE AND CAREER
• Youth and Apprenticeship: Around the age of 14, Leonardo began working and apprenticing in the Florence workshop of the renowned master Andrea del Verrocchio.
• Personal Traits: He was ambidextrous, had a habit of writing backward in mirror script, followed a strict vegetarian diet, and loved animals. He remained unmarried and had no children.
• Major Patrons: He worked for several powerful figures and courts in Florence and Milan (under Ludovico Sforza), served Cesare Borgia, worked at the Vatican under Pope Leo X, and spent his final years in France at the invitation of King Francis I.

NOTABLE WORKS AND LEGACY
• Painting: Mona Lisa; The Last Supper; Vitruvian Man; Salvator Mundi.
• Science and Engineering: His notebooks contained sketches and designs far ahead of their time for flying machines, armored fighting vehicles, parachutes, machine guns, and detailed studies of human anatomy.`,
  },
  {
    id: "legendary-immanuel-kant-marble",
    rarity: "common",
    title: "Tượng Immanuel Kant",
    shortTitle: "Kant",
    icon: "award",
    imageAssetKey: "kant-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Triết gia Đức thời Khai sáng, người sáng lập Chủ nghĩa duy tâm siêu nghiệm.",
    biography: `Immanuel Kant (22 tháng 4 năm 1724 – 12 tháng 2 năm 1804) là triết gia Đức có ảnh hưởng lớn trong Thời đại Khai sáng và là một trong những tư tưởng gia vĩ đại nhất của triết học phương Tây.

TIỂU SỬ VÀ CUỘC ĐỜI
• Sinh và mất: Ông sinh và qua đời tại Königsberg, Vương quốc Phổ (nay là Kaliningrad, Nga). Suốt đời, ông hiếm khi rời khỏi nơi sinh của mình.
• Gia đình và học vấn: Ông là người con thứ tư trong một gia đình sùng đạo làm yên cương. Ông theo học trường trung học Friedrichskollegium, sau đó vào Đại học Königsberg (Albertina), nghiên cứu thần học, toán học và khoa học tự nhiên.
• Sự nghiệp học thuật: Sau khi cha mất, ông có thời gian làm gia sư riêng. Năm 1755, ông nhận bằng tiến sĩ; sau đó trở thành giảng viên rồi giáo sư tại Đại học Königsberg.

NHỮNG TƯ TƯỞNG TRIẾT HỌC CHÍNH
• Trường phái: Ông sáng lập Chủ nghĩa duy tâm siêu nghiệm và đặt nền móng cho triết học cổ điển Đức.
• Các tác phẩm lớn:
  – Phê phán lý tính thuần túy (1781): Khảo sát giới hạn và cấu trúc của tri thức con người.
  – Phê phán lý tính thực hành (1788): Bàn về đạo đức và Mệnh lệnh tuyệt đối.
  – Phê phán năng lực phán đoán (1790): Bàn về mỹ học và mục đích luận.`,
    biographyEn: `Immanuel Kant (April 22, 1724 – February 12, 1804) was an influential German philosopher of the Age of Enlightenment and one of the greatest thinkers in Western philosophy.

BIOGRAPHY AND LIFE
• Birth and Death: He was born and died in Königsberg, Kingdom of Prussia (now Kaliningrad, Russia). Throughout his life, he rarely left his birthplace.
• Family and Education: He was the fourth child in a devout family of harness makers. He attended the Friedrichskollegium secondary school and later entered the University of Königsberg (Albertina) to study theology, mathematics, and natural sciences.
• Academic Career: After his father's death, he worked as a private tutor for some time before earning his doctorate in 1755, eventually becoming a lecturer and then a professor at the University of Königsberg.

MAJOR PHILOSOPHICAL IDEAS
• School of Thought: He founded Transcendental Idealism and laid the foundation for German Classical Philosophy.
• Major Works:
  – Critique of Pure Reason (1781) examines the limits and structure of human knowledge.
  – Critique of Practical Reason (1788) explores ethics and the Categorical Imperative.
  – Critique of Judgment (1790) addresses aesthetics and teleology.`,
  },
  {
    id: "epic-marcus-aurelius-marble",
    rarity: "epic",
    title: "Tượng Marcus Aurelius",
    shortTitle: "Marcus Aurelius",
    icon: "award",
    imageAssetKey: "marcus-aurelius-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Hoàng đế La Mã, vị cuối cùng trong nhóm Năm Hoàng đế Tốt và triết gia Khắc kỷ.",
    biography: `Marcus Aurelius (26 tháng 4 năm 121 – 17 tháng 3 năm 180) là hoàng đế thứ 17 của Đế chế La Mã, vị cuối cùng trong nhóm Năm Hoàng đế Tốt và một triết gia Khắc kỷ tiêu biểu.

THÔNG TIN CƠ BẢN
• Tên khai sinh: Marcus Annius Verus
• Sinh: Ngày 26 tháng 4 năm 121 tại Rome, Ý.
• Mất: Ngày 17 tháng 3 năm 180, thọ 58 tuổi, tại Vindobona (nay là Vienna, Áo) hoặc Sirmium.
• Triều đại: Nerva–Antonine.
• Trị vì: Từ năm 161 đến 180; đồng hoàng đế với Lucius Verus từ năm 161 đến 169 và với Commodus từ năm 177 đến 180.

CUỘC ĐỜI VÀ SỰ NGHIỆP
• Tuổi thơ và kế vị: Cha ông mất khi ông mới ba tuổi; ông được mẹ và ông ngoại nuôi dưỡng. Nhận thấy tiềm năng của Marcus, Hoàng đế Hadrian sắp xếp để Antoninus Pius nhận nuôi ông, đưa ông vào hàng kế vị.
• Triều đại nhiều biến động: Gần như suốt 20 năm trị vì, ông phải đối mặt với chiến tranh liên miên, trong đó có chiến tranh Parthia và các cuộc chiến Marcomanni với những bộ tộc German, cùng trận đại dịch Antonine tàn khốc.
• Triết gia-hoàng đế và “Suy tưởng”: Trong các chiến dịch quân sự khắc nghiệt, ông ghi lại những suy ngẫm riêng bằng tiếng Hy Lạp. Các ghi chép này về sau được biết đến với tên “Suy tưởng”, một kiệt tác lớn của triết học Khắc kỷ.
• Kế vị: Ông mất năm 180 và được con trai Commodus kế vị; sự kiện này thường được xem là dấu mốc kết thúc Pax Romana (Thời kỳ Hòa bình La Mã).`,
    biographyEn: `Marcus Aurelius was the 17th Emperor of the Roman Empire, the last of the Five Good Emperors, and a prominent Stoic philosopher.

BASIC INFORMATION
• Birth Name: Marcus Annius Verus
• Born: April 26, 121 AD in Rome, Italy
• Died: March 17, 180 AD (aged 58) in Vindobona (modern-day Vienna, Austria) or Sirmium
• Dynasty: Nerva–Antonine
• Reign: 161–180 AD (co-emperor with Lucius Verus from 161–169, and with Commodus from 177–180)

LIFE AND CAREER
• Childhood and Succession: His father died when he was three years old, and he was raised by his mother and maternal grandfather. Recognizing his potential, Emperor Hadrian arranged for him to enter the line of succession by having Antoninus Pius adopt him.
• A Turbulent Reign: Nearly his entire 20-year reign was marked by continuous warfare, including the Parthian War and the Marcomannic Wars against Germanic tribes, and by the devastating Antonine Plague.
• The Philosopher King and Meditations: During harsh military campaigns, he wrote personal reflections in Greek. These private notes later became known as Meditations, one of the greatest masterpieces of Stoic philosophy.
• Succession: He died in 180 AD and was succeeded by his son Commodus, an event widely considered to mark the end of the Pax Romana (Roman Peace).`,
  },
  {
    id: "rare-benjamin-franklin-marble",
    rarity: "rare",
    title: "Tượng Benjamin Franklin",
    shortTitle: "Benjamin Franklin",
    icon: "award",
    imageAssetKey: "benjamin-franklin-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Nhà lập quốc Hoa Kỳ, nhà ngoại giao, nhà khoa học và tác giả đa tài.",
    biography: `Benjamin Franklin là một trong những nhà lập quốc lỗi lạc nhất của Hoa Kỳ, nổi tiếng với tài năng đa dạng trong chính trị, ngoại giao, khoa học và văn học.

THÔNG TIN CƠ BẢN
• Sinh: Ngày 17 tháng 1 năm 1706 tại Boston, Massachusetts.
• Mất: Ngày 17 tháng 4 năm 1790 tại Philadelphia, Pennsylvania, thọ 84 tuổi.
• Gia đình: Là người con thứ 10 trong số 17 người con của một gia đình làm xà phòng và nến. Ông dừng việc học chính quy năm 10 tuổi và phần lớn tự học.

SỰ NGHIỆP VÀ ĐÓNG GÓP
• In ấn và văn học: Bắt đầu học nghề in năm 12 tuổi dưới sự hướng dẫn của anh trai. Ông sở hữu tờ Pennsylvania Gazette, xuất bản Poor Richard's Almanack và viết Tự truyện của Benjamin Franklin, tác phẩm kinh điển thể hiện tinh thần tự lập.
• Khoa học và phát minh: Ông có những nghiên cứu nền tảng về điện, nhận diện điện tích dương và âm, đồng thời đề xuất nguyên lý bảo toàn điện tích. Các phát minh của ông gồm cột thu lôi, bếp Franklin và kính hai tròng.
• Chính trị và ngoại giao: Ông tham gia soạn thảo và ký Tuyên ngôn Độc lập Hoa Kỳ năm 1776. Với vai trò đại sứ Hoa Kỳ tại Pháp trong Cách mạng Mỹ, ông góp phần quan trọng giúp Hoa Kỳ giành viện trợ quân sự và tài chính từ Pháp. Ông tham gia soạn thảo Hiến pháp Hoa Kỳ và là người duy nhất ký cả bốn văn kiện lập quốc lớn của Hoa Kỳ.
• Hoạt động cộng đồng: Ông sáng lập thư viện cho mượn sách công cộng đầu tiên và đội cứu hỏa tình nguyện đầu tiên của Hoa Kỳ. Ông từng giữ chức Chủ tịch Pennsylvania và về cuối đời trở thành người kiên quyết đấu tranh chống chế độ nô lệ.`,
    biographyEn: `Benjamin Franklin was one of the greatest Founding Fathers of the United States, renowned for his polymathic talents across politics, diplomacy, science, and literature.

BASIC INFORMATION
• Born: January 17, 1706, in Boston, Massachusetts.
• Died: April 17, 1790, in Philadelphia, Pennsylvania (aged 84).
• Family: He was the 10th son of 17 children in a soap and candle-making family. His formal schooling ended at age 10, making him largely self-educated.

CAREER AND MAJOR CONTRIBUTIONS
• Printing and Literature: Began apprenticing as a printer at age 12 under his older brother. He owned the Pennsylvania Gazette and published the famous Poor Richard's Almanack. He wrote The Autobiography of Benjamin Franklin, a classic work embodying the spirit of the self-made man.
• Science and Inventions: Conducted foundational research into the nature of electricity, identifying positive and negative charges and formulating the principle of conservation of charge. He invented the lightning rod, the Franklin stove, and bifocal glasses.
• Politics and Diplomacy: Helped draft and signed the United States Declaration of Independence (1776). He served as the U.S. minister to France during the American Revolution, playing a crucial role in securing French military and financial aid for American independence. He participated in drafting the U.S. Constitution and was the only person to sign all four major founding documents of the United States.
• Civic Activities: Founded America's first public lending library and first volunteer fire company. He served as President of Pennsylvania and became an ardent abolitionist later in life.`,
  },
  {
    id: "legendary-napoleon-bonaparte-marble",
    rarity: "legendary",
    title: "Tượng Napoléon Bonaparte",
    shortTitle: "Napoléon",
    icon: "award",
    imageAssetKey: "napoleon-marble",
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description:
      "Nhà chỉ huy quân sự và nhà lãnh đạo chính trị Pháp, Hoàng đế đầu tiên của Đế chế Pháp.",
    biography: `Napoléon Bonaparte là nhà chỉ huy quân sự và nhà lãnh đạo chính trị lỗi lạc của Pháp. Ông đã định hình lại chính trị và lịch sử châu Âu vào cuối thế kỷ 18 và đầu thế kỷ 19.

1. THÂN THẾ VÀ GIÁO DỤC
• Ngày sinh: Ngày 15 tháng 8 năm 1769 tại Ajaccio trên đảo Corsica.
• Tên khai sinh: Napoleone di Buonaparte.
• Gia đình: Là người con thứ tư trong số tám người con của Carlo Bonaparte và Letizia Ramolino, thuộc tầng lớp quý tộc Ý cấp thấp.
• Học vấn: Ông học tại học viện quân sự Brienne và École Militaire ở Paris, chuyên về pháo binh.

2. SỰ NGHIỆP QUÂN SỰ VÀ CON ĐƯỜNG NẮM QUYỀN
• Thành công ban đầu: Khởi đầu là sĩ quan pháo binh trẻ, ông nhanh chóng thăng tiến trong Cách mạng Pháp nhờ tài năng chiến lược.
• Chiến thắng: Ông tham chiến hơn 60 trận và giành chiến thắng hơn 51 trận, trong đó có các chiến thắng nổi tiếng ở Marengo và Austerlitz.
• Hoàng đế Pháp: Năm 1804, ông tự đăng quang Hoàng đế Pháp và lập nên Đế chế Pháp thứ nhất.

3. CÁC CẢI CÁCH LỚN
• Bộ luật Napoléon (Code Napoléon): Ông ban hành bộ luật dân sự thống nhất, đặt nền tảng pháp lý cho nước Pháp hiện đại và tạo ảnh hưởng đến các hệ thống luật pháp khắp châu Âu.
• Hành chính và giáo dục: Ông cải cách nền hành chính công, ngân hàng, tài chính và hệ thống giáo dục trung học, đại học.

4. THẤT BẠI, LƯU ĐÀY VÀ QUA ĐỜI
• Cuộc xâm lược Nga (1812): Cuộc xâm lược thảm họa vào Nga đánh dấu bước ngoặt trong vận mệnh của ông.
• Thoái vị lần thứ nhất (1814): Sau khi bị liên quân châu Âu đánh bại tại trận Leipzig, ông buộc phải thoái vị và bị lưu đày đến đảo Elba.
• Một trăm ngày (1815): Ông trốn khỏi Elba và trở lại nắm quyền trong 100 ngày, trước khi chịu thất bại cuối cùng trước quân Anh và Phổ tại trận Waterloo.
• Lưu đày lần cuối và qua đời: Người Anh đày ông đến đảo Saint Helena xa xôi. Ông mất tại đó ngày 5 tháng 5 năm 1821, thọ 51 tuổi, do ung thư dạ dày. Năm 1840, hài cốt ông được đưa về Paris an táng.`,
    biographyEn: `Napoleon Bonaparte was an eminent French military commander and political leader. He reshaped European politics and history during the late 18th and early 19th centuries.

1. EARLY LIFE AND EDUCATION
• Birth Date: Born on August 15, 1769, in Ajaccio on the island of Corsica.
• Birth Name: Napoleone di Buonaparte.
• Family: He was the fourth of eight children born to Carlo Bonaparte and Letizia Ramolino, who belonged to the minor Italian nobility.
• Education: He studied at the military academy at Brienne and the École Militaire in Paris, specializing in artillery.

2. MILITARY CAREER AND RISE TO POWER
• Early Success: Starting as a young artillery officer, he rose rapidly during the French Revolution thanks to his strategic brilliance.
• Victories: He fought in over 60 battles and won more than 51 of them, including famous victories at Marengo and Austerlitz.
• Emperor of the French: In 1804, he crowned himself Emperor of the French, establishing the First French Empire.

3. MAJOR REFORMS
• The Napoleonic Code (Code Napoléon): He introduced a unified civil code that laid the legal foundation for modern France and influenced legal systems across Europe.
• Administration & Education: He reformed public administration, banking, finance, and the secondary and higher education systems.

4. DOWNFALL, EXILE, AND DEATH
• Invasion of Russia (1812): A disastrous invasion of Russia marked the turning point in his fortunes.
• First Abdication (1814): Defeated by European coalitions at the Battle of Leipzig, he was forced to abdicate and was exiled to the island of Elba.
• The Hundred Days (1815): He escaped Elba and returned to power for 100 days, before suffering a final defeat by British and Prussian forces at the Battle of Waterloo.
• Final Exile and Death: The British exiled him to the remote island of Saint Helena, where he died on May 5, 1821, at age 51 from stomach cancer. In 1840, his remains were returned to Paris for burial.`,
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
