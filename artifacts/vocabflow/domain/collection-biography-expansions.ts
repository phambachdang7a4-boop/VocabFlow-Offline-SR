export interface CollectionBiographyExpansion {
  vi: string;
  en: string;
}

/**
 * Context and turning points that deepen the shorter collection biographies.
 * Keep each Vietnamese section aligned with its English counterpart.
 */
export const COLLECTION_BIOGRAPHY_EXPANSIONS: Record<
  string,
  CollectionBiographyExpansion
> = {
  "legendary-julius-caesar-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Xuất thân từ một gia đình quý tộc nhưng không giàu có, Caesar xây dựng sự nghiệp qua các chức vụ công và tài hùng biện. Các chiến dịch ở Gaul đem lại cho ông danh tiếng cùng đội quân trung thành.
• Khi vượt sông Rubicon năm 49 TCN, ông châm ngòi cuộc nội chiến với Pompey và các đối thủ ở Rome. Việc nắm quyền lâu dài gây lo ngại cho nhiều thượng nghị sĩ; vụ ám sát ông không cứu được nền Cộng hòa, còn người thừa kế Octavian sau đó thiết lập chế độ đế chế.`,
    en: `CONTEXT AND TURNING POINT
• Born into a patrician family with limited wealth, Caesar built his career through public office and oratory. His campaigns in Gaul brought him fame and a loyal army.
• By crossing the Rubicon in 49 BC, he triggered civil war with Pompey and his Roman rivals. His concentration of power alarmed many senators; his assassination did not save the Republic, and his heir Octavian later established imperial rule.`,
  },
  "legendary-isaac-newton-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Newton học tại Đại học Cambridge. Khi trường đóng cửa vì dịch hạch năm 1665–1666, ông trở về Woolsthorpe và tiếp tục nghiên cứu toán học, ánh sáng và chuyển động; quãng thời gian này về sau thường được nhắc như giai đoạn hình thành nhiều ý tưởng quan trọng.
• Ông không chỉ là học giả: Newton từng đứng đầu Xưởng đúc tiền Hoàng gia và Hội Hoàng gia Anh. Tác phẩm Principia kết nối các hiện tượng trên Trái Đất với chuyển động thiên thể bằng cùng một hệ thống toán học.`,
    en: `CONTEXT AND TURNING POINT
• Newton studied at the University of Cambridge. When the university closed during the plague of 1665–1666, he returned to Woolsthorpe and continued work on mathematics, light, and motion; this period later became associated with several important ideas.
• He was not only a scholar: Newton led the Royal Mint and the Royal Society. Principia connected events on Earth with the motion of celestial bodies through a shared mathematical framework.`,
  },
  "epic-socrates-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Socrates sống trong thời Athens trải qua chiến tranh và biến động chính trị. Ông không để lại tác phẩm do chính mình viết; những gì biết về ông chủ yếu đến từ Plato, Xenophon và các tác giả khác, với những cách mô tả không hoàn toàn giống nhau.
• Những câu hỏi chất vấn niềm tin phổ biến khiến ông có cả người ngưỡng mộ lẫn đối thủ. Năm 399 TCN, tòa án Athens kết án ông; việc ông chấp nhận bản án và không trốn khỏi thành phố trở thành một câu chuyện có ảnh hưởng về lương tâm và luật pháp.`,
    en: `CONTEXT AND TURNING POINT
• Socrates lived while Athens was marked by war and political upheaval. He left no writings of his own; accounts of him come chiefly from Plato, Xenophon, and other authors whose portrayals do not fully agree.
• His questioning of accepted beliefs won admirers as well as opponents. In 399 BC an Athenian jury convicted him; his decision to accept the sentence rather than flee became an influential story about conscience and law.`,
  },
  "epic-aristotle-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Sinh tại Stagira ở miền bắc Hy Lạp, Aristotle đến Athens khi còn trẻ và học trong Học viện của Plato suốt nhiều năm. Sau khi Plato mất, ông rời Athens, rồi làm gia sư cho Alexander khi vị hoàng tử Macedonia còn trẻ.
• Trở lại Athens, ông lập Lyceum, nơi học trò cùng nghiên cứu nhiều ngành. Các tác phẩm còn lại thường được xem là ghi chép bài giảng; chúng có ảnh hưởng sâu rộng, dù nhiều kết luận khoa học tự nhiên đã được kiểm chứng và sửa đổi về sau.`,
    en: `CONTEXT AND TURNING POINT
• Born in Stagira in northern Greece, Aristotle came to Athens as a young man and studied at Plato’s Academy for many years. After Plato’s death he left Athens, and later tutored the young Macedonian prince Alexander.
• Back in Athens, he founded the Lyceum, where students investigated many fields. The surviving works are often understood as lecture notes; they shaped learning for centuries, although later evidence revised many of his claims about nature.`,
  },
  "epic-archimedes-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Archimedes làm việc tại Syracuse, một thành bang Hy Lạp ở Sicily, và kết hợp toán học trừu tượng với những vấn đề thực tế. Các câu chuyện về máy chiến tranh của ông được ghi lại trong những nguồn đời sau, nên chi tiết cụ thể cần được xem thận trọng.
• Ông qua đời khi quân La Mã chiếm Syracuse năm 212 TCN. Những giai thoại kể rằng ông bị giết khi đang mải mê vẽ hình không được xác nhận chắc chắn; điều có thể khẳng định rõ hơn là các công trình hình học của ông tiếp tục được nghiên cứu qua nhiều thế kỷ.`,
    en: `CONTEXT AND TURNING POINT
