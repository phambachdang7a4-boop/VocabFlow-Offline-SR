import type { CollectionArtwork } from "./collection-artworks";
import type { ChestRarity } from "./mission-chests";

function worldStatue(
  slug: string,
  name: string,
  shortTitle: string,
  rarity: ChestRarity,
  description: string,
  quote: string,
  quoteSource: string,
  biography: string,
  biographyEn: string,
): CollectionArtwork {
  return {
    // Keep rarity-prefixed IDs stable for saved collection records.
    id: `${rarity}-${slug}-marble`,
    // Common is no longer a displayed statue tier.
    rarity: rarity === "common" ? "rare" : rarity,
    title: `Tượng ${name}`,
    shortTitle,
    icon: "award",
    imageAssetKey: `${slug}-marble`,
    material: "Cẩm thạch",
    unlockMode: "automatic",
    description,
    biography,
    biographyEn,
    quote,
    quoteSource,
    sourceLabel: "Tượng nghệ thuật AI tái hiện; không phải chân dung xác thực.",
    portraitSourceType: "uncertain-likeness",
  };
}

export const WORLD_EXPANSION_STATUES: CollectionArtwork[] = [
  worldStatue(
    "albert-einstein",
    "Albert Einstein",
    "Einstein",
    "legendary",
    "Nhà vật lý lý thuyết có ảnh hưởng sâu rộng, nổi tiếng với thuyết tương đối.",
    "The important thing is not to stop questioning.",
    "LIFE Magazine interview with William Miller, May 2, 1955.",
    `Albert Einstein (1879–1955) là nhà vật lý lý thuyết sinh tại Đức, sau này làm việc ở Thụy Sĩ và Hoa Kỳ.

ĐÓNG GÓP
• Thuyết tương đối đã làm thay đổi cách khoa học mô tả không gian, thời gian và hấp dẫn.
• Ông nhận Nobel Vật lý năm 1921 nhờ giải thích hiệu ứng quang điện.`,
    `Albert Einstein (1879–1955) was a German-born theoretical physicist who later worked in Switzerland and the United States.

CONTRIBUTIONS
• His theories of relativity transformed scientific accounts of space, time, and gravity.
• He received the 1921 Nobel Prize in Physics for his explanation of the photoelectric effect.`,
  ),
  worldStatue(
    "mahatma-gandhi",
    "Mahatma Gandhi",
    "Gandhi",
    "legendary",
    "Luật sư và lãnh đạo phong trào độc lập Ấn Độ, gắn với đấu tranh bất bạo động.",
    "My life is my message.",
    "Often attributed to Gandhi; the exact primary-source wording is uncertain.",
    `Mahatma Gandhi (1869–1948) là luật sư và nhà hoạt động chính trị Ấn Độ, giữ vai trò nổi bật trong phong trào giành độc lập khỏi Anh.

ĐẤU TRANH
• Ông cổ vũ bất tuân dân sự và phản kháng bất bạo động, đồng thời tổ chức nhiều chiến dịch quần chúng.
• Gandhi bị ám sát tại Delhi năm 1948.`,
    `Mahatma Gandhi (1869–1948) was an Indian lawyer and political activist who became a leading figure in the independence movement from British rule.

ACTIVISM
• He advocated civil disobedience and nonviolent resistance and organized major mass campaigns.
• Gandhi was assassinated in Delhi in 1948.`,
  ),
  worldStatue(
    "marie-curie",
    "Marie Curie",
    "Marie Curie",
    "legendary",
    "Nhà vật lý và hóa học tiên phong trong nghiên cứu phóng xạ.",
    "Nothing in life is to be feared; it is only to be understood.",
    "Commonly attributed to Curie; the exact source and translation vary.",
    `Marie Curie (1867–1934) là nhà vật lý và hóa học người Ba Lan–Pháp, tiên phong nghiên cứu hiện tượng phóng xạ.

ĐÓNG GÓP
• Cùng Pierre Curie, bà phát hiện poloni và radi; công trình của bà góp phần hình thành vật lý hạt nhân.
• Bà là người đầu tiên nhận hai giải Nobel ở hai lĩnh vực khoa học khác nhau.`,
    `Marie Curie (1867–1934) was a Polish-French physicist and chemist who pioneered the study of radioactivity.

CONTRIBUTIONS
• With Pierre Curie, she discovered polonium and radium; her research helped shape nuclear physics.
• She was the first person to receive Nobel Prizes in two different scientific fields.`,
  ),
  worldStatue(
    "genghis-khan",
    "Thành Cát Tư Hãn",
    "Genghis Khan",
    "legendary",
    "Thủ lĩnh Mông Cổ thống nhất các bộ lạc và sáng lập đế quốc Mông Cổ.",
    "The greatest happiness is to crush your enemies before you.",
    "Commonly attributed to Genghis Khan; the original wording and source are uncertain.",
    `Thành Cát Tư Hãn (khoảng 1162–1227), tên khai sinh Temüjin, thống nhất nhiều bộ lạc Mông Cổ và được tôn làm đại hãn năm 1206.

DI SẢN
• Dưới thời ông và các thế hệ kế tiếp, đế quốc Mông Cổ mở rộng trên một vùng lãnh thổ rộng lớn khắp Á–Âu.
• Các cuộc chinh phục cũng gây tổn thất nặng nề cho nhiều thành thị và cộng đồng.`,
    `Genghis Khan (c. 1162–1227), born Temüjin, united Mongol tribes and was proclaimed Great Khan in 1206.

LEGACY
• Under him and later generations, the Mongol Empire expanded across a vast area of Eurasia.
• The conquests also caused severe destruction to many cities and communities.`,
  ),
  worldStatue(
    "nelson-mandela",
    "Nelson Mandela",
    "Mandela",
    "legendary",
    "Nhà hoạt động chống chế độ apartheid và tổng thống dân cử đầu tiên của Nam Phi.",
    "It always seems impossible until it's done.",
    "Popularly attributed to Mandela; a definitive primary source is unclear.",
    `Nelson Mandela (1918–2013) là nhà hoạt động chống apartheid và tổng thống Nam Phi từ năm 1994 đến 1999.

CUỘC ĐỜI
• Ông bị giam 27 năm vì hoạt động chính trị, sau đó tham gia đàm phán chuyển đổi sang nền dân chủ đa chủng tộc.
• Năm 1993, ông cùng F. W. de Klerk nhận Nobel Hòa bình.`,
    `Nelson Mandela (1918–2013) was an anti-apartheid activist and South Africa's president from 1994 to 1999.

LIFE
• Imprisoned for 27 years for his political activity, he later helped negotiate the transition to a multiracial democracy.
• He shared the 1993 Nobel Peace Prize with F. W. de Klerk.`,
  ),
  worldStatue(
    "ramses-ii",
    "Ramses II",
    "Ramses II",
    "epic",
    "Pharaoh de vương triều XIX, nổi tiếng với các công trình quy mô lớn ở Ai Cập.",
    "I am a king mighty in victory.",
    "Condensed translation of a royal boast in the Kadesh battle inscriptions.",
    `Ramses II (khoảng 1303–1213 TCN) là pharaoh thuộc vương triều XIX của Ai Cập cổ đại, trị vì khoảng 66 năm.

TRIỀU ĐẠI
• Ông cho xây dựng và mở rộng nhiều đền đài, trong đó có quần thể Abu Simbel.
• Trận Kadesh với người Hittite kết thúc bằng một hiệp ước hòa bình được lưu truyền rộng rãi.`,
    `Ramses II (c. 1303–1213 BC) was a pharaoh of Egypt's Nineteenth Dynasty who ruled for roughly 66 years.

REIGN
• He built or expanded many monuments, including the complex at Abu Simbel.
• His conflict with the Hittites at Kadesh was followed by a widely known peace treaty.`,
  ),
  worldStatue(
    "hatshepsut",
    "Hatshepsut",
    "Hatshepsut",
    "epic",
    "Nữ pharaoh thuộc vương triều XVIII, thúc đẩy thương mại và xây dựng đền đài.",
    "I have restored what was in ruins; I have raised up what was unfinished.",
    "Speos Artemidos inscription; translated excerpt.",
    `Hatshepsut (khoảng 1507–1458 TCN) là một trong những nữ pharaoh nổi bật nhất của Ai Cập, thuộc vương triều XVIII.

TRỊ VÌ
• Triều đại của bà gắn với các công trình lớn tại Deir el-Bahri và một chuyến giao thương tới vùng Punt.
• Nghệ thuật hoàng gia thường mô tả bà theo biểu tượng truyền thống của pharaoh.`,
    `Hatshepsut (c. 1507–1458 BC) was one of ancient Egypt's most prominent female pharaohs of the Eighteenth Dynasty.

REIGN
• Her reign is associated with major building projects at Deir el-Bahri and a trading expedition to Punt.
• Royal art often portrayed her using traditional pharaonic symbols.`,
  ),
  worldStatue(
    "ashoka",
    "Ashoka Đại đế",
    "Ashoka",
    "epic",
    "Hoàng đế Maurya chuyển sang cổ vũ lòng từ bi sau cuộc chiến Kalinga.",
    "All men are my children.",
    "Major Rock Edict VI; translated excerpt from the Prakrit inscription.",
    `Ashoka (khoảng 304–232 TCN) là hoàng đế thứ ba của đế quốc Maurya ở Nam Á.

TƯ TƯỞNG
• Sau cuộc chiến Kalinga, các sắc lệnh khắc đá của ông nhấn mạnh quản trị có đạo đức, lòng khoan dung và giảm bạo lực.
• Những văn bia này là nguồn tư liệu quan trọng về nhà nước Maurya và sự truyền bá Phật giáo.`,
    `Ashoka (c. 304–232 BC) was the third emperor of the Maurya Empire in South Asia.

IDEAS
• After the Kalinga War, his rock edicts emphasized ethical governance, tolerance, and reducing violence.
• These inscriptions are important evidence about the Mauryan state and the spread of Buddhism.`,
  ),
  worldStatue(
    "qin-shi-huang",
    "Tần Thủy Hoàng",
    "Qin Shi Huang",
    "epic",
    "Hoàng đế đầu tiên thống nhất phần lớn các nước chư hầu thành đế quốc Trung Hoa.",
    "The laws are made clear; all under Heaven is unified.",
    "Paraphrase of the Langya inscription; not a verbatim English translation.",
    `Tần Thủy Hoàng (259–210 TCN) thống nhất các nước thời Chiến Quốc và trở thành hoàng đế đầu tiên của nhà Tần năm 221 TCN.

CẢI CÁCH
• Triều đình chuẩn hóa một số hệ thống chữ viết, tiền tệ, đo lường và trục xe.
• Các dự án nối dài tường biên giới và lăng mộ binh mã đất nung gắn với triều đại của ông.`,
    `Qin Shi Huang (259–210 BC) unified the Warring States and became the first emperor of the Qin dynasty in 221 BC.

REFORMS
• His government standardized forms of writing, currency, measurement, and cart axles.
• Frontier wall projects and the Terracotta Army tomb complex are associated with his reign.`,
  ),
  worldStatue(
    "ibn-khaldun",
    "Ibn Khaldun",
    "Ibn Khaldun",
    "epic",
    "Sử gia và nhà tư tưởng Bắc Phi, nổi tiếng với tác phẩm Muqaddimah.",
    "The past resembles the future more than one drop of water resembles another.",
    "The Muqaddimah, Book I; translation wording varies.",
    `Ibn Khaldun (1332–1406) là sử gia, nhà tư tưởng và chính khách sinh tại Tunis, Bắc Phi.

TÁC PHẨM
• Muqaddimah mở đầu bộ sử của ông, phân tích xã hội, quyền lực, kinh tế và sự hình thành của các triều đại.
• Tác phẩm được xem là một đóng góp có ảnh hưởng lớn cho tư tưởng lịch sử và xã hội học.`,
    `Ibn Khaldun (1332–1406) was a historian, thinker, and statesman born in Tunis in North Africa.

WORK
• The Muqaddimah, an introduction to his history, analyzes society, power, economics, and the rise of dynasties.
• It is regarded as an influential contribution to historical and social thought.`,
  ),
  worldStatue(
    "saladin",
    "Saladin",
    "Saladin",
    "epic",
    "Sultan Ayyubid thống nhất Ai Cập và Syria, giành lại Jerusalem năm 1187.",
    "The greatest victory is to forgive an enemy.",
    "Frequently attributed to Saladin; the exact source is uncertain.",
    `Saladin (1137/1138–1193), tên là Salah ad-Din Yusuf, sáng lập triều Ayyubid và cai trị Ai Cập cùng Syria.

CHIẾN DỊCH
• Ông đánh bại quân Thập tự tại Hattin năm 1187 và giành lại Jerusalem.
• Các nguồn Hồi giáo và châu Âu thời sau thường nhắc đến ông như một nhà cai trị và chỉ huy quân sự đáng chú ý.`,
    `Saladin (1137/1138–1193), born Salah ad-Din Yusuf, founded the Ayyubid dynasty and ruled Egypt and Syria.

CAMPAIGNS
• He defeated Crusader forces at Hattin in 1187 and recaptured Jerusalem.
• Later Muslim and European sources remember him as a notable ruler and military commander.`,
  ),
  worldStatue(
    "joan-of-arc",
    "Joan of Arc",
    "Joan of Arc",
    "epic",
    "Nữ anh hùng Pháp thế kỷ XV, có vai trò trong giai đoạn then chốt của Chiến tranh Trăm Năm.",
    "I am not afraid; I was born to do this.",
    "Popular attribution; wording is not established as a verbatim trial-record quotation.",
    `Joan of Arc (khoảng 1412–1431) là nhân vật quân sự và tôn giáo người Pháp trong Chiến tranh Trăm Năm.

SỰ KIỆN
• Bà góp phần thúc đẩy quân Pháp giải vây Orléans năm 1429 và hỗ trợ lễ đăng quang của Charles VII.
• Bị xử tử năm 1431, bà được Giáo hội Công giáo phong thánh năm 1920.`,
    `Joan of Arc (c. 1412–1431) was a French military and religious figure during the Hundred Years' War.

EVENTS
• She helped encourage French forces during the 1429 relief of Orléans and supported Charles VII's coronation.
• Executed in 1431, she was canonized by the Catholic Church in 1920.`,
  ),
  worldStatue(
    "elizabeth-i",
    "Elizabeth I",
    "Elizabeth I",
    "epic",
    "Nữ hoàng Anh và Ireland, trị vì trong giai đoạn thường gọi là thời Elizabeth.",
    "I have the heart and stomach of a king.",
    "Speech to troops at Tilbury, 1588; wording preserved in contemporary accounts.",
    `Elizabeth I (1533–1603) trị vì Anh và Ireland từ năm 1558 đến 1603, thuộc triều đại Tudor.

TRIỀU ĐẠI
• Thời kỳ của bà chứng kiến sự phát triển của sân khấu Anh và các chuyến thám hiểm đường biển.
• Năm 1588, hạm đội Anh chống lại Armada Tây Ban Nha; thời tiết cũng góp phần vào kết quả.`,
    `Elizabeth I (1533–1603) ruled England and Ireland from 1558 to 1603 as a Tudor monarch.

REIGN
• Her era saw the growth of English theatre and overseas voyages.
• In 1588, English forces resisted the Spanish Armada, with weather also affecting the outcome.`,
  ),
  worldStatue(
    "ada-lovelace",
    "Ada Lovelace",
    "Ada Lovelace",
    "epic",
    "Nhà toán học Anh, được biết đến qua các ghi chú về máy phân tích của Babbage.",
    "The Analytical Engine has no pretensions whatever to originate anything.",
    "Notes by the Translator, Note G, 1843.",
    `Ada Lovelace (1815–1852) là nhà toán học người Anh, cộng tác với Charles Babbage về ý tưởng máy phân tích.

ĐÓNG GÓP
• Trong ghi chú năm 1843, bà mô tả cách máy có thể thao tác các ký hiệu và trình bày một thuật toán cho số Bernoulli.
• Vì vậy, bà thường được nhắc đến trong lịch sử lập trình máy tính thời kỳ đầu.`,
    `Ada Lovelace (1815–1852) was an English mathematician who worked on Charles Babbage's proposed Analytical Engine.

CONTRIBUTIONS
• In her 1843 notes, she described how the machine could manipulate symbols and laid out an algorithm for Bernoulli numbers.
• She is often discussed in histories of early computer programming.`,
  ),
  worldStatue(
    "nikola-tesla",
    "Nikola Tesla",
    "Nikola Tesla",
    "epic",
    "Nhà phát minh và kỹ sư người Serbia–Mỹ, có đóng góp lớn cho hệ thống điện xoay chiều.",
    "The present is theirs; the future, for which I really worked, is mine.",
    "My Inventions, serialized in Electrical Experimenter, 1919.",
    `Nikola Tesla (1856–1943) là nhà phát minh và kỹ sư sinh tại vùng nay thuộc Croatia, sau này làm việc tại Hoa Kỳ.

CÔNG NGHỆ
• Ông đóng góp vào động cơ cảm ứng và hệ thống điện xoay chiều nhiều pha.
• Các bằng sáng chế và công trình của Tesla ảnh hưởng đến việc truyền tải điện hiện đại.`,
    `Nikola Tesla (1856–1943) was an inventor and engineer born in what is now Croatia who later worked in the United States.

TECHNOLOGY
• He contributed to the induction motor and polyphase alternating-current systems.
• Tesla's patents and work influenced modern electric-power transmission.`,
  ),
  worldStatue(
    "hammurabi",
    "Hammurabi",
    "Hammurabi",
    "rare",
    "Vua Babylon cổ đại, gắn với bộ luật khắc trên bia đá còn được lưu giữ.",
    "Let the oppressed man who has a case come before my statue and read my inscription.",
    "Prologue to the Code of Hammurabi; translated excerpt.",
    `Hammurabi (trị vì khoảng 1792–1750 TCN) là vua Babylon, người mở rộng quyền lực của vương quốc tại Lưỡng Hà.

BỘ LUẬT
• Bộ luật Hammurabi được khắc trên bia đá, ghi lại các quy định về gia đình, tài sản, lao động và hình phạt.
• Đây là một trong những bộ luật cổ còn lưu lại, không phải bộ luật thành văn đầu tiên trong lịch sử.`,
    `Hammurabi (reigned c. 1792–1750 BC) was king of Babylon and expanded the kingdom's power in Mesopotamia.

CODE
• The Code of Hammurabi was carved on stone and records rules concerning family, property, labor, and penalties.
• It is one of the surviving ancient law collections, not the first written code in history.`,
  ),
  worldStatue(
    "cyrus-the-great",
    "Cyrus Đại đế",
    "Cyrus the Great",
    "rare",
    "Người sáng lập đế quốc Achaemenid Ba Tư, một trong những đế quốc lớn đầu tiên.",
    "I entered Babylon in peace.",
    "Cyrus Cylinder, royal inscription; translated excerpt.",
    `Cyrus Đại đế (khoảng 600–530 TCN) sáng lập đế quốc Achaemenid và mở rộng quyền lực Ba Tư từ Tây Á.

DI SẢN
• Ông chinh phục Babylon năm 539 TCN; trụ Cyrus ghi lại tuyên bố hoàng gia về cuộc tiến quân này.
• Cách diễn giải hiện đại về trụ đá cần được phân biệt với những tuyên bố chính trị thời sau.`,
    `Cyrus the Great (c. 600–530 BC) founded the Achaemenid Empire and extended Persian power across western Asia.

LEGACY
• He conquered Babylon in 539 BC; the Cyrus Cylinder records a royal account of that campaign.
• Modern interpretations of the cylinder should be distinguished from later political claims.`,
  ),
  worldStatue(
    "ibn-battuta",
    "Ibn Battuta",
    "Ibn Battuta",
    "rare",
    "Nhà du hành và học giả Maroc, ghi lại hành trình kéo dài gần ba thập kỷ.",
    "I set out alone, having neither fellow-traveler nor caravan whose party I might join.",
    "The Rihla, opening narrative; translation by H. A. R. Gibb.",
    `Ibn Battuta (1304–1368/1369) là nhà du hành và học giả luật Hồi giáo sinh tại Tangier, Maroc.

HÀNH TRÌNH
• Trong gần ba thập kỷ, ông đi qua Bắc Phi, Trung Đông, Nam Á và nhiều vùng ở châu Á.
• Những chuyến đi được ghi lại trong Rihla, tác phẩm do học giả Ibn Juzayy biên soạn từ lời kể của ông.`,
    `Ibn Battuta (1304–1368/1369) was a Moroccan traveler and Islamic legal scholar born in Tangier.

TRAVELS
• Over nearly three decades, he traveled through North Africa, the Middle East, South Asia, and many parts of Asia.
• His journeys were recorded in the Rihla, compiled from his account by the scholar Ibn Juzayy.`,
  ),
  worldStatue(
    "rumi",
    "Rumi",
    "Rumi",
    "rare",
    "Nhà thơ và học giả nói tiếng Ba Tư, nổi tiếng với thơ trữ tình và tác phẩm Masnavi.",
    "Listen to the reed, how it tells a tale, complaining of separations.",
    "Masnavi, Book I, opening lines; translation varies.",
    `Jalal al-Din Rumi (1207–1273) là nhà thơ, học giả Hồi giáo và nhà thần bí sinh tại vùng Balkh, sống phần lớn đời mình ở Konya.

TÁC PHẨM
• Ông sáng tác bằng tiếng Ba Tư; Masnavi và Divan Shams là những tác phẩm nổi tiếng nhất.
• Thơ của Rumi được dịch rộng rãi và có ảnh hưởng trong nhiều nền văn hóa.`,
    `Jalal al-Din Rumi (1207–1273) was a Persian-language poet, Islamic scholar, and mystic born near Balkh who spent much of his life in Konya.

WORKS
• He wrote in Persian; the Masnavi and Divan-e Shams are among his best-known works.
• Rumi's poetry has been widely translated and has influenced many cultures.`,
  ),
  worldStatue(
    "al-khwarizmi",
    "Al-Khwarizmi",
    "Al-Khwarizmi",
    "rare",
    "Học giả thời Abbasid có ảnh hưởng đến đại số và truyền bá hệ chữ số Ấn Độ.",
    "I have composed a short work on calculation by al-jabr and al-muqabala.",
    "Opening of The Compendious Book on Calculation by Completion and Balancing; translated excerpt.",
    `Muhammad ibn Musa al-Khwarizmi (khoảng 780–850) là học giả làm việc tại Baghdad thời Abbasid.

TOÁN HỌC
• Tác phẩm về al-jabr hệ thống hóa các phương pháp giải phương trình; từ “algebra” bắt nguồn từ tên tác phẩm.
• Tên Latin hóa của ông cũng góp phần tạo nên từ “algorithm” trong nhiều ngôn ngữ châu Âu.`,
    `Muhammad ibn Musa al-Khwarizmi (c. 780–850) was a scholar who worked in Abbasid-era Baghdad.

MATHEMATICS
• His work on al-jabr systematized methods for solving equations; the word “algebra” derives from its title.
• A Latinized form of his name also contributed to the word “algorithm” in several European languages.`,
  ),
  worldStatue(
    "omar-khayyam",
    "Omar Khayyam",
    "Omar Khayyam",
    "rare",
    "Nhà toán học, thiên văn học và thi sĩ Ba Tư thời trung đại.",
    "The moving finger writes; and, having writ, moves on.",
    "Edward FitzGerald, Rubáiyát, quatrain 51 (1859); English adaptation.",
    `Omar Khayyam (1048–1131) là nhà toán học, thiên văn học và thi sĩ Ba Tư.

ĐÓNG GÓP
• Ông tham gia cải cách lịch Jalali và nghiên cứu phương trình bậc ba.
• Các bài thơ rubaiyat của ông được biết đến rộng rãi qua bản chuyển thể tiếng Anh của Edward FitzGerald.`,
    `Omar Khayyam (1048–1131) was a Persian mathematician, astronomer, and poet.

CONTRIBUTIONS
• He worked on the Jalali calendar reform and studied cubic equations.
• His rubaiyat became widely known in English through Edward FitzGerald's adaptation.`,
  ),
  worldStatue(
    "akbar-the-great",
    "Akbar Đại đế",
    "Akbar",
    "rare",
    "Hoàng đế Mughal mở rộng đế quốc và bảo trợ nghệ thuật, kiến trúc.",
    "A monarch should ever be intent on conquest.",
    "Reported by Abu'l-Fazl in the Ain-i-Akbari; translated wording varies.",
    `Akbar (1542–1605) là hoàng đế Mughal, trị vì từ năm 1556 đến 1605.

TRIỀU ĐẠI
• Ông mở rộng và củng cố bộ máy cai trị, kết hợp các chính sách thuế và quản lý quân sự.
• Triều đình của Akbar bảo trợ nghệ thuật, kiến trúc và các cuộc đối thoại giữa nhiều truyền thống tôn giáo.`,
    `Akbar (1542–1605) was a Mughal emperor who ruled from 1556 to 1605.

REIGN
• He expanded and consolidated imperial administration, including taxation and military organization.
• His court patronized art, architecture, and dialogue among different religious traditions.`,
  ),
  worldStatue(
    "tokugawa-ieyasu",
    "Tokugawa Ieyasu",
    "Tokugawa Ieyasu",
    "rare",
    "Lãnh chúa Nhật Bản lập Mạc phủ Tokugawa, mở đầu thời kỳ Edo.",
    "Life is like walking a long road with a heavy burden; there is no need to hurry.",
    "Traditional maxim attributed to Ieyasu; textual provenance is debated.",
    `Tokugawa Ieyasu (1543–1616) là lãnh chúa và tướng quân Nhật Bản, sáng lập mạc phủ Tokugawa.

THỐNG NHẤT
• Sau chiến thắng Sekigahara năm 1600, ông được phong shogun năm 1603.
• Mạc phủ do ông lập ra đặt nền móng cho thời kỳ Edo kéo dài hơn hai thế kỷ.`,
    `Tokugawa Ieyasu (1543–1616) was a Japanese daimyo and shogun who founded the Tokugawa shogunate.

UNIFICATION
• After victory at Sekigahara in 1600, he was appointed shogun in 1603.
• His shogunate laid the foundations for the Edo period, which lasted for more than two centuries.`,
  ),
  worldStatue(
    "florence-nightingale",
    "Florence Nightingale",
    "Nightingale",
    "rare",
    "Y tá, nhà thống kê và nhà cải cách y tế người Anh.",
    "I attribute my success to this: I never gave or took any excuse.",
    "Commonly attributed to Nightingale; exact source wording is uncertain.",
    `Florence Nightingale (1820–1910) là y tá, nhà thống kê và nhà cải cách y tế người Anh.

CÔNG VIỆC
• Bà tổ chức chăm sóc thương binh trong Chiến tranh Crimea và dùng dữ liệu để vận động cải thiện điều kiện vệ sinh.
• Trường đào tạo y tá Nightingale tại Bệnh viện St Thomas góp phần chuyên nghiệp hóa ngành điều dưỡng.`,
    `Florence Nightingale (1820–1910) was an English nurse, statistician, and health-care reformer.

WORK
• She organized care for soldiers during the Crimean War and used data to advocate for better sanitation.
• The Nightingale training school at St Thomas' Hospital helped professionalize nursing.`,
  ),
  worldStatue(
    "harriet-tubman",
    "Harriet Tubman",
    "Harriet Tubman",
    "rare",
    "Nhà hoạt động bãi nô người Mỹ, từng giúp nhiều người thoát khỏi chế độ nô lệ.",
    "I never ran my train off the track, and I never lost a passenger.",
    "Reported in Sarah H. Bradford, Scenes in the Life of Harriet Tubman (1869/1886).",
    `Harriet Tubman (khoảng 1822–1913) trốn khỏi chế độ nô lệ ở Maryland rồi trở thành nhà hoạt động bãi nô.

HOẠT ĐỘNG
• Bà nhiều lần trở lại miền Nam Hoa Kỳ để giúp người khác chạy trốn qua mạng lưới Underground Railroad.
• Trong Nội chiến, bà phục vụ quân đội Liên bang với vai trò y tá, hướng đạo và do thám.`,
    `Harriet Tubman (c. 1822–1913) escaped slavery in Maryland and became an abolitionist.

ACTIVISM
• She repeatedly returned to the American South to help others escape through the Underground Railroad network.
• During the Civil War, she served Union forces as a nurse, guide, and scout.`,
  ),
  worldStatue(
    "frederick-douglass",
    "Frederick Douglass",
    "Frederick Douglass",
    "rare",
    "Nhà văn, nhà hùng biện và nhà hoạt động chống chế độ nô lệ tại Hoa Kỳ.",
    "If there is no struggle, there is no progress.",
    "“West India Emancipation” address, 1857.",
    `Frederick Douglass (1818–1895) trốn khỏi chế độ nô lệ và trở thành nhà văn, nhà hùng biện cùng nhà hoạt động bãi nô.

SỰ NGHIỆP
• Tự truyện Narrative of the Life of Frederick Douglass kể lại trải nghiệm của ông và phản bác các luận điệu ủng hộ nô lệ.
• Sau Nội chiến, ông tiếp tục vận động cho quyền công dân và bình đẳng.`,
    `Frederick Douglass (1818–1895) escaped slavery and became a writer, orator, and abolitionist.

CAREER
• His Narrative of the Life of Frederick Douglass described his experience and challenged pro-slavery arguments.
• After the Civil War, he continued to advocate for civil rights and equality.`,
  ),
  worldStatue(
    "michael-faraday",
    "Michael Faraday",
    "Faraday",
    "rare",
    "Nhà hóa học và vật lý học Anh, có đóng góp nền tảng cho điện từ học.",
    "Nothing is too wonderful to be true, if it be consistent with the laws of nature.",
    "Attributed to Faraday; wording varies among published sources.",
    `Michael Faraday (1791–1867) là nhà hóa học và vật lý học người Anh, xuất thân từ một gia đình lao động.

KHÁM PHÁ
• Ông phát hiện cảm ứng điện từ và nghiên cứu điện phân, đặt nền móng cho máy phát điện.
• Khái niệm trường điện từ của ông ảnh hưởng sâu sắc đến vật lý thế kỷ XIX.`,
    `Michael Faraday (1791–1867) was an English chemist and physicist from a working-class family.

DISCOVERIES
• His discovery of electromagnetic induction and work on electrolysis helped lay the foundations for electric generators.
• His ideas about electromagnetic fields deeply influenced nineteenth-century physics.`,
  ),
  worldStatue(
    "louis-pasteur",
    "Louis Pasteur",
    "Pasteur",
    "rare",
    "Nhà hóa học và vi sinh vật học Pháp, có ảnh hưởng lớn đến lý thuyết vi trùng.",
    "In the fields of observation, chance favors only the prepared mind.",
    "University of Lille lecture, 1854; translated.",
    `Louis Pasteur (1822–1895) là nhà hóa học và vi sinh vật học người Pháp.

Y HỌC VÀ KHOA HỌC
• Thí nghiệm của ông củng cố lý thuyết vi trùng và dẫn đến phương pháp thanh trùng.
• Ông góp phần phát triển vaccine chống bệnh than và bệnh dại; việc ứng dụng vaccine có sự tham gia của nhiều cộng sự.`,
    `Louis Pasteur (1822–1895) was a French chemist and microbiologist.

MEDICINE AND SCIENCE
• His experiments strengthened germ theory and led to pasteurization.
• He helped develop vaccines for anthrax and rabies, with therapeutic applications involving many collaborators.`,
  ),
  worldStatue(
    "raphael",
    "Raphael",
    "Raphael",
    "rare",
    "Họa sĩ và kiến trúc sư thời Phục Hưng Ý, nổi tiếng với các bức họa ở Vatican.",
    "To paint a beautiful woman, I would need to see many beautiful women.",
    "Letter to Baldassare Castiglione, c. 1514; translated wording varies.",
    `Raphael (1483–1520), tên đầy đủ Raffaello Sanzio, là họa sĩ và kiến trúc sư người Ý thời Phục Hưng.

TÁC PHẨM
• Ông nổi tiếng với các bức Madonna và bích họa Trường Athens tại Vatican.
• Bố cục cân đối, hình thể rõ ràng và màu sắc hài hòa trở thành dấu ấn trong nghệ thuật Phục Hưng.`,
    `Raphael (1483–1520), born Raffaello Sanzio, was an Italian Renaissance painter and architect.

WORKS
• He is known for his Madonnas and the Vatican fresco The School of Athens.
• Balanced composition, clear forms, and harmonious color became hallmarks of Renaissance art.`,
  ),
  worldStatue(
    "vincent-van-gogh",
    "Vincent van Gogh",
    "Van Gogh",
    "rare",
    "Họa sĩ Hà Lan hậu Ấn tượng, nổi tiếng với nét cọ giàu chuyển động và màu sắc mạnh.",
    "I am seeking, I am striving, I am in it with all my heart.",
    "Letter to Theo van Gogh; wording follows a published translation.",
    `Vincent van Gogh (1853–1890) là họa sĩ Hà Lan, một trong những nhân vật tiêu biểu của trường phái hậu Ấn tượng.

SÁNG TÁC
• Ông vẽ Hoa hướng dương, Đêm đầy sao và nhiều chân dung với nét cọ biểu cảm.
• Phần lớn danh tiếng của ông đến sau khi mất; em trai Theo là người hỗ trợ và lưu giữ nhiều tác phẩm, thư từ.`,
    `Vincent van Gogh (1853–1890) was a Dutch painter and a leading figure of Post-Impressionism.

ART
• He painted Sunflowers, The Starry Night, and many expressive portraits.
• Much of his fame came after his death; his brother Theo supported him and preserved many works and letters.`,
  ),
  worldStatue(
    "catherine-the-great",
    "Catherine Đại đế",
    "Catherine",
    "common",
    "Nữ hoàng Nga thế kỷ XVIII, mở rộng lãnh thổ và bảo trợ nghệ thuật.",
    "I praise loudly, I blame softly.",
    "Commonly attributed to Catherine the Great; the original source is uncertain.",
    `Catherine II (1729–1796), thường gọi là Catherine Đại đế, trị vì Nga từ năm 1762 đến 1796.

TRIỀU ĐẠI
• Dưới thời bà, lãnh thổ Nga mở rộng và nhà nước theo đuổi một số cải cách hành chính.
• Bà bảo trợ nghệ thuật và giáo dục, nhưng chế độ nông nô vẫn tồn tại và các cuộc nổi dậy bị đàn áp.`,
    `Catherine II (1729–1796), commonly known as Catherine the Great, ruled Russia from 1762 to 1796.

REIGN
• Russian territory expanded and the government pursued several administrative reforms during her rule.
• She patronized art and education, while serfdom continued and uprisings were suppressed.`,
  ),
  worldStatue(
    "peter-the-great",
    "Peter Đại đế",
    "Peter the Great",
    "common",
    "Sa hoàng Nga tiến hành cải cách quân đội, nhà nước và mở cửa về phía Baltic.",
    "I have conquered an empire, but not myself.",
    "Traditional attribution to Peter the Great; a reliable primary source is uncertain.",
    `Peter I (1672–1725), thường gọi là Peter Đại đế, là sa hoàng rồi hoàng đế Nga.

CẢI CÁCH
• Ông cải tổ quân đội và bộ máy nhà nước, đồng thời dẫn dắt Nga trong Đại chiến phương Bắc.
• Ông thành lập Saint Petersburg năm 1703, thành phố trở thành thủ đô của đế quốc trong nhiều giai đoạn.`,
    `Peter I (1672–1725), commonly called Peter the Great, was tsar and later emperor of Russia.

REFORMS
• He reformed the army and state administration and led Russia during the Great Northern War.
• He founded Saint Petersburg in 1703; the city became the empire's capital for several periods.`,
  ),
  worldStatue(
    "queen-victoria",
    "Nữ hoàng Victoria",
    "Victoria",
    "common",
    "Nữ hoàng Anh trị vì lâu dài trong giai đoạn công nghiệp hóa và bành trướng đế quốc.",
    "We are not amused.",
    "Phrase traditionally attributed to Victoria; its documented origin is disputed.",
    `Victoria (1819–1901) là nữ hoàng Vương quốc Anh từ năm 1837 đến khi qua đời.

THỜI ĐẠI
• Triều đại kéo dài 63 năm của bà trùng với công nghiệp hóa, mở rộng đế quốc và nhiều biến đổi xã hội.
• Giai đoạn này được gọi là thời Victoria, dù quyền lực chính trị ngày càng thuộc về nghị viện và chính phủ.`,
    `Victoria (1819–1901) was queen of the United Kingdom from 1837 until her death.

ERA
• Her 63-year reign coincided with industrialization, imperial expansion, and major social change.
• The period is called the Victorian era, although political power increasingly rested with Parliament and government.`,
  ),
  worldStatue(
    "abraham-lincoln",
    "Abraham Lincoln",
    "Lincoln",
    "common",
    "Tổng thống Hoa Kỳ thứ 16, lãnh đạo đất nước trong Nội chiến và bãi bỏ chế độ nô lệ.",
    "Government of the people, by the people, for the people.",
    "Gettysburg Address, November 19, 1863.",
    `Abraham Lincoln (1809–1865) là tổng thống thứ 16 của Hoa Kỳ, giữ chức trong Nội chiến.

LÃNH ĐẠO
• Tuyên ngôn Giải phóng năm 1863 tuyên bố tự do cho những người bị nô lệ tại các vùng nổi loạn.
• Ông bị ám sát năm 1865, ngay sau khi Liên bang chiến thắng.`,
    `Abraham Lincoln (1809–1865) was the 16th president of the United States and led the country during the Civil War.

LEADERSHIP
• The 1863 Emancipation Proclamation declared freedom for enslaved people in rebellious territories.
• He was assassinated in 1865, shortly after the Union victory.`,
  ),
  worldStatue(
    "martin-luther-king-jr",
    "Martin Luther King Jr.",
    "Martin Luther King Jr.",
    "common",
    "Mục sư và lãnh đạo phong trào dân quyền Hoa Kỳ, chủ trương đấu tranh bất bạo động.",
    "The time is always right to do what is right.",
    "Speech at Oberlin College, 1964.",
    `Martin Luther King Jr. (1929–1968) là mục sư Baptist và nhà lãnh đạo phong trào dân quyền tại Hoa Kỳ.

HOẠT ĐỘNG
• Ông vận động chấm dứt phân biệt chủng tộc bằng phản kháng bất bạo động và diễn thuyết trước công chúng.
• Năm 1964, ông nhận Nobel Hòa bình; ông bị ám sát tại Memphis năm 1968.`,
    `Martin Luther King Jr. (1929–1968) was a Baptist minister and leader of the United States civil rights movement.

ACTIVISM
• He campaigned against racial segregation through nonviolent protest and public speeches.
• He received the Nobel Peace Prize in 1964 and was assassinated in Memphis in 1968.`,
  ),
  worldStatue(
    "simon-bolivar",
    "Simón Bolívar",
    "Bolívar",
    "common",
    "Nhà lãnh đạo quân sự Nam Mỹ, góp phần vào các cuộc chiến giành độc lập khỏi Tây Ban Nha.",
    "The most perfect system of government is that which produces the greatest possible amount of happiness.",
    "Angostura Address, 1819; translated excerpt.",
    `Simón Bolívar (1783–1830) là nhà lãnh đạo quân sự và chính trị người Venezuela trong các cuộc chiến giành độc lập ở Nam Mỹ.

ĐỘC LẬP
• Ông góp phần giải phóng Venezuela, Colombia, Ecuador, Peru và vùng nay là Bolivia khỏi ách cai trị Tây Ban Nha.
• Cộng hòa Gran Colombia tồn tại trong thời gian ngắn dưới sự lãnh đạo của ông.`,
    `Simón Bolívar (1783–1830) was a Venezuelan military and political leader in South America's independence wars.

INDEPENDENCE
• He helped liberate Venezuela, Colombia, Ecuador, Peru, and the area now called Bolivia from Spanish rule.
• The short-lived Republic of Gran Colombia was established under his leadership.`,
  ),
  worldStatue(
    "jose-de-san-martin",
    "José de San Martín",
    "San Martín",
    "common",
    "Tướng lĩnh Argentina, có vai trò quan trọng trong độc lập của Argentina, Chile và Peru.",
    "Let us be free; the rest matters little.",
    "Often attributed to San Martín; wording and primary source vary.",
    `José de San Martín (1778–1850) là tướng lĩnh Argentina và một trong những nhân vật chủ chốt của các cuộc chiến độc lập Nam Mỹ.

CHIẾN DỊCH
• Ông chỉ huy chiến dịch vượt dãy Andes và góp phần giải phóng Chile.
• Năm 1821, ông tuyên bố độc lập Peru và giữ chức Bảo hộ trước khi rời chính trường.`,
    `José de San Martín (1778–1850) was an Argentine general and a central figure in South America's independence wars.

CAMPAIGNS
• He led the crossing of the Andes and helped secure Chilean independence.
• In 1821, he proclaimed Peru's independence and served as its Protector before withdrawing from public life.`,
  ),
  worldStatue(
    "sun-yat-sen",
    "Tôn Trung Sơn",
    "Sun Yat-sen",
    "common",
    "Nhà cách mạng Trung Quốc, có vai trò trong việc chấm dứt triều đại nhà Thanh.",
    "The revolution is not yet successful; comrades, you must continue to strive.",
    "Political testament dictated shortly before his death in 1925; translated.",
    `Tôn Trung Sơn (1866–1925) là nhà cách mạng và chính khách Trung Quốc, thường được gọi là cha đẻ của nước Trung Hoa hiện đại.

SỰ NGHIỆP
• Ông tham gia phong trào lật đổ nhà Thanh; cách mạng Tân Hợi năm 1911 dẫn đến việc thành lập Trung Hoa Dân Quốc.
• Tư tưởng Tam Dân gồm chủ nghĩa dân tộc, dân quyền và dân sinh.`,
    `Sun Yat-sen (1866–1925) was a Chinese revolutionary and statesman often called the father of modern China.

CAREER
• He helped lead the movement against the Qing dynasty; the 1911 Revolution led to the Republic of China.
• His Three Principles of the People were nationalism, democracy, and people's livelihood.`,
  ),
  worldStatue(
    "rabindranath-tagore",
    "Rabindranath Tagore",
    "Tagore",
    "common",
    "Nhà thơ, nhà văn và nhà giáo Bengal, người châu Á đầu tiên nhận Nobel Văn học.",
    "Where the mind is without fear and the head is held high.",
    "Gitanjali, poem 35; English translation published in 1912.",
    `Rabindranath Tagore (1861–1941) là nhà thơ, nhà văn, nhà soạn nhạc và nhà giáo người Bengal.

TÁC PHẨM
• Tập thơ Gitanjali giúp ông nhận Nobel Văn học năm 1913, lần đầu giải này được trao cho một tác giả châu Á.
• Ông sáng tác lời và nhạc cho quốc ca Ấn Độ và Bangladesh.`,
    `Rabindranath Tagore (1861–1941) was a Bengali poet, writer, composer, and educator.

WORKS
• Gitanjali helped him win the 1913 Nobel Prize in Literature, the first award to an Asian writer.
• He wrote the lyrics and music for the national anthems of India and Bangladesh.`,
  ),
  worldStatue(
    "katsushika-hokusai",
    "Katsushika Hokusai",
    "Hokusai",
    "common",
    "Nghệ sĩ ukiyo-e Nhật Bản, nổi tiếng với loạt tranh về núi Phú Sĩ.",
    "At seventy-three, I had learned a little about the true structure of nature.",
    "Postscript to One Hundred Views of Mount Fuji, 1834; translated.",
    `Katsushika Hokusai (1760–1849) là họa sĩ và nghệ sĩ in khắc gỗ Nhật Bản thời Edo.

NGHỆ THUẬT
• Loạt Ba mươi sáu cảnh núi Phú Sĩ gồm bức Sóng lừng ngoài khơi Kanagawa nổi tiếng toàn cầu.
• Tranh của ông ảnh hưởng đến nghệ thuật Nhật Bản và phong trào Japonisme ở châu Âu.`,
    `Katsushika Hokusai (1760–1849) was a Japanese ukiyo-e painter and printmaker of the Edo period.

ART
• His Thirty-six Views of Mount Fuji includes the globally recognized print The Great Wave off Kanagawa.
• His work influenced Japanese art and the Japonisme movement in Europe.`,
  ),
  worldStatue(
    "frida-kahlo",
    "Frida Kahlo",
    "Frida Kahlo",
    "common",
    "Họa sĩ Mexico nổi tiếng với chân dung tự họa và hình ảnh văn hóa bản địa.",
    "I paint myself because I am so often alone and because I am the subject I know best.",
    "Frida Kahlo's diary; translation wording varies.",
    `Frida Kahlo (1907–1954) là họa sĩ Mexico, nổi tiếng với chân dung tự họa giàu tính biểu tượng.

SÁNG TÁC
• Tranh của bà phản ánh trải nghiệm đau đớn thể chất, bản sắc Mexico và đời sống cá nhân.
• Tác phẩm của Kahlo được nhìn nhận lại rộng rãi trong nghệ thuật và văn hóa đại chúng thế kỷ XX.`,
    `Frida Kahlo (1907–1954) was a Mexican painter known for symbolic self-portraits.

ART
• Her paintings explored physical pain, Mexican identity, and personal experience.
• Kahlo's work was widely reassessed in twentieth-century art and popular culture.`,
  ),
  worldStatue(
    "claude-monet",
    "Claude Monet",
    "Monet",
    "common",
    "Họa sĩ Pháp và nhân vật trung tâm của trường phái Ấn tượng.",
    "I must have flowers, always and always.",
    "Commonly attributed to Monet; exact source is uncertain.",
    `Claude Monet (1840–1926) là họa sĩ Pháp và một trong những người đặt nền móng cho trường phái Ấn tượng.

TÁC PHẨM
• Bức Impression, soleil levant góp phần tạo nên tên gọi Impressionism.
• Những loạt tranh về hoa súng, nhà thờ Rouen và cảnh vườn Giverny cho thấy ông nghiên cứu ánh sáng qua nhiều thời điểm.`,
    `Claude Monet (1840–1926) was a French painter and one of the founders of Impressionism.

WORKS
• His painting Impression, soleil levant helped give Impressionism its name.
• Series on water lilies, Rouen Cathedral, and his Giverny garden explored changing light across time.`,
  ),
  worldStatue(
    "charles-dickens",
    "Charles Dickens",
    "Dickens",
    "common",
    "Tiểu thuyết gia Anh thời Victoria, thường viết về bất bình đẳng xã hội.",
    "It was the best of times, it was the worst of times.",
    "A Tale of Two Cities, Book I, Chapter 1, 1859.",
    `Charles Dickens (1812–1870) là tiểu thuyết gia Anh, một trong những nhà văn có ảnh hưởng nhất thời Victoria.

TÁC PHẨM
• Oliver Twist, David Copperfield và A Tale of Two Cities khắc họa nghèo đói, lao động trẻ em và biến động xã hội.
• Nhiều tiểu thuyết của ông được phát hành theo kỳ trên báo trước khi in thành sách.`,
    `Charles Dickens (1812–1870) was an English novelist and one of the most influential writers of the Victorian era.

WORKS
• Oliver Twist, David Copperfield, and A Tale of Two Cities portrayed poverty, child labor, and social upheaval.
• Many of his novels were serialized in periodicals before appearing as books.`,
  ),
  worldStatue(
    "jane-austen",
    "Jane Austen",
    "Jane Austen",
    "common",
    "Tiểu thuyết gia Anh, nổi tiếng với quan sát sắc sảo về giai cấp và hôn nhân.",
    "There is no charm equal to tenderness of heart.",
    "Emma, Volume III, Chapter 5, 1815.",
    `Jane Austen (1775–1817) là tiểu thuyết gia Anh, nổi tiếng với lối kể chuyện châm biếm và quan sát xã hội.

TÁC PHẨM
• Pride and Prejudice, Sense and Sensibility và Emma tập trung vào gia đình, tài sản, hôn nhân và vị thế xã hội.
• Những tiểu thuyết đầu của bà được xuất bản ẩn danh.`,
    `Jane Austen (1775–1817) was an English novelist known for social observation and irony.

WORKS
• Pride and Prejudice, Sense and Sensibility, and Emma examine family, property, marriage, and social standing.
• Her early novels were published anonymously.`,
  ),
  worldStatue(
    "miguel-de-cervantes",
    "Miguel de Cervantes",
    "Cervantes",
    "common",
    "Nhà văn Tây Ban Nha, tác giả Don Quixote, tác phẩm kinh điển của tiểu thuyết châu Âu.",
    "Truth may be stretched thin, but it never breaks.",
    "Don Quixote, Part II; translation wording varies.",
    `Miguel de Cervantes (1547–1616) là nhà văn Tây Ban Nha, nổi tiếng nhất với tiểu thuyết Don Quixote.

SỰ NGHIỆP
• Tác phẩm xuất bản thành hai phần năm 1605 và 1615, kết hợp hài hước với suy ngẫm về lý tưởng và thực tế.
• Cervantes từng phục vụ trong quân đội và bị giam giữ tại Algiers trước khi trở thành nhà văn chuyên nghiệp.`,
    `Miguel de Cervantes (1547–1616) was a Spanish writer best known for the novel Don Quixote.

CAREER
• Published in two parts in 1605 and 1615, the work blends comedy with reflections on ideals and reality.
• Cervantes served in the military and was held captive in Algiers before becoming a professional writer.`,
  ),
  worldStatue(
    "karl-marx",
    "Karl Marx",
    "Karl Marx",
    "common",
    "Triết gia và nhà kinh tế học Đức, có ảnh hưởng lớn đến tư tưởng chính trị hiện đại.",
    "The philosophers have only interpreted the world; the point is to change it.",
    "Theses on Feuerbach, XI, 1845.",
    `Karl Marx (1818–1883) là triết gia, nhà kinh tế học và nhà báo sinh tại Phổ.

TÁC PHẨM
• Ông đồng tác giả Tuyên ngôn của Đảng Cộng sản với Friedrich Engels và viết bộ Tư bản.
• Các phân tích của ông về giai cấp và kinh tế ảnh hưởng sâu rộng, đồng thời gây tranh luận trong chính trị hiện đại.`,
    `Karl Marx (1818–1883) was a Prussian-born philosopher, economist, and journalist.

WORKS
• He co-authored The Communist Manifesto with Friedrich Engels and wrote Capital.
• His analyses of class and economics have had wide influence and remain contested in modern politics.`,
  ),
  worldStatue(
    "sigmund-freud",
    "Sigmund Freud",
    "Freud",
    "common",
    "Bác sĩ thần kinh Áo, người hình thành trường phái phân tâm học.",
    "Where id was, there ego shall be.",
    "New Introductory Lectures on Psychoanalysis, Lecture 31, 1933.",
    `Sigmund Freud (1856–1939) là bác sĩ thần kinh người Áo và là người sáng lập phân tâm học.

TƯ TƯỞNG
• Ông phát triển các khái niệm về vô thức, giấc mơ và những xung đột nội tâm.
• Nhiều lý thuyết của Freud có ảnh hưởng văn hóa lớn nhưng hiện cũng được đánh giá lại và phê bình.`,
    `Sigmund Freud (1856–1939) was an Austrian neurologist and founder of psychoanalysis.

IDEAS
• He developed influential concepts concerning the unconscious, dreams, and inner conflict.
• Freud's theories shaped culture but are also reassessed and criticized today.`,
  ),
  worldStatue(
    "mary-wollstonecraft",
    "Mary Wollstonecraft",
    "Wollstonecraft",
    "common",
    "Nhà văn và triết gia Anh, bênh vực quyền và cơ hội giáo dục bình đẳng cho phụ nữ.",
    "I do not wish women to have power over men; but over themselves.",
    "A Vindication of the Rights of Woman, Chapter 4, 1792.",
    `Mary Wollstonecraft (1759–1797) là nhà văn và triết gia Anh, một tiếng nói quan trọng về quyền phụ nữ.

TÁC PHẨM
• A Vindication of the Rights of Woman (1792) lập luận rằng phụ nữ cần được tiếp cận giáo dục và cơ hội phát triển bình đẳng.
• Tư tưởng của bà ảnh hưởng đến các phong trào nữ quyền về sau.`,
    `Mary Wollstonecraft (1759–1797) was an English writer and philosopher and an important voice for women's rights.

WORKS
• A Vindication of the Rights of Woman (1792) argued that women needed equal access to education and opportunity.
• Her ideas influenced later feminist movements.`,
  ),
  worldStatue(
    "alexander-fleming",
    "Alexander Fleming",
    "Fleming",
    "common",
    "Nhà vi khuẩn học Scotland, phát hiện penicillin và góp phần mở ra thời đại kháng sinh.",
    "One sometimes finds what one is not looking for.",
    "Commonly attributed to Fleming; exact source wording is uncertain.",
    `Alexander Fleming (1881–1955) là nhà vi khuẩn học Scotland, phát hiện tác dụng kháng khuẩn của penicillin năm 1928.

Y HỌC
• Fleming công bố phát hiện, còn Howard Florey, Ernst Chain và cộng sự phát triển penicillin thành thuốc điều trị.
• Ba nhà khoa học cùng nhận Nobel Sinh lý học hoặc Y học năm 1945.`,
    `Alexander Fleming (1881–1955) was a Scottish bacteriologist who discovered penicillin's antibacterial effect in 1928.

MEDICINE
• Fleming reported the discovery; Howard Florey, Ernst Chain, and colleagues developed penicillin into a treatment.
• The three scientists shared the 1945 Nobel Prize in Physiology or Medicine.`,
  ),
  worldStatue(
    "emmeline-pankhurst",
    "Emmeline Pankhurst",
    "Pankhurst",
    "common",
    "Nhà hoạt động Anh đấu tranh cho quyền bầu cử của phụ nữ.",
    "We are here, not because we are law-breakers; we are here in our efforts to become law-makers.",
    "Freedom or Death speech, Hartford, Connecticut, 1913.",
    `Emmeline Pankhurst (1858–1928) là nhà hoạt động người Anh, sáng lập Liên đoàn Xã hội và Chính trị Phụ nữ năm 1903.

ĐẤU TRANH
• Bà tổ chức chiến dịch đòi quyền bầu cử, gồm cả các hành động bất tuân dân sự.
• Một bộ phận phụ nữ Anh được trao quyền bầu cử năm 1918; quyền bình đẳng về độ tuổi được mở rộng năm 1928.`,
    `Emmeline Pankhurst (1858–1928) was a British activist who founded the Women's Social and Political Union in 1903.

CAMPAIGN
• She organized campaigns for women's suffrage, including acts of civil disobedience.
• Some British women gained the vote in 1918; equal voting age was extended in 1928.`,
  ),
];
