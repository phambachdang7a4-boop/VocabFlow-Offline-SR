import type { CollectionArtwork } from "./collection-artworks";
import type { ChestRarity } from "./mission-chests";

function historicalStatue(
  slug: string,
  name: string,
  shortName: string,
  rarity: ChestRarity,
  description: string,
  biography: string,
  biographyEn: string,
): CollectionArtwork {
  return {
    id: `${rarity}-${slug}-marble`,
    rarity,
    title: `Tượng ${name}`,
    shortTitle: shortName,
    icon: "award",
    imageAssetKey: `${slug}-marble`,
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description,
    biography,
    biographyEn,
  };
}

const historicalStatues: CollectionArtwork[] = [
  historicalStatue(
    "julius-caesar",
    "Julius Caesar",
    "Julius Caesar",
    "legendary",
    "Chính khách và vị tướng La Mã, người có vai trò quyết định trong sự chuyển đổi từ Cộng hòa sang Đế chế.",
    `Julius Caesar (100–44 TCN) là chính khách, nhà hùng biện và vị tướng La Mã có ảnh hưởng lớn trong lịch sử Cộng hòa La Mã.

SỰ NGHIỆP
• Ông chinh phục xứ Gaul, vượt sông Rubicon và giành chiến thắng trong cuộc nội chiến La Mã.
• Năm 44 TCN, ông bị ám sát tại Rome sau khi được phong làm nhà độc tài trọn đời.

DI SẢN
• Những cải cách chính trị và lịch Julius Caesar góp phần định hình La Mã; tên ông trở thành gốc của các danh xưng “Caesar” và “Kaiser”.`,
    `Julius Caesar (100–44 BC) was an influential Roman statesman, orator, and general of the late Roman Republic.

CAREER
• He conquered Gaul, crossed the Rubicon, and prevailed in the Roman civil war.
• Appointed dictator for life, he was assassinated in Rome in 44 BC.

LEGACY
• His political reforms and calendar helped shape Rome; his name became the root of titles such as “Caesar” and “Kaiser”.`,
  ),
  historicalStatue(
    "isaac-newton",
    "Isaac Newton",
    "Isaac Newton",
    "legendary",
    "Nhà vật lý và toán học Anh, người đặt nền móng cho cơ học cổ điển.",
    `Isaac Newton (1643–1727) là nhà vật lý, toán học và nhà tư tưởng người Anh, một nhân vật trung tâm của Cách mạng Khoa học.

ĐÓNG GÓP KHOA HỌC
• Trong tác phẩm Principia (1687), ông trình bày các định luật chuyển động và định luật vạn vật hấp dẫn.
• Ông có những đóng góp nền tảng cho quang học và phép tính vi tích phân.

DI SẢN
• Các định luật của Newton trở thành cơ sở của cơ học cổ điển và có ảnh hưởng sâu rộng đến khoa học hiện đại.`,
    `Isaac Newton (1643–1727) was an English physicist, mathematician, and thinker, and a central figure of the Scientific Revolution.

SCIENTIFIC CONTRIBUTIONS
• In Principia (1687), he presented the laws of motion and universal gravitation.
• He made foundational contributions to optics and calculus.

LEGACY
• Newton's laws became the basis of classical mechanics and profoundly influenced modern science.`,
  ),
  historicalStatue(
    "socrates",
    "Socrates",
    "Socrates",
    "epic",
    "Triết gia Athens cổ đại, nổi tiếng với phương pháp truy vấn đối thoại.",
    `Socrates (khoảng 470–399 TCN) là triết gia Athens có ảnh hưởng lớn, được biết đến qua các cuộc đối thoại do học trò ghi lại.

TƯ TƯỞNG
• Phương pháp Socrates dùng câu hỏi nối tiếp để kiểm tra giả định và làm sáng tỏ khái niệm.
• Ông tập trung vào đức hạnh, công lý và cách sống tốt.

DI SẢN
• Bị kết án tại Athens và qua đời sau khi uống độc cần; tư tưởng của ông ảnh hưởng sâu sắc đến Plato và triết học phương Tây.`,
    `Socrates (c. 470–399 BC) was an influential Athenian philosopher known through dialogues recorded by his students.

IDEAS
• The Socratic method uses a sequence of questions to examine assumptions and clarify ideas.
• He focused on virtue, justice, and how to live well.

LEGACY
• Convicted in Athens, he died after drinking hemlock. His thought deeply influenced Plato and Western philosophy.`,
  ),
  historicalStatue(
    "aristotle",
    "Aristotle",
    "Aristotle",
    "epic",
    "Triết gia Hy Lạp cổ đại, học trò Plato và thầy dạy Alexander Đại đế.",
    `Aristotle (384–322 TCN) là triết gia Hy Lạp cổ đại, học trò của Plato và thầy dạy Alexander Đại đế.

CUỘC ĐỜI VÀ TƯ TƯỞNG
• Ông thành lập Lyceum tại Athens và nghiên cứu logic, đạo đức, chính trị, sinh học, vật lý cùng văn chương.
• Phương pháp của ông kết hợp lập luận có hệ thống với quan sát thế giới tự nhiên.

DI SẢN
• Các tác phẩm của Aristotle định hình triết học và khoa học trong nhiều thế kỷ ở châu Âu và Trung Đông.`,
    `Aristotle (384–322 BC) was an ancient Greek philosopher, a student of Plato, and tutor to Alexander the Great.

LIFE AND IDEAS
• He founded the Lyceum in Athens and studied logic, ethics, politics, biology, physics, and literature.
• His method combined systematic reasoning with observation of the natural world.

LEGACY
• Aristotle's works shaped philosophy and science for centuries in Europe and the Middle East.`,
  ),
  historicalStatue(
    "archimedes",
    "Archimedes",
    "Archimedes",
    "epic",
    "Nhà toán học và kỹ sư Hy Lạp cổ đại, nổi tiếng với các công trình về hình học và thủy tĩnh học.",
    `Archimedes (khoảng 287–212 TCN) là nhà toán học, nhà vật lý và kỹ sư Hy Lạp sinh tại Syracuse.

KHÁM PHÁ
• Ông nghiên cứu hình học, đòn bẩy, lực đẩy của chất lỏng và nhiều máy móc phục vụ đời sống, quốc phòng.
• Nguyên lý Archimedes mô tả lực đẩy tác dụng lên vật thể trong chất lỏng.

DI SẢN
• Ông được xem là một trong những nhà toán học vĩ đại nhất thời cổ đại; ông qua đời khi Syracuse thất thủ trước La Mã.`,
    `Archimedes (c. 287–212 BC) was a Greek mathematician, physicist, and engineer from Syracuse.

DISCOVERIES
• He studied geometry, levers, buoyancy, and designed machines for practical and defensive use.
• The Archimedes principle describes the buoyant force acting on an object in a fluid.

LEGACY
• Remembered as one of antiquity's greatest mathematicians, he died when Syracuse fell to Rome.`,
  ),
  historicalStatue(
    "cleopatra-vii",
    "Cleopatra VII",
    "Cleopatra",
    "epic",
    "Nữ hoàng cuối cùng của triều đại Ptolemaios Ai Cập.",
    `Cleopatra VII (69–30 TCN) là nữ hoàng thuộc triều đại Ptolemaios và là một trong những nhân vật nổi bật nhất của Ai Cập cổ đại.

TRỊ VÌ
• Bà cai trị Ai Cập trong giai đoạn Cộng hòa La Mã mở rộng ảnh hưởng ở Địa Trung Hải.
• Các liên minh chính trị với Julius Caesar và Mark Antony gắn vận mệnh Ai Cập với những cuộc xung đột ở La Mã.

DI SẢN
• Sau thất bại trước Octavian, Cleopatra qua đời năm 30 TCN; Ai Cập trở thành một tỉnh của La Mã.`,
    `Cleopatra VII (69–30 BC) was a queen of the Ptolemaic dynasty and one of the best-known figures of ancient Egypt.

REIGN
• She ruled Egypt as the Roman Republic expanded its influence across the Mediterranean.
• Her political alliances with Julius Caesar and Mark Antony tied Egypt's fate to Roman conflicts.

LEGACY
• After Octavian's victory, Cleopatra died in 30 BC and Egypt became a Roman province.`,
  ),
  historicalStatue(
    "augustus",
    "Augustus",
    "Augustus",
    "epic",
    "Hoàng đế đầu tiên của La Mã, người mở đầu thời kỳ Pax Romana.",
    `Augustus (63 TCN – 14 SCN), tên khai sinh Octavian, là người cai trị đầu tiên của Đế chế La Mã.

CON ĐƯỜNG NẮM QUYỀN
• Sau các cuộc nội chiến, ông đánh bại Mark Antony và Cleopatra, rồi thiết lập quyền cai trị mới vào năm 27 TCN.
• Ông cải tổ quân đội, hành chính và cơ cấu chính quyền La Mã.

DI SẢN
• Triều đại của Augustus mở đầu Pax Romana, thời kỳ ổn định tương đối kéo dài trong thế giới La Mã.`,
    `Augustus (63 BC–AD 14), born Octavian, was the first ruler of the Roman Empire.

RISE TO POWER
• After the civil wars, he defeated Mark Antony and Cleopatra and established his new rule in 27 BC.
• He reorganized the Roman army, administration, and government.

LEGACY
• Augustus's reign began the Pax Romana, a long period of relative stability across the Roman world.`,
  ),
  historicalStatue(
    "confucius",
    "Khổng Tử",
    "Khổng Tử",
    "epic",
    "Nhà tư tưởng và nhà giáo Trung Hoa, có ảnh hưởng sâu rộng đến văn hóa Đông Á.",
    `Khổng Tử (551–479 TCN) là nhà tư tưởng và nhà giáo Trung Hoa, người đặt nền tảng cho truyền thống Nho học.

TƯ TƯỞNG
• Ông nhấn mạnh nhân nghĩa, lễ, sự tôn trọng trong gia đình và trách nhiệm của người cầm quyền.
• Những lời dạy của ông được học trò ghi lại trong Luận Ngữ.

DI SẢN
• Tư tưởng Khổng Tử ảnh hưởng lâu dài đến giáo dục, đạo đức và đời sống chính trị ở Trung Quốc cùng nhiều nước Đông Á.`,
    `Confucius (551–479 BC) was a Chinese thinker and teacher whose ideas became the foundation of Confucian tradition.

IDEAS
• He emphasized humaneness, ritual, respect within families, and the responsibilities of rulers.
• His teachings were recorded by his students in the Analects.

LEGACY
• Confucian thought had a lasting influence on education, ethics, and public life in China and across East Asia.`,
  ),
  historicalStatue(
    "michelangelo",
    "Michelangelo",
    "Michelangelo",
    "epic",
    "Nghệ sĩ Phục Hưng Ý, nhà điêu khắc và họa sĩ của tượng David và trần nhà nguyện Sistine.",
    `Michelangelo Buonarroti (1475–1564) là nhà điêu khắc, họa sĩ và kiến trúc sư người Ý thời Phục Hưng.

TÁC PHẨM
• Các tác phẩm nổi tiếng của ông gồm tượng David, Pietà và tranh trên trần nhà nguyện Sistine.
• Ông cũng tham gia thiết kế kiến trúc, trong đó có công trình tại Vương cung thánh đường Thánh Phêrô.

DI SẢN
• Cách thể hiện cơ thể người và cảm xúc trong tác phẩm của ông có ảnh hưởng sâu rộng đến nghệ thuật châu Âu.`,
    `Michelangelo Buonarroti (1475–1564) was an Italian Renaissance sculptor, painter, and architect.

WORKS
• His best-known works include the statue of David, the Pietà, and the Sistine Chapel ceiling.
• He also contributed to architecture, including work at St. Peter's Basilica.

LEGACY
• His treatment of the human body and emotion had a profound influence on European art.`,
  ),
  historicalStatue(
    "william-shakespeare",
    "William Shakespeare",
    "Shakespeare",
    "epic",
    "Nhà viết kịch và nhà thơ Anh, tác giả của Hamlet, Macbeth và Romeo và Juliet.",
    `William Shakespeare (1564–1616) là nhà viết kịch và nhà thơ người Anh, hoạt động tại London vào cuối thế kỷ 16 và đầu thế kỷ 17.

TÁC PHẨM
• Các vở kịch nổi tiếng gồm Hamlet, Macbeth, Othello và Romeo và Juliet.
• Ông là thành viên của đoàn kịch King's Men, gắn liền với nhà hát Globe.

DI SẢN
• Tác phẩm của Shakespeare tiếp tục được trình diễn, dịch và nghiên cứu trên khắp thế giới.`,
    `William Shakespeare (1564–1616) was an English playwright and poet active in London in the late 16th and early 17th centuries.

WORKS
• His best-known plays include Hamlet, Macbeth, Othello, and Romeo and Juliet.
• He was a member of the King's Men acting company, associated with the Globe Theatre.

LEGACY
• Shakespeare's works continue to be performed, translated, and studied around the world.`,
  ),
  historicalStatue(
    "galileo-galilei",
    "Galileo Galilei",
    "Galileo",
    "epic",
    "Nhà thiên văn và nhà vật lý Ý, người thúc đẩy quan sát thực nghiệm trong khoa học.",
    `Galileo Galilei (1564–1642) là nhà thiên văn, nhà vật lý và nhà toán học người Ý.

KHÁM PHÁ
• Qua kính thiên văn, ông quan sát các vệ tinh của Sao Mộc, các pha của Sao Kim và địa hình Mặt Trăng.
• Những quan sát của ông ủng hộ mô hình nhật tâm và góp phần thúc đẩy phương pháp thực nghiệm.

DI SẢN
• Các nghiên cứu của Galileo trở thành cột mốc quan trọng trong Cách mạng Khoa học.`,
    `Galileo Galilei (1564–1642) was an Italian astronomer, physicist, and mathematician.

DISCOVERIES
• Through a telescope, he observed Jupiter's moons, the phases of Venus, and the Moon's uneven surface.
• His observations supported heliocentrism and helped advance experimental methods.

LEGACY
• Galileo's work became a landmark in the Scientific Revolution.`,
  ),
  historicalStatue(
    "plato",
    "Plato",
    "Plato",
    "rare",
    "Triết gia Athens, học trò Socrates và người sáng lập Học viện Plato.",
    `Plato (khoảng 428–348 TCN) là triết gia Athens, học trò của Socrates và thầy của Aristotle.

TÁC PHẨM VÀ TƯ TƯỞNG
• Ông trình bày nhiều ý tưởng dưới dạng đối thoại, bàn về công lý, tri thức, chính trị và bản chất của thực tại.
• Tác phẩm Cộng hòa mô tả quan niệm của ông về nhà nước và người cai trị lý tưởng.

DI SẢN
• Plato thành lập Học viện tại Athens; tư tưởng của ông có ảnh hưởng lâu dài đến triết học phương Tây.`,
    `Plato (c. 428–348 BC) was an Athenian philosopher, student of Socrates, and teacher of Aristotle.

WORKS AND IDEAS
• He presented many of his ideas through dialogues on justice, knowledge, politics, and the nature of reality.
• The Republic sets out his view of the state and the ideal ruler.

LEGACY
• Plato founded the Academy in Athens and had a lasting influence on Western philosophy.`,
  ),
  historicalStatue(
    "pythagoras",
    "Pythagoras",
    "Pythagoras",
    "rare",
    "Nhà toán học và triết gia Hy Lạp cổ đại gắn với định lý Pythagoras.",
    `Pythagoras (khoảng 570–495 TCN) là triết gia và nhà toán học Hy Lạp cổ đại, hoạt động tại vùng Nam Ý.

TRƯỜNG PHÁI
• Cộng đồng do ông khởi xướng nghiên cứu toán học, âm nhạc và quan niệm về trật tự của vũ trụ.
• Định lý Pythagoras mang tên ông, dù lịch sử hình thành kiến thức này có từ trước.

DI SẢN
• Các tư tưởng Pythagoras kết nối toán học với triết học và âm nhạc; nhiều chi tiết tiểu sử của ông còn chưa chắc chắn.`,
    `Pythagoras (c. 570–495 BC) was an ancient Greek philosopher and mathematician active in southern Italy.

SCHOOL
• The community associated with him studied mathematics, music, and ideas about the order of the universe.
• The Pythagorean theorem bears his name, although knowledge of it predates him.

LEGACY
• Pythagorean ideas linked mathematics with philosophy and music; many details of his life remain uncertain.`,
  ),
  historicalStatue(
    "hippocrates",
    "Hippocrates",
    "Hippocrates",
    "rare",
    "Thầy thuốc Hy Lạp cổ đại, thường được xem là một trong những người đặt nền móng cho y học.",
    `Hippocrates (khoảng 460–370 TCN) là thầy thuốc Hy Lạp cổ đại, sinh tại đảo Kos.

Y HỌC
• Truyền thống gắn với tên ông khuyến khích quan sát triệu chứng và tìm nguyên nhân tự nhiên của bệnh.
• Lời thề Hippocrates thể hiện những nguyên tắc đạo đức lâu đời trong nghề y.

DI SẢN
• Ông thường được gọi là “cha đẻ của y học”; nhiều văn bản cổ mang tên Hippocrates có thể do nhiều tác giả biên soạn.`,
    `Hippocrates (c. 460–370 BC) was an ancient Greek physician born on the island of Kos.

MEDICINE
• The tradition associated with his name encouraged observing symptoms and seeking natural explanations for illness.
• The Hippocratic Oath expresses long-standing ethical principles for medical practice.

LEGACY
• Often called the “father of medicine,” Hippocrates is associated with ancient medical writings that may have had multiple authors.`,
  ),
  historicalStatue(
    "homer",
    "Homer",
    "Homer",
    "rare",
    "Nhà thơ sử thi Hy Lạp cổ đại, được gắn với Iliad và Odyssey.",
    `Homer là nhà thơ sử thi Hy Lạp cổ đại, thường được đặt vào khoảng thế kỷ 8 TCN; thông tin về cuộc đời ông chưa được xác định chắc chắn.

SỬ THI
• Iliad kể về một giai đoạn của cuộc chiến thành Troy.
• Odyssey thuật lại hành trình trở về quê hương của Odysseus.

DI SẢN
• Hai sử thi này có ảnh hưởng nền tảng đến văn học Hy Lạp và truyền thống kể chuyện phương Tây.`,
    `Homer was an ancient Greek epic poet often placed around the 8th century BC, though little about his life is certain.

EPICS
• The Iliad recounts an episode from the Trojan War.
• The Odyssey tells of Odysseus's journey home.

LEGACY
• These epics had a foundational influence on Greek literature and the Western storytelling tradition.`,
  ),
  historicalStatue(
    "cicero",
    "Cicero",
    "Cicero",
    "rare",
    "Nhà hùng biện, chính khách và triết gia La Mã cuối thời Cộng hòa.",
    `Marcus Tullius Cicero (106–43 TCN) là nhà hùng biện, luật gia, chính khách và triết gia La Mã.

SỰ NGHIỆP
• Ông giữ chức chấp chính quan và nổi tiếng với các bài diễn văn bảo vệ nền Cộng hòa.
• Các tác phẩm của ông bàn về hùng biện, nghĩa vụ, luật pháp và triết học.

DI SẢN
• Văn phong Latin của Cicero ảnh hưởng sâu rộng đến giáo dục và văn chương châu Âu.`,
    `Marcus Tullius Cicero (106–43 BC) was a Roman orator, lawyer, statesman, and philosopher.

CAREER
• He served as consul and became known for speeches defending the Republic.
• His writings explored rhetoric, duty, law, and philosophy.

LEGACY
• Cicero's Latin style had a lasting influence on European education and literature.`,
  ),
  historicalStatue(
    "hannibal",
    "Hannibal",
    "Hannibal",
    "rare",
    "Danh tướng Carthage, nổi tiếng với cuộc hành quân vượt dãy Alps.",
    `Hannibal Barca (247–183 TCN) là vị tướng Carthage trong Chiến tranh Punic lần thứ hai với La Mã.

CHIẾN DỊCH
• Ông dẫn quân từ Iberia vượt dãy Alps vào bán đảo Ý.
• Chiến thắng tại Cannae năm 216 TCN được xem là một trong những chiến thắng quân sự nổi bật của thời cổ đại.

DI SẢN
• Hannibal được ghi nhớ như một trong những nhà chiến lược quân sự xuất sắc của thế giới cổ đại.`,
    `Hannibal Barca (247–183 BC) was a Carthaginian general in the Second Punic War against Rome.

CAMPAIGNS
• He led his army from Iberia across the Alps into the Italian peninsula.
• His victory at Cannae in 216 BC is considered one of antiquity's notable military achievements.

LEGACY
• Hannibal is remembered as one of the ancient world's most accomplished military strategists.`,
  ),
  historicalStatue(
    "dante-alighieri",
    "Dante Alighieri",
    "Dante",
    "rare",
    "Nhà thơ Florence, tác giả Thần khúc và người góp phần định hình văn học tiếng Ý.",
    `Dante Alighieri (1265–1321) là nhà thơ người Florence, có ảnh hưởng lớn đến văn học Ý.

TÁC PHẨM
• Tác phẩm nổi tiếng nhất của ông là Thần khúc, bài thơ kể hành trình qua Địa ngục, Luyện ngục và Thiên đường.
• Ông viết nhiều tác phẩm bằng tiếng Ý bản địa thay vì chỉ dùng Latin.

DI SẢN
• Thần khúc góp phần định hình ngôn ngữ văn học Ý và trở thành kiệt tác của văn chương thế giới.`,
    `Dante Alighieri (1265–1321) was a Florentine poet whose work profoundly shaped Italian literature.

WORKS
• His best-known work, the Divine Comedy, follows a journey through Hell, Purgatory, and Paradise.
• He wrote major works in the Italian vernacular rather than exclusively in Latin.

LEGACY
• The Divine Comedy helped shape literary Italian and became a classic of world literature.`,
  ),
  historicalStatue(
    "nicolaus-copernicus",
    "Nicolaus Copernicus",
    "Copernicus",
    "rare",
    "Nhà thiên văn Phục Hưng, người trình bày mô hình nhật tâm có ảnh hưởng lớn.",
    `Nicolaus Copernicus (1473–1543) là nhà thiên văn và học giả người Ba Lan thời Phục Hưng.

MÔ HÌNH NHẬT TÂM
• Trong tác phẩm De revolutionibus, ông trình bày mô hình đặt Mặt Trời gần trung tâm và Trái Đất chuyển động quanh nó.
• Ý tưởng này thách thức mô hình địa tâm được chấp nhận rộng rãi vào thời đó.

DI SẢN
• Công trình của Copernicus mở đầu một biến chuyển lớn trong thiên văn học châu Âu.`,
    `Nicolaus Copernicus (1473–1543) was a Polish astronomer and scholar of the Renaissance.

HELIOCENTRIC MODEL
• In De revolutionibus, he described a system with the Sun near the center and Earth moving around it.
• This challenged the widely accepted geocentric model of his time.

LEGACY
• Copernicus's work helped initiate a major transformation in European astronomy.`,
  ),
  historicalStatue(
    "johannes-kepler",
    "Johannes Kepler",
    "Kepler",
    "rare",
    "Nhà thiên văn Đức, người phát hiện các định luật chuyển động của hành tinh.",
    `Johannes Kepler (1571–1630) là nhà thiên văn và toán học người Đức.

KHÁM PHÁ
• Dựa trên các quan sát thiên văn chính xác, ông xác lập ba định luật mô tả chuyển động của hành tinh quanh Mặt Trời.
• Ông từng cộng tác với Tycho Brahe và ủng hộ mô hình nhật tâm.

DI SẢN
• Các định luật Kepler trở thành nền tảng quan trọng cho cơ học thiên thể sau này.`,
    `Johannes Kepler (1571–1630) was a German astronomer and mathematician.

DISCOVERIES
• Using precise astronomical observations, he established three laws describing how planets orbit the Sun.
• He worked with Tycho Brahe and supported the heliocentric model.

LEGACY
• Kepler's laws became an important foundation for later celestial mechanics.`,
  ),
  historicalStatue(
    "voltaire",
    "Voltaire",
    "Voltaire",
    "rare",
    "Nhà văn và triết gia Pháp thời Khai sáng, nổi tiếng với Candide.",
    `Voltaire (1694–1778), tên thật François-Marie Arouet, là nhà văn và triết gia Pháp thời Khai sáng.

TÁC PHẨM VÀ QUAN ĐIỂM
• Ông viết thơ, kịch, tiểu luận và truyện trào phúng, trong đó có Candide.
• Các bài viết của ông phê phán sự cố chấp và lạm quyền, đồng thời bảo vệ tự do tư tưởng.

DI SẢN
• Voltaire là một trong những tiếng nói có ảnh hưởng của phong trào Khai sáng châu Âu.`,
    `Voltaire (1694–1778), born François-Marie Arouet, was a French writer and philosopher of the Enlightenment.

WORKS AND VIEWS
• He wrote poetry, plays, essays, and satire, including Candide.
• His writing criticized intolerance and abuses of power and defended freedom of thought.

LEGACY
• Voltaire became one of the influential voices of the European Enlightenment.`,
  ),
  historicalStatue(
    "charles-darwin",
    "Charles Darwin",
    "Darwin",
    "rare",
    "Nhà tự nhiên học Anh, nổi tiếng với thuyết tiến hóa bằng chọn lọc tự nhiên.",
    `Charles Darwin (1809–1882) là nhà tự nhiên học người Anh có ảnh hưởng lớn đến sinh học hiện đại.

NGHIÊN CỨU
• Chuyến đi trên tàu HMS Beagle giúp ông quan sát sự đa dạng của sinh vật và địa chất ở nhiều vùng.
• Trong Nguồn gốc các loài (1859), ông trình bày tiến hóa bằng chọn lọc tự nhiên.

DI SẢN
• Các ý tưởng của Darwin làm thay đổi cách khoa học giải thích sự đa dạng và lịch sử của sự sống.`,
    `Charles Darwin (1809–1882) was an English naturalist whose work profoundly influenced modern biology.

RESEARCH
• The voyage of HMS Beagle gave him opportunities to observe biological and geological diversity around the world.
• In On the Origin of Species (1859), he presented evolution by natural selection.

LEGACY
• Darwin's ideas transformed scientific explanations of the diversity and history of life.`,
  ),
  historicalStatue(
    "ludwig-van-beethoven",
    "Ludwig van Beethoven",
    "Beethoven",
    "rare",
    "Nhà soạn nhạc Đức nối kết thời kỳ Cổ điển và Lãng mạn.",
    `Ludwig van Beethoven (1770–1827) là nhà soạn nhạc và nghệ sĩ dương cầm người Đức.

ÂM NHẠC
• Các tác phẩm tiêu biểu gồm chín bản giao hưởng, sonata piano và tứ tấu dây.
• Ông tiếp tục sáng tác ngay cả khi thính lực suy giảm nghiêm trọng.

DI SẢN
• Âm nhạc của Beethoven mở rộng quy mô và cách biểu đạt của truyền thống Cổ điển, đồng thời ảnh hưởng đến thời kỳ Lãng mạn.`,
    `Ludwig van Beethoven (1770–1827) was a German composer and pianist.

MUSIC
• His major works include nine symphonies, piano sonatas, and string quartets.
• He continued composing as his hearing deteriorated severely.

LEGACY
• Beethoven expanded the scale and expressive range of Classical music and influenced the Romantic era.`,
  ),
  historicalStatue(
    "wolfgang-amadeus-mozart",
    "Wolfgang Amadeus Mozart",
    "Mozart",
    "rare",
    "Nhà soạn nhạc Áo thời Cổ điển, nổi tiếng với các opera và giao hưởng.",
    `Wolfgang Amadeus Mozart (1756–1791) là nhà soạn nhạc Áo và một trong những gương mặt tiêu biểu của thời kỳ Cổ điển.

SỰ NGHIỆP
• Ông sáng tác từ nhỏ và lưu diễn nhiều nơi tại châu Âu.
• Các tác phẩm nổi bật gồm opera Cây sáo thần, Đám cưới Figaro, giao hưởng và concerto.

DI SẢN
• Âm nhạc của Mozart được đánh giá cao nhờ giai điệu, cấu trúc và khả năng biểu đạt phong phú.`,
    `Wolfgang Amadeus Mozart (1756–1791) was an Austrian composer and a leading figure of the Classical period.

CAREER
• He composed from childhood and toured widely across Europe.
• Notable works include the operas The Magic Flute and The Marriage of Figaro, as well as symphonies and concertos.

LEGACY
• Mozart's music is admired for its melody, structure, and expressive range.`,
  ),
  historicalStatue(
    "george-washington",
    "George Washington",
    "Washington",
    "rare",
    "Tổng thống đầu tiên của Hoa Kỳ và Tổng tư lệnh Lục quân Lục địa trong Cách mạng Mỹ.",
    `George Washington (1732–1799) là nhà lãnh đạo quân sự và chính trị Hoa Kỳ, tổng thống đầu tiên của nước này.

CUỘC ĐỜI VÀ SỰ NGHIỆP
• Ông chỉ huy Lục quân Lục địa trong Chiến tranh Cách mạng Mỹ.
• Năm 1789, ông nhậm chức tổng thống đầu tiên và phục vụ hai nhiệm kỳ.

DI SẢN
• Washington góp phần định hình các chuẩn mực của chức vụ tổng thống và chính quyền liên bang Hoa Kỳ thời kỳ đầu.`,
    `George Washington (1732–1799) was an American military and political leader and the country's first president.

LIFE AND CAREER
• He commanded the Continental Army during the American Revolutionary War.
• In 1789, he took office as the first U.S. president and served two terms.

LEGACY
• Washington helped shape the conventions of the presidency and the early federal government.`,
  ),
  historicalStatue(
    "euclid",
    "Euclid",
    "Euclid",
    "common",
    "Nhà hình học Hy Lạp tại Alexandria, tác giả bộ Elements có ảnh hưởng lớn.",
    `Euclid (hoạt động khoảng năm 300 TCN) là nhà toán học Hy Lạp gắn với thành phố Alexandria.

TOÁN HỌC
• Bộ Elements hệ thống hóa hình học và số học bằng định nghĩa, tiên đề và chứng minh.
• Cách trình bày suy luận theo từng bước trở thành mẫu mực cho tư duy toán học.

DI SẢN
• Elements được sử dụng trong giảng dạy suốt nhiều thế kỷ; rất ít thông tin chắc chắn còn lưu lại về cuộc đời Euclid.`,
    `Euclid (flourished c. 300 BC) was a Greek mathematician associated with the city of Alexandria.

MATHEMATICS
• His Elements organized geometry and arithmetic through definitions, axioms, and proofs.
• Its step-by-step reasoning became a model for mathematical thought.

LEGACY
• The Elements was used in teaching for centuries; few reliable details survive about Euclid's life.`,
  ),
  historicalStatue(
    "herodotus",
    "Herodotus",
    "Herodotus",
    "common",
    "Nhà sử học Hy Lạp, tác giả bộ Histories về các cuộc chiến Hy Lạp–Ba Tư.",
    `Herodotus (khoảng 484–425 TCN) là nhà sử học Hy Lạp cổ đại, sinh tại Halicarnassus.

TÁC PHẨM
• Bộ Histories thuật lại nguồn gốc và diễn biến của các cuộc chiến giữa người Hy Lạp và Ba Tư.
• Ông ghi chép phong tục, địa lý và câu chuyện của nhiều dân tộc mà mình tìm hiểu.

DI SẢN
• Herodotus thường được gọi là “cha đẻ của lịch sử” nhờ nỗ lực khảo cứu và kể lại quá khứ.`,
    `Herodotus (c. 484–425 BC) was an ancient Greek historian born in Halicarnassus.

WORKS
• His Histories recount the origins and course of the conflicts between Greeks and Persians.
• He recorded customs, geography, and stories of many peoples he investigated.

LEGACY
• Herodotus is often called the “father of history” for his efforts to investigate and narrate the past.`,
  ),
  historicalStatue(
    "pericles",
    "Pericles",
    "Pericles",
    "common",
    "Chính khách Athens, gắn với thời kỳ hoàng kim và các công trình lớn của thành bang.",
    `Pericles (khoảng 495–429 TCN) là chính khách và nhà hùng biện Athens trong thế kỷ 5 TCN.

LÃNH ĐẠO ATHENS
• Ông có ảnh hưởng lớn đến nền dân chủ Athens và thời kỳ thành bang phát triển rực rỡ.
• Dưới sự lãnh đạo của ông, nhiều công trình lớn trên Acropolis được xây dựng.

DI SẢN
• Thời đại Pericles để lại dấu ấn lâu dài trong nghệ thuật, kiến trúc và đời sống chính trị Hy Lạp.`,
    `Pericles (c. 495–429 BC) was an Athenian statesman and orator of the fifth century BC.

LEADERSHIP
• He strongly influenced Athenian democracy and the city's period of cultural growth.
• Major buildings on the Acropolis were constructed during his leadership.

LEGACY
• The age of Pericles left a lasting mark on Greek art, architecture, and political life.`,
  ),
  historicalStatue(
    "demosthenes",
    "Demosthenes",
    "Demosthenes",
    "common",
    "Nhà hùng biện Athens, nổi tiếng với các bài diễn văn chống sự bành trướng của Macedonia.",
    `Demosthenes (384–322 TCN) là nhà hùng biện và chính khách Athens.

SỰ NGHIỆP
• Ông nổi tiếng với các bài diễn văn Philippic cảnh báo về quyền lực ngày càng tăng của Philip II xứ Macedonia.
• Ông tham gia đời sống chính trị Athens trong giai đoạn thành bang mất dần quyền tự chủ.

DI SẢN
• Demosthenes được xem là một trong những nhà hùng biện vĩ đại nhất của Hy Lạp cổ đại.`,
    `Demosthenes (384–322 BC) was an Athenian orator and statesman.

CAREER
• His Philippic speeches warned about the growing power of Philip II of Macedon.
• He took part in Athenian politics as the city-state gradually lost its independence.

LEGACY
• Demosthenes is regarded as one of the greatest orators of ancient Greece.`,
  ),
  historicalStatue(
    "virgil",
    "Virgil",
    "Virgil",
    "common",
    "Nhà thơ La Mã, tác giả sử thi Aeneid.",
    `Publius Vergilius Maro, thường gọi là Virgil (70–19 TCN), là nhà thơ La Mã thời Augustus.

TÁC PHẨM
• Aeneid kể hành trình của Aeneas và huyền thoại về nguồn gốc của người La Mã.
• Các tác phẩm khác gồm Bucolics và Georgics, viết về đồng quê và nông nghiệp.

DI SẢN
• Aeneid trở thành sử thi quốc gia của La Mã và là tác phẩm kinh điển của văn học Latin.`,
    `Publius Vergilius Maro, known as Virgil (70–19 BC), was a Roman poet of the Augustan age.

WORKS
• The Aeneid tells of Aeneas's journey and the legendary origins of the Roman people.
• His other works include the pastoral Bucolics and the Georgics on rural life and farming.

LEGACY
• The Aeneid became Rome's national epic and a classic of Latin literature.`,
  ),
  historicalStatue(
    "seneca",
    "Seneca",
    "Seneca",
    "common",
    "Triết gia Khắc kỷ và nhà viết kịch La Mã.",
    `Seneca (khoảng 4 TCN–65 SCN) là triết gia Khắc kỷ, nhà hùng biện và nhà viết kịch La Mã.

CUỘC ĐỜI VÀ TÁC PHẨM
• Ông từng làm cố vấn cho Hoàng đế Nero và viết các tiểu luận, thư từ về đạo đức.
• Các tác phẩm của ông bàn về thời gian, lòng can đảm, sự tự chủ và cách đối diện nghịch cảnh.

DI SẢN
• Những trước tác của Seneca là một nguồn quan trọng của triết học Khắc kỷ La Mã.`,
    `Seneca (c. 4 BC–AD 65) was a Roman Stoic philosopher, orator, and playwright.

LIFE AND WORKS
• He served as an adviser to Emperor Nero and wrote essays and letters on ethics.
• His works discuss time, courage, self-control, and facing adversity.

LEGACY
• Seneca's writings are a major source for the study of Roman Stoicism.`,
  ),
  historicalStatue(
    "ptolemy",
    "Ptolemy",
    "Ptolemy",
    "common",
    "Nhà thiên văn và địa lý học thời La Mã, tác giả Almagest.",
    `Claudius Ptolemy (khoảng 100–170 SCN) là nhà thiên văn, toán học và địa lý học hoạt động tại Alexandria.

NGHIÊN CỨU
• Almagest tổng hợp mô hình địa tâm và các phương pháp tính toán chuyển động thiên thể.
• Tác phẩm Geography hệ thống hóa kiến thức địa lý và tọa độ của thế giới cổ đại.

DI SẢN
• Các mô hình của Ptolemy ảnh hưởng đến thiên văn học và địa lý học trong nhiều thế kỷ.`,
    `Claudius Ptolemy (c. AD 100–170) was an astronomer, mathematician, and geographer working in Alexandria.

RESEARCH
• The Almagest presented a geocentric model and mathematical methods for describing celestial motion.
• His Geography organized ancient knowledge of places and coordinates.

LEGACY
• Ptolemy's models influenced astronomy and geography for many centuries.`,
  ),
  historicalStatue(
    "charlemagne",
    "Charlemagne",
    "Charlemagne",
    "common",
    "Vua người Frank và hoàng đế, người thống nhất phần lớn Tây Âu thời Trung cổ.",
    `Charlemagne (khoảng 747–814) là vua người Frank và Hoàng đế La Mã, cai trị phần lớn Tây Âu.

TRỊ VÌ
• Ông mở rộng vương quốc Frank qua nhiều chiến dịch và được Giáo hoàng trao vương miện hoàng đế năm 800.
• Triều đình thúc đẩy giáo dục, sao chép sách và cải cách hành chính.

DI SẢN
• Những hoạt động văn hóa dưới thời ông thường được gọi là Phục Hưng Carolingian.`,
    `Charlemagne (c. 747–814) was a Frankish king and emperor who ruled much of Western Europe.

REIGN
• He expanded the Frankish realm through campaigns and was crowned emperor by the pope in 800.
• His court encouraged education, manuscript copying, and administrative reforms.

LEGACY
• The cultural activity of his era is often called the Carolingian Renaissance.`,
  ),
  historicalStatue(
    "avicenna",
    "Avicenna",
    "Avicenna",
    "common",
    "Thầy thuốc và triết gia Ba Tư, tác giả Canon of Medicine.",
    `Avicenna (980–1037), tên Ba Tư Ibn Sina, là thầy thuốc, triết gia và học giả lớn của thế giới Hồi giáo.

TÁC PHẨM
• Canon of Medicine hệ thống hóa kiến thức y học và được sử dụng trong nhiều thế kỷ.
• Book of Healing khảo luận về logic, khoa học tự nhiên, toán học và triết học.

DI SẢN
• Avicenna góp phần truyền tải và phát triển tri thức Hy Lạp, Ba Tư và Hồi giáo.`,
    `Avicenna (980–1037), known in Persian as Ibn Sina, was a major physician, philosopher, and scholar of the Islamic world.

WORKS
• The Canon of Medicine organized medical knowledge and was used for centuries.
• The Book of Healing addressed logic, natural science, mathematics, and philosophy.

LEGACY
• Avicenna helped transmit and develop Greek, Persian, and Islamic knowledge.`,
  ),
  historicalStatue(
    "marco-polo",
    "Marco Polo",
    "Marco Polo",
    "common",
    "Nhà thám hiểm và thương nhân Venice, nổi tiếng với tường thuật về châu Á.",
    `Marco Polo (1254–1324) là nhà thám hiểm và thương nhân đến từ Venice.

HÀNH TRÌNH
• Ông đi qua nhiều vùng của châu Á cùng cha và chú, và theo tường thuật của mình đã phục vụ tại triều đình Hốt Tất Liệt.
• Những câu chuyện về hành trình được ghi lại trong cuốn sách thường gọi là The Travels of Marco Polo.

DI SẢN
• Tác phẩm của ông góp phần mở rộng hiểu biết của độc giả châu Âu về các vùng đất phía Đông.`,
    `Marco Polo (1254–1324) was an explorer and merchant from Venice.

JOURNEYS
• He traveled across parts of Asia with his father and uncle and, according to his account, served at the court of Kublai Khan.
• Stories of his journeys were recorded in the book commonly known as The Travels of Marco Polo.

LEGACY
• His account broadened European readers' knowledge of lands farther east.`,
  ),
  historicalStatue(
    "johannes-gutenberg",
    "Johannes Gutenberg",
    "Gutenberg",
    "common",
    "Thợ in Đức, người phát triển kỹ thuật in chữ rời bằng kim loại ở châu Âu.",
    `Johannes Gutenberg (khoảng 1400–1468) là thợ kim hoàn và nhà phát minh người Đức, gắn với sự phát triển của kỹ thuật in ở châu Âu.

ĐỔI MỚI
• Ông kết hợp chữ rời bằng kim loại, mực in và máy ép để tạo quy trình in hiệu quả.
• Kinh Gutenberg là một trong những ấn phẩm lớn đầu tiên được in bằng kỹ thuật này.

DI SẢN
• Máy in giúp sách được sản xuất rộng rãi hơn và thúc đẩy sự lan truyền tri thức.`,
    `Johannes Gutenberg (c. 1400–1468) was a German metalworker and inventor associated with the development of printing in Europe.

INNOVATION
• He combined movable metal type, printing ink, and a press into an effective printing process.
• The Gutenberg Bible was among the first major books produced with this method.

LEGACY
• Printing made books more widely available and accelerated the spread of knowledge.`,
  ),
  historicalStatue(
    "erasmus",
    "Erasmus",
    "Erasmus",
    "common",
    "Nhà nhân văn Hà Lan thời Phục Hưng, học giả kinh điển và nhà thần học.",
    `Desiderius Erasmus (1466–1536) là học giả và nhà nhân văn Hà Lan thời Phục Hưng.

HỌC THUẬT
• Ông biên tập các văn bản cổ điển và xuất bản bản Tân Ước tiếng Hy Lạp cùng bản dịch Latin.
• Tác phẩm Trò ca ngợi sự điên rồ dùng châm biếm để bàn về xã hội và giáo hội.

DI SẢN
• Erasmus thúc đẩy giáo dục nhân văn và việc nghiên cứu văn bản gốc ở châu Âu.`,
    `Desiderius Erasmus (1466–1536) was a Dutch Renaissance scholar and humanist.

SCHOLARSHIP
• He edited classical texts and published a Greek New Testament alongside a Latin translation.
• In Praise of Folly used satire to comment on society and the Church.

LEGACY
• Erasmus advanced humanist education and the study of original texts in Europe.`,
  ),
  historicalStatue(
    "francis-bacon",
    "Francis Bacon",
    "Francis Bacon",
    "common",
    "Triết gia và chính khách Anh, người cổ vũ phương pháp thực nghiệm.",
    `Francis Bacon (1561–1626) là triết gia, chính khách và nhà văn người Anh.

TƯ TƯỞNG
• Trong Novum Organum, ông kêu gọi xây dựng tri thức qua quan sát, thí nghiệm và quy nạp.
• Ông cho rằng cần nhận diện những định kiến có thể làm sai lệch quá trình tìm hiểu tự nhiên.

DI SẢN
• Các quan điểm của Bacon thường được xem là một phần quan trọng trong sự phát triển của khoa học thực nghiệm.`,
    `Francis Bacon (1561–1626) was an English philosopher, statesman, and writer.

IDEAS
• In Novum Organum, he argued for building knowledge through observation, experiment, and induction.
• He urged investigators to recognize biases that can distort the study of nature.

LEGACY
• Bacon's ideas are often considered an important influence on the development of empirical science.`,
  ),
  historicalStatue(
    "rene-descartes",
    "René Descartes",
    "Descartes",
    "common",
    "Triết gia và nhà toán học Pháp, người có câu nói nổi tiếng “Tôi tư duy, nên tôi tồn tại”.",
    `René Descartes (1596–1650) là triết gia, nhà toán học và nhà khoa học người Pháp.

TƯ TƯỞNG VÀ TOÁN HỌC
• Câu “Tôi tư duy, nên tôi tồn tại” thể hiện điểm khởi đầu trong phương pháp hoài nghi của ông.
• Ông góp phần phát triển hình học giải tích, kết nối đại số với hình học.

DI SẢN
• Descartes có ảnh hưởng lớn đến triết học hiện đại và toán học châu Âu.`,
    `René Descartes (1596–1650) was a French philosopher, mathematician, and scientist.

IDEAS AND MATHEMATICS
• “I think, therefore I am” expresses a starting point of his method of doubt.
• He helped develop analytic geometry, connecting algebra with geometry.

LEGACY
• Descartes had a major influence on modern philosophy and European mathematics.`,
  ),
  historicalStatue(
    "rembrandt",
    "Rembrandt",
    "Rembrandt",
    "common",
    "Họa sĩ và nghệ sĩ khắc tranh Hà Lan thời Hoàng kim.",
    `Rembrandt van Rijn (1606–1669) là họa sĩ và nghệ sĩ khắc tranh người Hà Lan.

NGHỆ THUẬT
• Ông nổi tiếng với chân dung, tranh tự họa và cách sử dụng ánh sáng giàu kịch tính.
• Tác phẩm nổi bật gồm The Night Watch và nhiều cảnh lịch sử, tôn giáo.

DI SẢN
• Rembrandt được xem là một trong những nghệ sĩ lớn nhất của thời kỳ Hoàng kim Hà Lan.`,
    `Rembrandt van Rijn (1606–1669) was a Dutch painter and printmaker.

ART
• He is known for portraits, self-portraits, and dramatic use of light.
• Notable works include The Night Watch and many historical and religious scenes.

LEGACY
• Rembrandt is regarded as one of the greatest artists of the Dutch Golden Age.`,
  ),
  historicalStatue(
    "johann-sebastian-bach",
    "Johann Sebastian Bach",
    "J. S. Bach",
    "common",
    "Nhà soạn nhạc Đức thời Baroque, nổi tiếng với các tác phẩm đối âm và hợp xướng.",
    `Johann Sebastian Bach (1685–1750) là nhà soạn nhạc và nghệ sĩ đàn phím người Đức thời Baroque.

ÂM NHẠC
• Ông sáng tác nhạc nhà thờ, hợp xướng, concerto, fugue và nhiều tác phẩm cho đàn organ.
• Các tác phẩm nổi tiếng gồm Brandenburg Concertos và Mass cung Si thứ.

DI SẢN
• Nghệ thuật đối âm của Bach ảnh hưởng sâu sắc đến nhiều thế hệ nhà soạn nhạc.`,
    `Johann Sebastian Bach (1685–1750) was a German Baroque composer and keyboard player.

MUSIC
• He wrote sacred music, choral works, concertos, fugues, and numerous organ pieces.
• Notable works include the Brandenburg Concertos and the Mass in B minor.

LEGACY
• Bach's contrapuntal craft profoundly influenced generations of composers.`,
  ),
  historicalStatue(
    "johann-wolfgang-von-goethe",
    "Johann Wolfgang von Goethe",
    "Goethe",
    "common",
    "Nhà văn Đức, tác giả Faust và Nỗi đau của chàng Werther trẻ.",
    `Johann Wolfgang von Goethe (1749–1832) là nhà văn, nhà thơ và nhà tư tưởng người Đức.

TÁC PHẨM
• Nỗi đau của chàng Werther trẻ tạo tiếng vang khắp châu Âu.
• Faust là tác phẩm kịch thơ lớn mà ông dành phần lớn cuộc đời để hoàn thiện.

DI SẢN
• Goethe có đóng góp quan trọng cho văn học Đức và phong trào Cổ điển Weimar.`,
    `Johann Wolfgang von Goethe (1749–1832) was a German writer, poet, and thinker.

WORKS
• The Sorrows of Young Werther became a sensation across Europe.
• Faust was a major dramatic poem that he worked on for much of his life.

LEGACY
• Goethe made major contributions to German literature and Weimar Classicism.`,
  ),
  historicalStatue(
    "victor-hugo",
    "Victor Hugo",
    "Victor Hugo",
    "common",
    "Nhà văn Pháp, tác giả Những người khốn khổ và Nhà thờ Đức Bà Paris.",
    `Victor Hugo (1802–1885) là nhà văn, nhà thơ và chính khách người Pháp.

TÁC PHẨM VÀ HOẠT ĐỘNG
• Các tiểu thuyết nổi tiếng gồm Nhà thờ Đức Bà Paris và Những người khốn khổ.
• Ông từng sống lưu vong vì phản đối chế độ của Napoléon III và lên tiếng về các vấn đề xã hội.

DI SẢN
• Hugo là một trong những gương mặt trung tâm của chủ nghĩa Lãng mạn Pháp.`,
    `Victor Hugo (1802–1885) was a French writer, poet, and statesman.

WORKS AND PUBLIC LIFE
• His best-known novels include The Hunchback of Notre-Dame and Les Misérables.
• He lived in exile in opposition to Napoleon III and wrote about social issues.

LEGACY
• Hugo was one of the central figures of French Romanticism.`,
  ),
  historicalStatue(
    "sun-tzu",
    "Tôn Tử",
    "Tôn Tử",
    "common",
    "Nhà binh pháp Trung Hoa cổ đại, được gắn với tác phẩm Binh pháp Tôn Tử.",
    `Tôn Tử, thường được đặt vào khoảng thế kỷ 5 TCN, là nhà binh pháp Trung Hoa cổ đại; nhiều chi tiết về cuộc đời ông còn được tranh luận.

BINH PHÁP
• Binh pháp Tôn Tử bàn về chiến lược, tình báo, địa hình, kỷ luật và cách đạt mục tiêu với tổn thất thấp.
• Tác phẩm nhấn mạnh việc hiểu rõ đối phương, bản thân và hoàn cảnh trước khi giao chiến.

DI SẢN
• Binh pháp Tôn Tử được nghiên cứu trong quân sự, quản trị và chiến lược ở nhiều nơi trên thế giới.`,
    `Sun Tzu, traditionally placed around the 5th century BC, was an ancient Chinese military strategist; many details of his life remain debated.

STRATEGY
• The Art of War discusses planning, intelligence, terrain, discipline, and achieving objectives with minimal cost.
• It emphasizes understanding both the opponent and one's own situation before engaging.

LEGACY
• The Art of War is studied in military affairs, management, and strategy around the world.`,
  ),
];