• Archimedes worked in Syracuse, a Greek city-state in Sicily, and connected abstract mathematics with practical problems. Stories about his war machines were recorded by later writers, so their details should be treated cautiously.
• He died when Roman forces captured Syracuse in 212 BC. The familiar story that he was killed while absorbed in a diagram is not firmly verified; what is clear is that his work in geometry continued to be studied for centuries.`,
  },
  "epic-cleopatra-vii-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Cleopatra thuộc triều đại Ptolemaios có gốc Macedonia, cai trị Ai Cập sau thời Alexander. Bà sử dụng liên minh với các lãnh đạo La Mã trong nỗ lực giữ quyền tự chủ của vương quốc giữa lúc Rome mở rộng ảnh hưởng.
• Sau thất bại của Mark Antony và Cleopatra trước Octavian tại Actium năm 31 TCN, bà mất quyền lực và Ai Cập bị sáp nhập vào La Mã. Nhiều hình ảnh về bà đến từ nguồn La Mã viết sau xung đột, vì vậy cần phân biệt sự kiện chính trị với những mô tả tuyên truyền hoặc huyền thoại.`,
    en: `CONTEXT AND TURNING POINT
• Cleopatra belonged to the Macedonian-rooted Ptolemaic dynasty, which ruled Egypt after Alexander’s conquests. She used alliances with Roman leaders in an effort to preserve her kingdom’s autonomy as Rome expanded.
• After Cleopatra and Mark Antony lost to Octavian at Actium in 31 BC, she lost power and Egypt was annexed by Rome. Many accounts of her come from Roman writers after the conflict, so political events should be separated from propaganda and legend.`,
  },
  "epic-augustus-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Octavian được Julius Caesar nhận làm con nuôi và người thừa kế trong di chúc. Sau vụ Caesar bị ám sát năm 44 TCN, Octavian liên minh rồi đối đầu với các đối thủ trong nhiều cuộc nội chiến; chiến thắng tại Actium năm 31 TCN mở đường cho ông trở thành người đứng đầu duy nhất.
• Năm 27 TCN, ông nhận danh hiệu Augustus. Ông giữ nhiều thiết chế cộng hòa trên danh nghĩa nhưng tập trung quyền lực lâu dài vào hoàng đế, tạo ra mô hình chính trị mà các đời sau kế thừa.`,
    en: `CONTEXT AND TURNING POINT
• Octavian was adopted by Julius Caesar and named his heir in Caesar’s will. After Caesar’s assassination in 44 BC, Octavian formed alliances and fought rivals through a series of civil wars; victory at Actium in 31 BC left him dominant.
• In 27 BC he received the title Augustus. He preserved many republican institutions in name while concentrating lasting authority in the emperor, creating a political model that later rulers inherited.`,
  },
  "epic-confucius-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Khổng Tử sống vào cuối thời Xuân Thu, khi các nước chư hầu cạnh tranh và trật tự chính trị cũ suy yếu. Ông từng tìm cách làm quan và áp dụng quan niệm về đức hạnh, lễ nghĩa trong quản trị, nhưng không giữ được một vị trí quyền lực lâu dài.
• Sau khi đi qua nhiều nước, ông trở về dạy học. Luận Ngữ được các thế hệ học trò biên tập từ những lời dạy và câu chuyện gắn với ông; truyền thống Nho học phát triển thêm qua nhiều thế kỷ, chứ không chỉ do một cá nhân định hình.`,
    en: `CONTEXT AND TURNING POINT
• Confucius lived near the end of the Spring and Autumn period, when rival states competed and older political order weakened. He sought government service and hoped to apply his ideas about virtue and ritual, but did not retain lasting political office.
• After traveling among several states, he returned to teaching. The Analects was compiled by generations of students from sayings and stories associated with him; Confucian tradition developed over centuries rather than through one person alone.`,
  },
  "epic-michelangelo-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Michelangelo trưởng thành trong môi trường nghệ thuật Florence, học nghề tại xưởng của Domenico Ghirlandaio và được gia đình Medici bảo trợ một thời gian. Những cơ hội tại Florence và Rome đưa ông đến các công trình lớn cho giới giáo hội và chính quyền.
• Ông thường làm việc dưới áp lực của đơn đặt hàng, thời hạn và những lần bất đồng với người bảo trợ. Các tác phẩm như Pietà, David và trần Nhà nguyện Sistine cho thấy ông theo đuổi cách diễn tả cơ thể và cảm xúc đầy sức căng.`,
    en: `CONTEXT AND TURNING POINT
• Michelangelo grew up in Florence’s artistic world, trained in Domenico Ghirlandaio’s workshop, and spent time under the patronage of the Medici family. Opportunities in Florence and Rome led to major commissions from religious and civic authorities.
• He often worked under pressure from deadlines, commissions, and disagreements with patrons. Works such as the Pietà, David, and the Sistine Chapel ceiling show his forceful treatment of the human body and emotion.`,
  },
  "epic-william-shakespeare-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Shakespeare rời Stratford-upon-Avon để làm nghề sân khấu ở London trong thời kỳ nhà hát công cộng phát triển mạnh. Từ diễn viên và người viết kịch, ông trở thành cổ đông của đoàn King's Men, gắn với nhà hát Globe.
• Các vở kịch kết hợp chất liệu lịch sử, bi kịch, hài và đời sống thường nhật. Những chi tiết riêng tư về cuộc đời ông còn ít; nhiều văn bản được lưu lại nhờ bản in và tuyển tập First Folio do đồng nghiệp xuất bản sau khi ông mất.`,
    en: `CONTEXT AND TURNING POINT
• Shakespeare left Stratford-upon-Avon for work in London as public theatre was expanding. From actor and playwright he became a shareholder in the King’s Men, a company associated with the Globe Theatre.
• His plays combined history, tragedy, comedy, and everyday life. Few private details of his life are known; many works survive through printed editions and the First Folio, published by fellow actors after his death.`,
  },
  "epic-galileo-galilei-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Galileo học tại Pisa rồi giảng dạy toán học ở Pisa và Padua. Từ năm 1609, ông cải tiến kính thiên văn và công bố những quan sát làm thay đổi hiểu biết về Mặt Trăng, các vệ tinh của Sao Mộc và Sao Kim.
• Cuốn Đối thoại về hai hệ thống thế giới năm 1632 dẫn tới phiên xử của Tòa án Dị giáo La Mã năm 1633; ông bị buộc phải từ bỏ việc công khai bảo vệ thuyết nhật tâm và sống phần đời còn lại trong quản thúc. Tranh luận này diễn ra trong bối cảnh khoa học, thần học và quyền lực thể chế phức tạp.`,
    en: `CONTEXT AND TURNING POINT
• Galileo studied in Pisa and later taught mathematics in Pisa and Padua. From 1609 he improved the telescope and published observations that changed understanding of the Moon, Jupiter’s moons, and Venus.
• His Dialogue Concerning the Two Chief World Systems (1632) led to a Roman Inquisition trial in 1633; he was required to recant his public defense of heliocentrism and spent the rest of his life under house arrest. The dispute unfolded amid complex scientific, theological, and institutional pressures.`,
  },
  "rare-plato-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Plato là người Athens, thuộc một gia đình có địa vị, và chịu ảnh hưởng sâu sắc từ việc Socrates bị xử tử. Sau biến động chính trị, ông chọn truyền đạt triết học bằng đối thoại, để người đọc theo dõi các lập luận thay vì chỉ nhận một kết luận.
• Học viện ông lập tại Athens trở thành nơi học tập có ảnh hưởng lâu dài. Qua các chủ đề về công lý, giáo dục, tình yêu và tri thức, Plato đặt ra những câu hỏi tiếp tục được tranh luận; các đối thoại không phải lúc nào cũng phản ánh trực tiếp quan điểm cuối cùng của tác giả.`,
    en: `CONTEXT AND TURNING POINT
• Plato was an Athenian from a prominent family and was deeply affected by Socrates’ execution. Amid political upheaval, he chose dialogue as a way to present philosophy, allowing readers to follow arguments rather than simply receive conclusions.
• The Academy he founded in Athens became an influential place of learning. His dialogues raise lasting questions about justice, education, love, and knowledge; they do not always state the author’s final position directly.`,
  },
  "rare-pythagoras-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Pythagoras thường được cho là rời đảo Samos và hoạt động tại Croton ở miền nam Italy, nơi ông gắn với một cộng đồng vừa nghiên cứu vừa tuân theo quy tắc sống riêng. Thông tin về cuộc đời ông chủ yếu được ghi lại nhiều thế kỷ sau.
• Vì không có tác phẩm nào của ông còn lại, khó tách đóng góp cá nhân khỏi thành tựu của các môn đồ. Định lý mang tên Pythagoras đã được biết đến trong các nền văn minh trước đó; truyền thống gắn với ông nổi bật ở việc kết nối toán học, âm nhạc và quan niệm về trật tự.`,
    en: `CONTEXT AND TURNING POINT
• Pythagoras is traditionally said to have left the island of Samos and worked in Croton in southern Italy, where he was associated with a community that combined study with distinctive rules of life. Accounts of him were written centuries later.
• No writings by Pythagoras survive, making it difficult to separate his personal work from that of his followers. The theorem bearing his name was known in earlier civilizations; the tradition linked to him is notable for connecting mathematics, music, and ideas of order.`,
  },
  "rare-hippocrates-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Hippocrates thường được gắn với đảo Kos và một truyền thống y học tìm lời giải thích tự nhiên cho bệnh tật thay vì chỉ dựa vào nghi lễ. Tuy vậy, tư liệu về chính cuộc đời ông rất ít và không cho phép dựng lại chắc chắn từng bước sự nghiệp.
• Bộ sưu tập văn bản mang tên Corpus Hippocraticum gồm tác phẩm của nhiều tác giả khác nhau. Vì thế, những quan sát lâm sàng và chuẩn mực đạo đức thường gắn với “Hippocrates” nên được hiểu là di sản của một trường phái và truyền thống y học rộng hơn.`,
    en: `CONTEXT AND TURNING POINT
• Hippocrates is associated with the island of Kos and a medical tradition that sought natural explanations for illness rather than relying only on ritual. However, evidence about his personal life is sparse and does not allow a secure account of his career.
• The collection known as the Hippocratic Corpus contains works by multiple authors. Clinical observations and ethical principles attributed to “Hippocrates” are therefore best understood as the legacy of a broader medical school and tradition.`,
  },
  "rare-homer-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Không có tiểu sử đáng tin cậy để xác định chắc chắn Homer là ai, sống khi nào, hoặc liệu hai sử thi có cùng một tác giả. Iliad và Odyssey gắn với truyền thống truyền khẩu lâu đời, được kể và định hình qua nhiều thế hệ trước khi được ghi thành văn bản.
• Những bài thơ không chỉ kể chuyện anh hùng mà còn đặt ra vấn đề về danh dự, mất mát, lòng hiếu khách và hậu quả của chiến tranh. Chúng trở thành văn bản nền tảng trong giáo dục Hy Lạp cổ đại và ảnh hưởng mạnh đến văn học châu Âu về sau.`,
    en: `CONTEXT AND TURNING POINT
• No reliable biography establishes exactly who Homer was, when he lived, or whether one poet composed both epics. The Iliad and Odyssey belong to a long oral tradition, told and shaped across generations before being written down.
• The poems are not only tales of heroes; they explore honor, loss, hospitality, and the costs of war. They became foundational texts in ancient Greek education and strongly influenced later European literature.`,
  },
  "rare-cicero-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Sinh ở Arpinum ngoài giới quý tộc Rome, Cicero vươn lên bằng học vấn, luật pháp và tài hùng biện. Ông trở thành chấp chính quan năm 63 TCN, khi phanh phui âm mưu của Catiline, rồi nhiều lần phải thích nghi với các phe phái tranh giành quyền lực.
• Sau khi Caesar bị ám sát, Cicero công kích Mark Antony trong các bài diễn văn Philippicae. Khi Antony cùng Octavian và Lepidus lập Tam hùng lần thứ hai, Cicero bị đưa vào danh sách truy sát và bị giết; các bức thư của ông trở thành nguồn quan trọng về đời sống chính trị La Mã.`,
    en: `CONTEXT AND TURNING POINT
• Born at Arpinum outside Rome’s old aristocracy, Cicero advanced through education, law, and oratory. He became consul in 63 BC while exposing Catiline’s conspiracy, then repeatedly had to navigate rival factions competing for power.
• After Caesar’s assassination, Cicero attacked Mark Antony in his Philippics. When Antony, Octavian, and Lepidus formed the Second Triumvirate, Cicero was proscribed and killed; his letters remain an important source on Roman political life.`,
  },
  "rare-hannibal-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Hannibal lớn lên trong gia đình tướng lĩnh Carthage giữa cuộc cạnh tranh với Rome. Năm 218 TCN, ông đưa quân từ bán đảo Iberia vượt dãy Alps để mở chiến dịch ở Italy; những chiến thắng như Cannae cho thấy khả năng phối hợp lực lượng và chọn địa hình.
• Dù gây tổn thất lớn cho Rome, ông không chiếm được thành phố này và cuối cùng phải rời Carthage sau khi thế lực của Rome gia tăng. Phần đời sau của ông gắn với các triều đình ở phía đông Địa Trung Hải; những chi tiết về cái chết được các nguồn cổ thuật lại không hoàn toàn thống nhất.`,
    en: `CONTEXT AND TURNING POINT