const historicalQuotes: Record<
  string,
  { quote: string; quoteSource: string }
> = {
  "julius-caesar-marble": {
    quote: "Veni, vidi, vici.",
    quoteSource: "Plutarch, Life of Caesar (reported)",
  },
  "isaac-newton-marble": {
    quote: "If I have seen further, it is by standing on the shoulders of giants.",
    quoteSource: "Letter to Robert Hooke (1675)",
  },
  "socrates-marble": {
    quote: "The unexamined life is not worth living.",
    quoteSource: "Plato, Apology 38a",
  },
  "aristotle-marble": {
    quote: "The whole is greater than the sum of its parts.",
    quoteSource: "Metaphysics (translation)",
  },
  "archimedes-marble": {
    quote: "Give me a place to stand, and I will move the Earth.",
    quoteSource: "Pappus of Alexandria (attributed)",
  },
  "cleopatra-vii-marble": {
    quote: "I will not be triumphed over.",
    quoteSource: "Shakespeare, Antony and Cleopatra (dramatic)",
  },
  "augustus-marble": {
    quote: "I found Rome a city of bricks and left it a city of marble.",
    quoteSource: "Suetonius, The Deified Augustus 28 (reported)",
  },
  "confucius-marble": {
    quote: "Is it not a pleasure to learn and practice what is learned?",
    quoteSource: "Analects 1.1 (translated)",
  },
  "michelangelo-marble": {
    quote: "The best of artists has no conception that the marble does not contain.",
    quoteSource: "Sonnet 151 (translated excerpt)",
  },
  "william-shakespeare-marble": {
    quote: "All the world's a stage, and all the men and women merely players.",
    quoteSource: "As You Like It, Act II, Scene VII",
  },
  "galileo-galilei-marble": {
    quote: "The book of nature is written in the language of mathematics.",
    quoteSource: "The Assayer (1623, translated)",
  },
  "plato-marble": {
    quote: "Until philosophers are kings, cities will have no rest from evils.",
    quoteSource: "Republic, Book V (translated excerpt)",
  },
  "pythagoras-marble": {
    quote: "Number is the ruler of forms and ideas.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "hippocrates-marble": {
    quote: "Life is short; the art long.",
    quoteSource: "Aphorisms 1.1 (translated)",
  },
  "homer-marble": {
    quote: "Sing, goddess, the anger of Achilles.",
    quoteSource: "Iliad 1.1 (translated)",
  },
  "cicero-marble": {
    quote: "The life of the dead is placed in the memory of the living.",
    quoteSource: "Philippics 9.10 (translated)",
  },
  "hannibal-marble": {
    quote: "We will either find a way, or make one.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "dante-alighieri-marble": {
    quote: "The love that moves the sun and the other stars.",
    quoteSource: "Divine Comedy, Paradiso XXXIII (translated)",
  },
  "nicolaus-copernicus-marble": {
    quote: "In the midst of all sits the Sun.",
    quoteSource: "On the Revolutions, Book I, chapter 10 (translated)",
  },
  "johannes-kepler-marble": {
    quote: "Geometry is one and eternal, shining in the mind of God.",
    quoteSource: "Mysterium Cosmographicum (translated)",
  },
  "voltaire-marble": {
    quote: "We must cultivate our garden.",
    quoteSource: "Candide, chapter 30 (translated)",
  },
  "charles-darwin-marble": {
    quote: "There is grandeur in this view of life.",
    quoteSource: "On the Origin of Species, chapter 14",
  },
  "ludwig-van-beethoven-marble": {
    quote: "Music is a higher revelation than all wisdom and philosophy.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "wolfgang-amadeus-mozart-marble": {
    quote: "The music is not in the notes, but in the silence between.",
    quoteSource: "Commonly attributed; source uncertain",
  },
  "george-washington-marble": {
    quote: "Observe good faith and justice toward all nations.",
    quoteSource: "Farewell Address (1796)",
  },
  "euclid-marble": {
    quote: "There is no royal road to geometry.",
    quoteSource: "Proclus, Commentary on Euclid (anecdote)",
  },
  "herodotus-marble": {
    quote: "My purpose is to prevent the traces of human events from being erased by time.",
    quoteSource: "Histories 1.1 (translated)",
  },
  "pericles-marble": {
    quote: "Our constitution is called a democracy because power is in the hands of the many.",
    quoteSource: "Thucydides, History of the Peloponnesian War 2.37",
  },
  "demosthenes-marble": {
    quote: "Nothing is easier than self-deceit.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "virgil-marble": {
    quote: "Fortune favors the bold.",
    quoteSource: "Aeneid 10.284 (translated)",
  },
  "seneca-marble": {
    quote: "It is not that we have a short time to live, but that we waste much of it.",
    quoteSource: "On the Shortness of Life 1.1 (translated)",
  },
  "ptolemy-marble": {
    quote: "I know that I am mortal and ephemeral.",
    quoteSource: "Almagest (translated, attributed)",
  },
  "charlemagne-marble": {
    quote: "To have another language is to possess a second soul.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "avicenna-marble": {
    quote: "Knowledge is not complete unless it is known by its causes.",
    quoteSource: "Book of Healing (paraphrase)",
  },
  "marco-polo-marble": {
    quote: "I have not told half of what I saw.",
    quoteSource: "Reported on his deathbed; source uncertain",
  },
  "johannes-gutenberg-marble": {
    quote: "And God said, “Let there be light.”",
    quoteSource: "Gutenberg Bible, Genesis 1:3 (printed text, not his words)",
  },
  "erasmus-marble": {
    quote: "In the land of the blind, the one-eyed man is king.",
    quoteSource: "Adages (1500, translated)",
  },
  "francis-bacon-marble": {
    quote: "Knowledge itself is power.",
    quoteSource: "Meditationes Sacrae (1597, translated)",
  },
  "rene-descartes-marble": {
    quote: "I think, therefore I am.",
    quoteSource: "Discourse on Method (1637, translated)",
  },
  "rembrandt-marble": {
    quote: "Choose only one master—Nature.",
    quoteSource: "Commonly attributed; source uncertain",
  },
  "johann-sebastian-bach-marble": {
    quote: "The aim of all music should be the glory of God.",
    quoteSource: "Traditionally attributed; source uncertain",
  },
  "johann-wolfgang-von-goethe-marble": {
    quote: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    quoteSource: "Wilhelm Meister's Journeyman Years (translated)",
  },
  "victor-hugo-marble": {
    quote: "Even the darkest night will end and the sun will rise.",
    quoteSource: "Les Misérables (translated)",
  },
  "sun-tzu-marble": {
    quote: "Know the enemy and know yourself; you need not fear the result.",
    quoteSource: "The Art of War, chapter 3 (translated)",
  },
};