• Hannibal grew up in a Carthaginian military family amid rivalry with Rome. In 218 BC he led an army from Iberia across the Alps to campaign in Italy; victories such as Cannae showed his skill in coordinating forces and choosing terrain.
• Although he inflicted heavy losses on Rome, he did not capture the city and eventually left Carthage as Roman power increased. His later life was connected with courts in the eastern Mediterranean; ancient accounts do not fully agree on the details of his death.`,
  },
  "rare-dante-alighieri-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Dante tham gia chính trường Florence trong thời kỳ các phe phái đối đầu. Năm 1302, sau khi phe đối thủ giành quyền kiểm soát thành phố, ông bị kết án lưu đày và không trở về quê hương; trải nghiệm này để lại dấu ấn trong cách ông viết về quyền lực và công lý.
• Ông sáng tác Thần khúc bằng tiếng Tuscan thay vì chỉ dùng tiếng Latin của giới học thuật. Tác phẩm kết hợp hành trình tưởng tượng với triết học, thần học và những nhân vật đương thời, góp phần đưa tiếng Ý bản địa thành ngôn ngữ văn chương.`,
    en: `CONTEXT AND TURNING POINT
• Dante took part in Florence’s politics during a period of factional conflict. In 1302, after rivals gained control of the city, he was sentenced to exile and never returned; the experience shaped his writing about power and justice.
• He composed the Divine Comedy in Tuscan rather than writing only in the Latin of scholars. The work combines an imagined journey with philosophy, theology, and contemporary figures, helping establish the Italian vernacular as a literary language.`,
  },
  "rare-nicolaus-copernicus-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Copernicus học nhiều ngành tại Kraków và các thành phố Italy, sau đó làm giáo sĩ và quản lý tại Warmia. Ông dành thời gian quan sát bầu trời bên cạnh công việc hành chính, nên mô hình thiên văn của ông hình thành qua nhiều năm chứ không phải một phát hiện bất ngờ.
• De revolutionibus được in năm 1543, khi ông đã lớn tuổi. Mô hình của ông vẫn dùng quỹ đạo tròn và các chuyển động phức tạp, nhưng đặt Trái Đất vào vị trí một hành tinh chuyển động quanh Mặt Trời; các nhà thiên văn sau đó tiếp tục sửa đổi mô hình này.`,
    en: `CONTEXT AND TURNING POINT
• Copernicus studied several subjects in Kraków and Italian cities, then served as a cleric and administrator in Warmia. He observed the sky alongside his official duties, so his astronomical model developed over many years rather than from a single sudden discovery.
• De revolutionibus was printed in 1543, late in his life. Its model still used circular orbits and complicated motions, but treated Earth as a planet moving around the Sun; later astronomers continued to revise it.`,
  },
  "rare-johannes-kepler-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Kepler được đào tạo tại Tübingen với dự định ban đầu theo nghề thần học, nhưng công việc giảng dạy toán học đưa ông đến thiên văn học. Ông làm việc cùng Tycho Brahe tại Prague và sau khi Brahe mất được tiếp cận bộ số liệu quan sát hành tinh đặc biệt chính xác.
• Từ dữ liệu về Sao Hỏa, Kepler kết luận quỹ đạo hành tinh là hình elip chứ không phải đường tròn hoàn hảo. Các định luật của ông tạo cầu nối giữa quan sát và mô tả toán học, dù cuộc đời còn bị chi phối bởi xung đột tôn giáo và bất ổn chính trị ở châu Âu.`,
    en: `CONTEXT AND TURNING POINT
• Kepler studied at Tübingen with an initial plan to enter theology, but a mathematics teaching post drew him toward astronomy. He worked with Tycho Brahe in Prague and gained access to unusually precise planetary observations after Brahe’s death.
• From data on Mars, Kepler concluded that planetary orbits are ellipses rather than perfect circles. His laws linked observation with mathematical description, while his life was also shaped by religious conflict and political instability in Europe.`,
  },
  "rare-voltaire-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• François-Marie Arouet lấy bút danh Voltaire và sớm nổi tiếng nhờ thơ châm biếm. Năm 1717 ông bị giam ở Bastille; sau một cuộc xung đột khác với quý tộc, ông sống lưu vong tại Anh, nơi ông tiếp xúc với các tranh luận về khoa học, tôn giáo và chính quyền.
• Tác phẩm của ông thường dùng châm biếm để công kích kiểm duyệt, cuồng tín và lạm quyền. Candide cho thấy phong cách ấy qua một câu chuyện hài hước nhưng hoài nghi; Voltaire ủng hộ khoan dung, song tư tưởng và giới hạn của ông cũng cần được đặt trong thời đại của mình.`,
    en: `CONTEXT AND TURNING POINT
• François-Marie Arouet adopted the pen name Voltaire and first became known for satirical verse. He was imprisoned in the Bastille in 1717; after another conflict with a nobleman, he lived in England, where he encountered debates about science, religion, and government.
• His writing often used satire to challenge censorship, fanaticism, and abuse of power. Candide expresses that style through a comic but skeptical story; Voltaire advocated tolerance, while his ideas and limitations also belong to their own era.`,
  },
  "rare-charles-darwin-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Darwin học ở Edinburgh rồi Cambridge trước khi tham gia chuyến khảo sát của tàu Beagle từ năm 1831 đến 1836. Mẫu vật, địa hình và sự khác biệt giữa các quần thể ông quan sát trong chuyến đi trở thành chất liệu cho nhiều năm nghiên cứu sau đó.
• Năm 1858, Darwin và Alfred Russel Wallace cùng trình bày các ý tưởng về chọn lọc tự nhiên; năm sau Darwin xuất bản Nguồn gốc các loài. Ông xây dựng lập luận từ nhiều loại bằng chứng, và tác phẩm này làm thay đổi sinh học dù cơ chế di truyền khi ấy vẫn chưa được hiểu đầy đủ.`,
    en: `CONTEXT AND TURNING POINT
• Darwin studied in Edinburgh and Cambridge before joining the Beagle survey voyage from 1831 to 1836. Specimens, landscapes, and differences among populations observed during the voyage became material for years of later research.
• In 1858 Darwin and Alfred Russel Wallace jointly presented ideas on natural selection; Darwin published On the Origin of Species the following year. He built his argument from many kinds of evidence, and the book transformed biology even though heredity was not yet fully understood.`,
  },
  "rare-ludwig-van-beethoven-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Beethoven chuyển từ Bonn đến Vienna năm 1792 để học tập và xây dựng sự nghiệp. Ông nổi tiếng trước tiên với tư cách nghệ sĩ piano ứng tác, rồi ngày càng tập trung vào sáng tác cho dàn nhạc, sân khấu và các nhóm hòa tấu.
• Khi thính lực suy giảm, ông phải thay đổi cách giao tiếp và làm việc; bức thư Heiligenstadt năm 1802 ghi lại nỗi tuyệt vọng nhưng cũng cho thấy quyết tâm tiếp tục sáng tác. Những đổi mới trong giao hưởng và sonata của ông góp phần mở rộng quy mô biểu cảm của âm nhạc châu Âu.`,
    en: `CONTEXT AND TURNING POINT
• Beethoven moved from Bonn to Vienna in 1792 to study and build a career. He first became known as an improvising pianist, then increasingly focused on writing for orchestra, the stage, and chamber ensembles.
• As his hearing deteriorated, he had to change how he communicated and worked; the Heiligenstadt Testament of 1802 records despair as well as a resolve to continue composing. His innovations in symphony and sonata helped expand the expressive scale of European music.`,
  },
  "rare-wolfgang-amadeus-mozart-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Mozart đi lưu diễn khắp châu Âu từ nhỏ cùng cha Leopold, biểu diễn cho các triều đình và tiếp xúc với nhiều phong cách âm nhạc. Sau thời gian làm việc ở Salzburg, ông rời vị trí phục vụ Tổng giám mục để theo đuổi sự nghiệp độc lập tại Vienna.
• Ông hợp tác với nhà thơ Lorenzo Da Ponte trong các vở opera như Le nozze di Figaro và Don Giovanni. Requiem còn dang dở khi ông mất năm 1791; nguyên nhân bệnh cụ thể vẫn chưa được xác định chắc chắn, trái với nhiều câu chuyện ly kỳ về những ngày cuối đời.`,
    en: `CONTEXT AND TURNING POINT
• Mozart toured Europe from childhood with his father Leopold, performing at courts and encountering many musical styles. After working in Salzburg, he left the archbishop’s service to pursue an independent career in Vienna.
• He collaborated with librettist Lorenzo Da Ponte on operas such as Le nozze di Figaro and Don Giovanni. The Requiem was unfinished when he died in 1791; the precise illness is not firmly established, despite many dramatic stories about his final days.`,
  },
  "rare-george-washington-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Washington từng làm nghề đo đạc và phục vụ quân đội Virginia trước khi được bổ nhiệm chỉ huy Lục quân Lục địa năm 1775. Việc duy trì quân đội qua những thất bại và thiếu thốn, rồi từ chức chỉ huy sau chiến tranh, giúp ông xây dựng hình ảnh người đặt lợi ích cộng hòa lên trên quyền lực cá nhân.
• Là tổng thống đầu tiên, ông tạo tiền lệ cho chức vụ mới và rời nhiệm sở sau hai nhiệm kỳ. Di sản ấy cần được nhìn cùng thực tế ông sở hữu người bị nô dịch tại Mount Vernon; di chúc của ông quy định giải phóng những người ông trực tiếp sở hữu sau khi vợ qua đời.`,
    en: `CONTEXT AND TURNING POINT
• Washington worked as a surveyor and served in Virginia’s militia before being appointed commander of the Continental Army in 1775. Keeping the army together through setbacks and shortages, then resigning his command after the war, helped establish an image of republican restraint.
• As the first president, he set precedents for the new office and left after two terms. That legacy must be considered alongside the fact that he enslaved people at Mount Vernon; his will provided for the emancipation of those he personally owned after his wife’s death.`,
  },
  "common-euclid-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Euclid hoạt động tại Alexandria dưới triều đại Ptolemaios I, nhưng hầu như không có thông tin đáng tin cậy về cuộc đời riêng hay học vấn của ông. Những giai thoại về cuộc gặp với nhà vua xuất hiện trong các nguồn đời sau và không thể kiểm chứng đầy đủ.
• Cơ sở Elements sắp xếp kiến thức hình học bằng định nghĩa, tiên đề và chứng minh có thứ tự. Euclid không phát minh ra mọi định lý trong sách; đóng góp nổi bật của ông là cách hệ thống hóa chúng, trở thành mẫu mực giảng dạy toán học suốt nhiều thế kỷ.`,
    en: `CONTEXT AND TURNING POINT
• Euclid worked in Alexandria under Ptolemy I, but little reliable information survives about his private life or education. Stories of encounters with the king appear in later sources and cannot be fully verified.
• The Elements organizes geometry through definitions, postulates, and ordered proofs. Euclid did not invent every theorem in the book; his lasting contribution was the systematic arrangement that became a model for mathematical teaching for centuries.`,
  },
  "common-herodotus-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Herodotus sinh tại Halicarnassus, một thành phố Hy Lạp nằm trong đế quốc Ba Tư. Ông đi đến nhiều nơi quanh Địa Trung Hải và Ai Cập, thu thập lời kể, phong tục và những giải thích khác nhau về cuộc chiến giữa Hy Lạp với Ba Tư.
• Tác phẩm Lịch sử vừa ghi chép vừa kể chuyện, đôi khi dựa vào thông tin khó kiểm chứng theo tiêu chuẩn ngày nay. Giá trị của ông nằm ở nỗ lực truy tìm nguyên nhân và lưu giữ nhiều góc nhìn; vì vậy người đọc hiện đại cần phân biệt lời kể, truyền thuyết và dữ kiện đã được xác nhận.`,
    en: `CONTEXT AND TURNING POINT
• Herodotus was born at Halicarnassus, a Greek city within the Persian Empire. He traveled around the Mediterranean and Egypt, collecting accounts, customs, and explanations of the wars between Greece and Persia.
• The Histories combines record and storytelling, sometimes relying on information that is difficult to verify by modern standards. Its value lies in the effort to investigate causes and preserve many viewpoints; modern readers should distinguish reported stories from corroborated facts.`,
  },
  "common-pericles-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Pericles là một tướng lĩnh được bầu nhiều lần và giữ vai trò trung tâm trong chính trị Athens thế kỷ 5 TCN. Dưới thời ông, thành phố xây dựng các công trình lớn trên Acropolis và củng cố sức mạnh hàng hải; nền dân chủ khi ấy vẫn loại trừ phụ nữ, người ngoại quốc và người bị nô dịch.
• Ông ủng hộ cuộc chiến với Sparta bắt đầu năm 431 TCN. Dịch bệnh ở Athens cướp đi sinh mạng của ông năm 429 TCN, khi chiến tranh còn tiếp diễn; bài điếu văn nổi tiếng được Thucydides thuật lại, không phải bản ghi chép trực tiếp của Pericles.`,
    en: `CONTEXT AND TURNING POINT
• Pericles was a repeatedly elected general and a central figure in fifth-century-BC Athenian politics. Athens built major structures on the Acropolis and strengthened its naval power during his leadership; its democracy still excluded women, foreigners, and enslaved people.
• He supported the war with Sparta that began in 431 BC. The plague in Athens killed him in 429 BC while the conflict continued; the famous funeral oration is reported by Thucydides, not preserved as a direct transcript by Pericles.`,
  },
  "common-demosthenes-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Demosthenes hoạt động khi Athens phải đối mặt với sự mở rộng quyền lực của Macedonia dưới thời Philip II. Những bài diễn văn được gọi là Philippicae kêu gọi người Athens chống lại ảnh hưởng của nhà vua; ông trở thành một trong những tiếng nói quan trọng nhất của phe chủ trương kháng cự.