const historicalPortraitSources: Record<
  string,
  Pick<
    CollectionArtwork,
    "sourceLabel" | "portraitSourceType" | "portraitSourceUrl"
  >
> = {
  "julius-caesar-marble": {
    sourceLabel: "Tượng chân dung Capitoline",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Retrato_de_Julio_C%C3%A9sar_(26724093101)_(cropped).jpg",
  },
  "isaac-newton-marble": {
    sourceLabel: "Chân dung Newton năm 1689",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Portrait_of_Sir_Isaac_Newton,_1689_(brightened).jpg",
  },
  "socrates-marble": {
    sourceLabel: "Tượng bán thân Socrates tại Louvre",
    portraitSourceType: "later-portrait",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Socrates_Louvre.jpg",
  },
  "aristotle-marble": {
    sourceLabel: "Tượng bán thân Aristotle tại Bảo tàng Acropolis",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://www.theacropolismuseum.gr/en/bust-aristotle",
  },
  "archimedes-marble": {
    sourceLabel: "Lịch sử chân dung Archimedes",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl:
      "https://exhibits.museogalileo.it/archimedes/section/Portrait.html",
  },
  "cleopatra-vii-marble": {
    sourceLabel: "Các chân dung còn lại của Cleopatra",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://www.britannica.com/story/what-did-cleopatra-look-like",
  },
  "augustus-marble": {
    sourceLabel: "Tượng Augustus tại Bảo tàng Nghệ thuật Metropolitan",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://www.metmuseum.org/art/collection/search/247993",
  },
  "confucius-marble": {
    sourceLabel: "Nghiên cứu về hình tượng Khổng Tử",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl: "https://academic.oup.com/edited-volume/45499/chapter/392458224",
  },
  "michelangelo-marble": {
    sourceLabel: "Chân dung Michelangelo của Daniele da Volterra",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Michelangelo_Daniele_da_Volterra_(dettaglio).jpg",
  },
  "william-shakespeare-marble": {
    sourceLabel: "Chân dung Shakespeare của John Taylor",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:William_Shakespeare_by_John_Taylor,_edited.jpg",
  },
  "galileo-galilei-marble": {
    sourceLabel: "Chân dung Galileo tại Royal Museums Greenwich",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://www.rmg.co.uk/collections/objects/rmgc-object-63964",
  },
  "plato-marble": {
    sourceLabel: "Tượng chân dung Plato tại Capitoline",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Plato_Silanion_Musei_Capitolini_MC1377.png",
  },
  "pythagoras-marble": {
    sourceLabel: "Tượng Pythagoras tại Roman Forum",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Pythagoras_in_the_Roman_Forum,_Colosseum.jpg",
  },
  "hippocrates-marble": {
    sourceLabel: "Hình tượng truyền thống của Hippocrates",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Hippocrates.jpg",
  },
  "homer-marble": {
    sourceLabel: "Tượng bán thân Homer tại Bảo tàng Anh",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Homer_At_the_British_Museum_2024_(3x4_cropped).jpg",
  },
  "cicero-marble": {
    sourceLabel: "Chân dung Cicero tại Galleria Borghese",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://www.collezionegalleriaborghese.it/en/opere/portrait-of-cicero",
  },
  "hannibal-marble": {
    sourceLabel: "Tư liệu về các hình tượng Hannibal",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl: "https://www.britannica.com/biography/Hannibal-Carthaginian-general",
  },
  "dante-alighieri-marble": {
    sourceLabel: "Tượng bán thân Dante tại V&A",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://collections.vam.ac.uk/item/O166402/dante-alighieri-bust-unknown/",
  },
  "nicolaus-copernicus-marble": {
    sourceLabel: "Chân dung Copernicus thế kỷ 16",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Nikolaus_Kopernikus_MOT.jpg",
  },
  "johannes-kepler-marble": {
    sourceLabel: "Chân dung Johannes Kepler",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:JKepler.jpg",
  },
  "voltaire-marble": {
    sourceLabel: "Chân dung Voltaire của Nicolas de Largillière",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Nicolas_de_Largilli%C3%A8re_-_Portrait_de_Voltaire_(1694-1778)_en_1718_-_P208_-_mus%C3%A9e_Carnavalet_-_5_(cropped).jpg",
  },
  "charles-darwin-marble": {
    sourceLabel: "Ảnh chân dung Charles Darwin",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Charles_Darwin_seated_crop.jpg",
  },
  "ludwig-van-beethoven-marble": {
    sourceLabel: "Chân dung Beethoven của Joseph Karl Stieler",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Joseph_Karl_Stieler%27s_Beethoven_mit_dem_Manuskript_der_Missa_solemnis.jpg",
  },
  "wolfgang-amadeus-mozart-marble": {
    sourceLabel: "Chân dung Mozart trong tranh gia đình",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:The_Mozart_Family_-_Wolfgang_Amadeus_Mozart_headshot.jpg",
  },
  "george-washington-marble": {
    sourceLabel: "Chân dung tại Phòng trưng bày Chân dung Quốc gia Smithsonian",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://georgewashington.si.edu/portrait/index.html",
  },
  "euclid-marble": {
    sourceLabel: "Hình tượng Euclid tại Getty",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl: "https://www.getty.edu/art/collection/object/108GV4",
  },
  "herodotus-marble": {
    sourceLabel: "Tượng bán thân Herodotus tại Bảo tàng Nghệ thuật Metropolitan",
    portraitSourceType: "later-portrait",
    portraitSourceUrl: "https://www.metmuseum.org/art/collection/search/245829",
  },
  "pericles-marble": {
    sourceLabel: "Tượng chân dung Pericles tại Bảo tàng Vatican",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Pericles_Pio-Clementino_Inv269_n2.jpg",
  },
  "demosthenes-marble": {
    sourceLabel: "Tượng chân dung Demosthenes tại Getty",
    portraitSourceType: "later-portrait",
    portraitSourceUrl: "https://www.getty.edu/art/collection/object/103WJB",
  },
  "virgil-marble": {
    sourceLabel: "Khảm chân dung Virgil tại Bảo tàng Bardo",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Virgil_mosaic_in_the_Bardo_National_Museum_(Tunis)_(12241228546).jpg",
  },
  "seneca-marble": {
    sourceLabel: "Tư liệu về chân dung Seneca",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl:
      "https://www.britannica.com/biography/Lucius-Annaeus-Seneca",
  },
  "ptolemy-marble": {
    sourceLabel: "Hình minh họa Ptolemy năm 1476",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Ptolemy_1476_with_armillary_sphere_model.jpg",
  },
  "charlemagne-marble": {
    sourceLabel: "Đồng denier thời Charlemagne",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Charlemagne_denier_Mayence_812_814.jpg",
  },
  "avicenna-marble": {
    sourceLabel: "Tư liệu chân dung Avicenna tại Thư viện Y khoa Quốc gia Hoa Kỳ",
    portraitSourceType: "later-portrait",
    portraitSourceUrl: "https://resource.nlm.nih.gov/101408284",
  },
  "marco-polo-marble": {
    sourceLabel: "Minh họa trong ấn bản năm 1477",
    portraitSourceType: "later-portrait",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Frontispice_%C3%A9dition_de_Nuremberg_1477_(cropped).png",
  },
  "johannes-gutenberg-marble": {
    sourceLabel: "Tượng Gutenberg tại Mainz",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Mainz_Gutenbergdenkmal_2016_(cropped).jpg",
  },
  "erasmus-marble": {
    sourceLabel: "Chân dung Erasmus của Hans Holbein",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://www.metmuseum.org/art/collection/search/336231",
  },
  "francis-bacon-marble": {
    sourceLabel: "Chân dung Francis Bacon của John de Critz",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Somer_Francis_Bacon.jpg",
  },
  "rene-descartes-marble": {
    sourceLabel: "Chân dung René Descartes của Frans Hals",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Frans_Hals_-_Portret_van_Ren%C3%A9_Descartes.jpg",
  },
  "rembrandt-marble": {
    sourceLabel: "Tự họa của Rembrandt",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg",
  },
  "johann-sebastian-bach-marble": {
    sourceLabel: "Chân dung Bach của Elias Gottlob Haussmann",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Johann_Sebastian_Bach.jpg",
  },
  "johann-wolfgang-von-goethe-marble": {
    sourceLabel: "Chân dung Goethe của Joseph Karl Stieler",
    portraitSourceType: "contemporary",
    portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Goethe_(Stieler_1828).jpg",
  },
  "victor-hugo-marble": {
    sourceLabel: "Ảnh Victor Hugo năm 1876",
    portraitSourceType: "contemporary",
    portraitSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Victor_Hugo_in_1876_(49937840042).png",
  },
  "sun-tzu-marble": {
    sourceLabel: "Tư liệu về Tôn Tử",
    portraitSourceType: "uncertain-likeness",
    portraitSourceUrl: "https://www.britannica.com/biography/Sunzi",
  },
};

export const HISTORICAL_COLLECTION_ARTWORKS: CollectionArtwork[] =
  historicalStatues.map((statue) => {
    const quote = historicalQuotes[statue.imageAssetKey ?? ""];
    if (!quote) {
      throw new Error(`Missing famous quote for ${statue.title}.`);
    }
    const portraitSource = historicalPortraitSources[statue.imageAssetKey ?? ""];
    if (!portraitSource) {
      throw new Error(`Missing portrait source for ${statue.title}.`);
    }
    return { ...statue, ...portraitSource, ...quote };
  });