• Sau thất bại của liên minh Hy Lạp tại Chaeronea năm 338 TCN, Athens mất phần lớn quyền tự chủ đối ngoại. Demosthenes tiếp tục tham gia chính trị trong những năm sau đó, nhưng cuộc nổi dậy chống Macedonia thất bại và ông qua đời khi đang lẩn tránh bị bắt.`,
    en: `CONTEXT AND TURNING POINT
• Demosthenes lived as Athens faced the expansion of Macedonian power under Philip II. His speeches known as the Philippics urged Athenians to resist the king’s influence, making him one of the best-known voices for resistance.
• After the Greek coalition’s defeat at Chaeronea in 338 BC, Athens lost much of its freedom in foreign policy. Demosthenes remained politically active, but a later revolt against Macedonian rule failed and he died while evading capture.`,
  },
  "common-virgil-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Virgil sinh ở vùng Mantua và trưởng thành trong giai đoạn nội chiến làm thay đổi nền Cộng hòa La Mã. Ông được nhà bảo trợ Maecenas hỗ trợ và viết trong thời Augustus, khi văn chương được xem là một phương tiện định hình ký ức chung về Rome.
• Aeneid kể hành trình của Aeneas từ thành Troy đến Italy, kết nối huyền thoại với nguồn gốc mà La Mã tự nhận. Virgil qua đời trước khi hoàn tất việc chỉnh sửa sử thi; tác phẩm được lưu giữ và xuất bản sau đó, dù truyền thống kể rằng ông từng muốn hủy bản thảo.`,
    en: `CONTEXT AND TURNING POINT
• Virgil was born near Mantua and came of age during civil wars that transformed the Roman Republic. He received support from the patron Maecenas and wrote under Augustus, when literature was used to shape Rome’s shared memory.
• The Aeneid follows Aeneas from Troy to Italy, linking myth with Rome’s claimed origins. Virgil died before completing his revisions; the poem was preserved and published afterward, although tradition says he had wanted the manuscript destroyed.`,
  },
  "common-seneca-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Seneca sinh ở Hispania nhưng được giáo dục và xây dựng sự nghiệp tại Rome. Ông từng bị lưu đày dưới triều Claudius, rồi được triệu hồi để dạy hoàng tử Nero; khi Nero lên ngôi, Seneca trở thành cố vấn và một nhân vật giàu có trong triều đình.
• Sau khi rút khỏi chính trường, ông tiếp tục viết về tự chủ, thời gian và cách sống có đức hạnh. Năm 65 SCN, Nero buộc ông tự sát vì bị nghi liên quan đến âm mưu chính trị; sự tương phản giữa triết lý Khắc kỷ và đời sống quyền lực của ông vẫn là chủ đề được bàn luận.`,
    en: `CONTEXT AND TURNING POINT
• Seneca was born in Hispania but was educated and built his career in Rome. He was exiled under Claudius, then recalled to tutor the future emperor Nero; after Nero took power, Seneca became an adviser and a wealthy figure at court.
• After withdrawing from politics, he continued writing about self-command, time, and virtuous living. In AD 65 Nero ordered him to die over alleged involvement in a political conspiracy; the contrast between his Stoic ideals and life at court remains debated.`,
  },
  "common-ptolemy-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Claudius Ptolemy làm việc tại Alexandria thuộc Ai Cập La Mã vào thế kỷ 2 SCN. Ông tổng hợp quan sát thiên văn và tri thức của các học giả đi trước, chứ không bắt đầu từ một hệ thống hoàn toàn mới.
• Almagest trình bày mô hình địa tâm có thể dự đoán chuyển động của các thiên thể và được sử dụng ở nhiều vùng trong nhiều thế kỷ. Tác phẩm Địa lý của ông cũng hệ thống hóa tọa độ và bản đồ; không nên nhầm ông với các vị vua Ptolemaios của Ai Cập.`,
    en: `CONTEXT AND TURNING POINT
• Claudius Ptolemy worked in Alexandria in Roman Egypt during the second century AD. He brought together astronomical observations and knowledge from earlier scholars rather than beginning with an entirely new system.
• The Almagest presented a geocentric model that could predict celestial motions and was used across regions for centuries. His Geography also systematized coordinates and mapping; he should not be confused with Egypt’s Ptolemaic kings.`,
  },
  "common-charlemagne-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Charlemagne kế vị vương quốc Frank và mở rộng lãnh thổ qua nhiều chiến dịch. Ngày Giáng sinh năm 800, Giáo hoàng Leo III trao cho ông tước hiệu hoàng đế; sự kiện này củng cố quan hệ giữa triều đình Frank và Giáo hội, đồng thời tạo biểu tượng cho quyền lực ở Tây Âu.
• Ông hỗ trợ trường học và việc sao chép sách, thường được gọi là Phục hưng Carolingian. Việc mở rộng đế quốc cũng đi kèm chiến tranh và cưỡng bức cải đạo ở một số vùng; sau khi ông mất, lãnh thổ được chia giữa các người thừa kế.`,
    en: `CONTEXT AND TURNING POINT
• Charlemagne inherited the Frankish kingdom and expanded it through repeated campaigns. On Christmas Day in 800, Pope Leo III crowned him emperor, strengthening ties between the Frankish court and the Church and creating a lasting symbol of western European authority.
• He supported schools and the copying of books in what is often called the Carolingian Renaissance. Imperial expansion also involved warfare and forced conversion in some regions; after his death, the realm was divided among heirs.`,
  },
  "common-avicenna-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Ibn Sina, được biết ở châu Âu với tên Avicenna, sinh gần Bukhara vào cuối thế kỷ 10. Ông học y học, triết học và khoa học trong môi trường học thuật Ba Tư–Hồi giáo, đồng thời nhiều lần phục vụ các triều đình với vai trò thầy thuốc và quan chức.
• Hai bộ sách lớn của ông, Canon of Medicine và Book of Healing, kết hợp tri thức Hy Lạp cổ với truyền thống học thuật đương thời. Bản dịch Latin giúp chúng được dùng trong các trường y ở châu Âu nhiều thế kỷ; các tác phẩm phản ánh một nền học thuật liên vùng chứ không chỉ một cá nhân.`,
    en: `CONTEXT AND TURNING POINT
• Ibn Sina, known in Europe as Avicenna, was born near Bukhara in the late tenth century. He studied medicine, philosophy, and science in the Persian-Islamic scholarly world and repeatedly served courts as a physician and official.
• His major works, the Canon of Medicine and the Book of Healing, brought Greek learning together with scholarship of his own era. Latin translations were used in European medical schools for centuries; the works reflect a connected scholarly world, not just one individual.`,
  },
  "common-marco-polo-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Marco Polo rời Venice khi còn trẻ cùng cha và chú trong chuyến đi qua Trung Á đến lãnh thổ của người Mông Cổ. Theo lời kể của ông, ông đã phục vụ triều đình Hốt Tất Liệt trong một thời gian; mức độ chính xác của một số chi tiết trong sách vẫn được các nhà nghiên cứu tranh luận.
• Sau khi trở về, ông bị bắt trong cuộc chiến giữa Venice và Genoa. Trong thời gian bị giam, ông kể lại hành trình cho Rustichello da Pisa, người ghi chép thành cuốn sách được gọi là The Travels of Marco Polo; tác phẩm khơi dậy sự tò mò của độc giả châu Âu về châu Á.`,
    en: `CONTEXT AND TURNING POINT
• Marco Polo left Venice as a young man with his father and uncle, traveling through Central Asia toward Mongol territory. By his account, he served Kublai Khan’s court for a time; scholars continue to debate the accuracy of some details in the book.
• After returning, he was captured during a war between Venice and Genoa. While imprisoned, he dictated his travels to Rustichello da Pisa, who recorded the work known as The Travels of Marco Polo; it helped spark European curiosity about Asia.`,
  },
  "common-johannes-gutenberg-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Gutenberg là thợ kim hoàn ở Mainz trong bối cảnh châu Âu đang tìm cách nhân bản văn bản nhanh hơn bằng phương pháp cơ học. Kỹ thuật in và chữ rời đã tồn tại trước đó ở châu Á; đóng góp của ông là kết hợp chữ kim loại có thể sắp lại với mực và máy ép phù hợp cho sản xuất sách tại châu Âu.
• Cuốn Kinh Thánh Gutenberg là một trong những sách lớn đầu tiên được in bằng kỹ thuật này ở châu Âu. Tranh chấp tài chính với người cho vay Johann Fust khiến ông mất quyền kiểm soát một phần xưởng; công nghệ in tiếp tục lan rộng sau đó.`,
    en: `CONTEXT AND TURNING POINT
• Gutenberg was a goldsmith in Mainz at a time when Europe sought faster ways to reproduce texts mechanically. Printing and movable type existed earlier in Asia; his contribution was combining reusable metal type with suitable ink and a press for book production in Europe.
• The Gutenberg Bible was among the major early European books printed with this method. A financial dispute with lender Johann Fust cost him control of part of his workshop; printing technology continued to spread afterward.`,
  },
  "common-erasmus-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Erasmus là học giả nhân văn Hà Lan, được đào tạo trong môi trường tu viện và làm việc tại nhiều trung tâm học thuật châu Âu. Ông nghiên cứu văn bản cổ, dạy học và trao đổi thư từ với mạng lưới học giả rộng lớn khi ngành in đang giúp ý tưởng lưu chuyển nhanh hơn.
• Ấn bản Tân Ước tiếng Hy Lạp năm 1516 thúc đẩy việc đọc lại văn bản Kitô giáo từ nguồn gốc. Erasmus phê phán mê tín và lạm quyền trong Giáo hội nhưng chủ trương cải cách hơn là đoạn tuyệt; tranh luận với Martin Luther cho thấy họ bất đồng về tự do ý chí.`,
    en: `CONTEXT AND TURNING POINT
• Erasmus was a Dutch humanist educated in a monastic setting who worked in several European centers of learning. He studied classical texts, taught, and corresponded with a wide network of scholars as printing helped ideas travel faster.
• His 1516 Greek New Testament encouraged renewed study of Christian texts in their original language. Erasmus criticized superstition and abuses in the Church but favored reform over rupture; his debate with Martin Luther revealed a sharp disagreement about free will.`,
  },
  "common-francis-bacon-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Bacon học luật và bước vào chính trường Anh, cuối cùng giữ chức Đại Chưởng ấn dưới thời James I. Năm 1621, ông bị kết tội nhận quà trong khi làm thẩm phán và mất chức; sau đó ông tập trung nhiều hơn vào viết lách và chương trình cải tổ tri thức.
• Trong Novum Organum, Bacon nhấn mạnh việc quan sát có hệ thống, thử nghiệm và sửa giả thuyết thay vì chỉ dựa vào uy tín của sách cổ. Ông góp phần định hình lý tưởng nghiên cứu thực nghiệm, nhưng khoa học hiện đại hình thành từ nhiều học giả và thiết chế chứ không phải riêng ông.`,
    en: `CONTEXT AND TURNING POINT
• Bacon studied law and entered English politics, eventually becoming Lord Chancellor under James I. In 1621 he was convicted of accepting gifts while serving as a judge and lost office; afterward he devoted more attention to writing and a program for reforming knowledge.
• In Novum Organum, Bacon emphasized systematic observation, experiment, and revision of hypotheses rather than relying only on ancient authority. He helped shape ideals of empirical inquiry, but modern science developed through many scholars and institutions, not through him alone.`,
  },
  "common-rene-descartes-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Descartes được đào tạo tại trường Dòng Tên La Flèche rồi sống và làm việc ở nhiều nơi tại châu Âu. Ông viết trong thời kỳ các phương pháp toán học và những quan niệm cũ về tự nhiên đang được xem xét lại.
• Trong Suy tưởng về triết học đệ nhất, ông dùng hoài nghi có phương pháp để tìm một điểm khởi đầu chắc chắn cho tri thức. Câu “Tôi tư duy, vậy tôi tồn tại” gắn với dự án ấy; hình học giải tích của ông cũng kết nối đại số với hình học, dù quan điểm về tâm trí và thân thể về sau gây nhiều tranh luận.`,
    en: `CONTEXT AND TURNING POINT
• Descartes was educated at the Jesuit school of La Flèche and later lived and worked in several parts of Europe. He wrote as mathematical methods and inherited ideas about nature were being reconsidered.
• In Meditations on First Philosophy, he used methodical doubt to seek a secure starting point for knowledge. “I think, therefore I am” is associated with that project; his analytic geometry also linked algebra with geometry, while his account of mind and body later prompted debate.`,
  },
  "common-rembrandt-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Rembrandt rời Leiden đến Amsterdam khi thị trường nghệ thuật và hoạt động buôn bán của thành phố đang phát triển. Ông nhận nhiều đơn đặt hàng chân dung, đồng thời thử nghiệm tranh lịch sử, tự họa và kỹ thuật khắc axit.
• Bức Cảnh tuần đêm cho thấy cách ông tổ chức ánh sáng và chuyển động khác với một hàng chân dung tĩnh truyền thống. Sau những khó khăn tài chính, ông tuyên bố phá sản năm 1656; các tác phẩm về sau thường tập trung vào nét mặt và cảm xúc của con người.`,
    en: `CONTEXT AND TURNING POINT
• Rembrandt moved from Leiden to Amsterdam as the city’s art market and commerce expanded. He received many portrait commissions while also experimenting with history painting, self-portraiture, and etching.
• The Night Watch shows his use of light and movement in contrast to a static row of sitters. After financial difficulties, he declared bankruptcy in 1656; his later work often focused on human expression and emotion.`,
  },
  "common-johann-sebastian-bach-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Bach lớn lên trong một gia đình nhiều thế hệ làm nhạc và làm việc ở các triều đình, nhà thờ tại Weimar, Köthen rồi Leipzig. Tại Leipzig, ông giữ chức giám đốc âm nhạc nhà thờ và thường xuyên phải sáng tác cho lịch phụng vụ dày đặc.
• Các tác phẩm của ông bao gồm hợp xướng, nhạc thính phòng, concerto và những bộ phức điệu như The Well-Tempered Clavier. Sau khi ông mất, âm nhạc của Bach ít được công chúng biết đến hơn một thời gian; các buổi trình diễn thế kỷ 19 góp phần đưa ông trở lại vị trí trung tâm.`,
    en: `CONTEXT AND TURNING POINT
• Bach grew up in a multigenerational musical family and worked at courts and churches in Weimar, Köthen, and Leipzig. In Leipzig he served as a church music director and regularly composed for a demanding liturgical calendar.
• His works include chorales, chamber music, concertos, and contrapuntal collections such as The Well-Tempered Clavier. After his death his music was less familiar to the wider public for a time; nineteenth-century performances helped restore his central place.`,
  },
  "common-johann-wolfgang-von-goethe-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Goethe học luật tại Leipzig và Strasbourg, nhưng nhanh chóng nổi tiếng với tư cách nhà văn qua Nỗi đau của chàng Werther. Năm 1775, ông chuyển đến Weimar, nơi ông vừa viết vừa đảm nhiệm công việc quản lý nhà nước và tham gia đời sống khoa học.
• Chuyến đi Italy cuối thập niên 1780 giúp ông suy nghĩ lại về nghệ thuật cổ điển và sáng tác. Ông dành nhiều thập kỷ hoàn thiện Faust; sự nghiệp dài và đa dạng của Goethe ảnh hưởng đến văn học Đức, sân khấu và cách nhìn về con người.`,
    en: `CONTEXT AND TURNING POINT
• Goethe studied law in Leipzig and Strasbourg but soon became famous as a writer through The Sorrows of Young Werther. In 1775 he moved to Weimar, where he wrote while also serving in government and taking part in scientific life.
• His journey to Italy in the late 1780s reshaped his thinking about classical art and creative work. He spent decades completing Faust; his long and varied career influenced German literature, theatre, and ideas about human experience.`,
  },
  "common-victor-hugo-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Hugo bắt đầu nổi tiếng trong phong trào Lãng mạn Pháp với thơ và tiểu thuyết Nhà thờ Đức Bà Paris. Sau cuộc đảo chính năm 1851 của Louis-Napoléon Bonaparte, ông sống lưu vong nhiều năm tại Jersey rồi Guernsey và công khai phản đối chế độ Đế chế thứ hai.
• Những tác phẩm như Những người khốn khổ đưa nghèo đói, công lý và phẩm giá con người vào trung tâm của tiểu thuyết đại chúng. Sau khi trở về Pháp năm 1870, ông tiếp tục là một tiếng nói công khai có ảnh hưởng; hàng triệu người dự tang lễ của ông tại Paris.`,
    en: `CONTEXT AND TURNING POINT
• Hugo first became prominent in French Romanticism through poetry and the novel The Hunchback of Notre-Dame. After Louis-Napoléon Bonaparte’s coup in 1851, he spent years in exile on Jersey and Guernsey and openly opposed the Second Empire.
• Works such as Les Misérables placed poverty, justice, and human dignity at the center of popular fiction. After returning to France in 1870, he remained an influential public voice; millions took part in his funeral in Paris.`,
  },
  "common-sun-tzu-marble": {
    vi: `BỐI CẢNH VÀ BƯỚC NGOẶT
• Tôn Tử được truyền thống đặt vào thời Xuân Thu, nhưng không có tiểu sử đương thời đủ chắc chắn để xác nhận năm sinh, quê quán hay từng chiến dịch. Binh pháp Tôn Tử có thể phản ánh nhiều lớp biên soạn và kinh nghiệm quân sự tích lũy, chứ không nhất thiết là tác phẩm nguyên vẹn của một người.
• Văn bản nhấn mạnh hiểu mình, hiểu đối thủ, thu thập tin tức và thích ứng với hoàn cảnh để tránh chiến tranh kéo dài. Các triều đại ở Đông Á nghiên cứu sách này trong nhiều thế kỷ; cách đọc hiện đại cũng cần phân biệt tư tưởng chiến lược với những khẩu hiệu phổ biến được gán cho Tôn Tử.`,
    en: `CONTEXT AND TURNING POINT
• Tradition places Sun Tzu in the Spring and Autumn period, but no contemporary biography securely confirms his dates, origins, or campaigns. The Art of War may reflect layers of compilation and accumulated military experience rather than a complete work by one person.
• The text stresses knowing oneself and an opponent, gathering intelligence, and adapting to circumstances to avoid prolonged war. East Asian states studied it for centuries; modern readers should distinguish its strategic arguments from popular sayings later attributed to Sun Tzu.`,
  },
};
