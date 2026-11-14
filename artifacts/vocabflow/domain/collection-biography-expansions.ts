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
  "legendary-albert-einstein-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Năm 1905, khi làm việc tại văn phòng cấp bằng sáng chế ở Bern, Einstein công bố nhiều bài báo có ảnh hưởng về lượng tử ánh sáng, chuyển động Brown và thuyết tương đối hẹp.
• Sau khi chủ nghĩa Quốc xã lên nắm quyền, ông rời Đức và định cư tại Hoa Kỳ. Ông tiếp tục nghiên cứu, lên tiếng về hòa bình và trách nhiệm của khoa học.
• Các ý tưởng của Einstein được kiểm nghiệm và phát triển bởi cộng đồng khoa học rộng lớn; ông không phải người duy nhất tạo nên vật lý hiện đại.`,
    en: `CONTEXT AND LEGACY
• In 1905, while working at a patent office in Bern, Einstein published influential papers on light quanta, Brownian motion, and special relativity.
• After the Nazi rise to power, he left Germany and settled in the United States. He continued research and spoke publicly about peace and science.
• Einstein's ideas were tested and developed by a broad scientific community; modern physics was not created by one person alone.`,
  },
  "legendary-mahatma-gandhi-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Gandhi học luật tại London rồi làm việc ở Nam Phi, nơi ông tổ chức phản kháng chống phân biệt đối xử với người Ấn.
• Trở về Ấn Độ năm 1915, ông tham gia các chiến dịch bất tuân dân sự, trong đó có cuộc Tuần hành Muối năm 1930.
• Phương pháp bất bạo động ảnh hưởng nhiều phong trào sau này, nhưng di sản của ông cũng được xem xét phê bình trong bối cảnh xã hội và chính trị.`,
    en: `CONTEXT AND LEGACY
• Gandhi studied law in London and later worked in South Africa, where he organized resistance to discrimination against Indians.
• Returning to India in 1915, he joined campaigns of civil disobedience, including the Salt March of 1930.
• His nonviolent methods influenced later movements, while his legacy is also critically examined in social and political context.`,
  },
  "legendary-marie-curie-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Sinh tại Warsaw với tên Maria Skłodowska, bà chuyển đến Paris để học tại Sorbonne khi cơ hội giáo dục cho phụ nữ ở quê nhà còn hạn chế.
• Sau khi Pierre Curie qua đời, bà tiếp tục giảng dạy và nghiên cứu, trở thành nữ giáo sư đầu tiên tại Sorbonne.
• Việc xử lý vật liệu phóng xạ trong điều kiện an toàn chưa được hiểu rõ thời đó đã gây nguy hiểm cho sức khỏe của bà.`,
    en: `CONTEXT AND LEGACY
• Born Maria Skłodowska in Warsaw, she moved to Paris to study at the Sorbonne when educational opportunities for women at home were limited.
• After Pierre Curie's death, she continued teaching and research and became the Sorbonne's first female professor.
• Working with radioactive materials before their hazards were understood exposed her to serious health risks.`,
  },
  "legendary-genghis-khan-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Temüjin trải qua thời thơ ấu giữa các xung đột bộ lạc và xây dựng liên minh bằng chiến tranh, ngoại giao cùng quan hệ trung thành cá nhân.
• Quân đội Mông Cổ nổi bật nhờ kỵ binh cơ động, liên lạc và tổ chức theo đơn vị; các cuộc chinh phục vẫn gây thương vong lớn.
• Sau khi ông mất, những người kế vị tiếp tục mở rộng đế quốc, tạo mạng lưới trao đổi Á–Âu nhưng cũng để lại các cuộc tàn phá.`,
    en: `CONTEXT AND LEGACY
• Temüjin grew up amid intertribal conflict and built alliances through warfare, diplomacy, and personal bonds of loyalty.
• Mongol forces were known for mobile cavalry, communication, and unit organization; their conquests also caused enormous loss of life.
• After his death, successors expanded the empire, creating Eurasian connections while continuing campaigns of severe destruction.`,
  },
  "legendary-nelson-mandela-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Mandela gia nhập Đại hội Dân tộc Phi và tham gia vận động chống apartheid; sau khi phản kháng ôn hòa bị đàn áp, ông cũng gắn với cánh vũ trang của phong trào.
• Phiên tòa Rivonia năm 1964 đưa ông vào tù dài hạn. Những cuộc thương lượng cuối thập niên 1980 góp phần chấm dứt chế độ thiểu số da trắng.
• Chính phủ của ông thúc đẩy hòa giải dân tộc, nhưng nhiều bất bình đẳng kinh tế vẫn tiếp tục sau chuyển đổi chính trị.`,
    en: `CONTEXT AND LEGACY
• Mandela joined the African National Congress and opposed apartheid; after peaceful protest was suppressed, he was also associated with the movement's armed wing.
• The 1964 Rivonia Trial led to his long imprisonment. Negotiations in the late 1980s helped bring white-minority rule to an end.
• His government promoted national reconciliation, though many economic inequalities persisted after the political transition.`,
  },
  "epic-ramses-ii-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Ramses lên ngôi khi Ai Cập cạnh tranh ảnh hưởng với đế quốc Hittite tại vùng Levant. Trận Kadesh được ghi lại bằng văn bia và phù điêu hoàng gia.
• Các văn bản Ai Cập mô tả trận đánh như chiến thắng của pharaoh, trong khi giới nghiên cứu hiện đại thận trọng với tuyên truyền cung đình.
• Những công trình đồ sộ và nhiều tượng của ông khiến tên Ramses còn hiện diện trong cảnh quan Ai Cập ngày nay.`,
    en: `CONTEXT AND LEGACY
• Ramses came to power while Egypt competed with the Hittite Empire for influence in the Levant. Royal inscriptions and reliefs recorded the Battle of Kadesh.
• Egyptian texts presented the battle as a pharaoh's victory, while modern historians treat court propaganda cautiously.
• His monumental building program and many statues keep his name visible in Egypt's landscape today.`,
  },
  "epic-hatshepsut-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Hatshepsut ban đầu cùng trị vì với Thutmose III, rồi nắm quyền pharaoh trong nhiều năm. Triều đình dùng danh hiệu và hình tượng hoàng gia để củng cố tính chính danh.
• Đền tang lễ tại Deir el-Bahri kể về nguồn gốc thần thánh và chuyến đi Punt, phản ánh chương trình chính trị của triều đình.
• Một số hình ảnh của bà bị phá hủy hoặc sửa đổi sau khi bà mất; nguyên nhân và thời điểm cụ thể vẫn được thảo luận.`,
    en: `CONTEXT AND LEGACY
• Hatshepsut first ruled alongside Thutmose III and later held pharaonic power for years. Her court used royal titles and imagery to establish legitimacy.
• Her mortuary temple at Deir el-Bahri presents a divine birth narrative and the Punt expedition, reflecting the court's political program.
• Some images of her were erased or altered after her death; the motives and timing remain debated.`,
  },
  "epic-ashoka-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Các sắc lệnh của Ashoka được khắc trên đá và cột đá tại nhiều vùng, sử dụng ngôn ngữ địa phương để truyền đạt thông điệp của nhà nước.
• Ông khuyến khích lòng khoan dung giữa các cộng đồng tôn giáo và quan tâm đến phúc lợi của người dân, động vật.
• Mức độ ông trực tiếp cải đạo sau chiến tranh Kalinga được mô tả khác nhau trong các nguồn; văn bia là bằng chứng quan trọng nhất còn lại.`,
    en: `CONTEXT AND LEGACY
• Ashoka's edicts were carved on rocks and pillars across the empire, often using local languages to communicate state messages.
• They promoted tolerance among religious communities and expressed concern for the welfare of people and animals.
• Sources differ on the extent of his personal conversion after Kalinga; the inscriptions remain the strongest surviving evidence.`,
  },
  "epic-qin-shi-huang-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Qin Shi Huang thừa hưởng một nhà nước đã phát triển quân đội và bộ máy hành chính mạnh, rồi dùng chiến tranh để khuất phục sáu nước đối thủ.
• Nhà Tần thống nhất một số quy chuẩn nhưng áp dụng cai trị hà khắc, dẫn đến nổi dậy ngay sau khi ông qua đời.
• Lăng mộ với đội quân đất nung cho thấy quy mô quyền lực và nguồn lực mà triều đình huy động.`,
    en: `CONTEXT AND LEGACY
• Qin Shi Huang inherited a state with a strong army and administration, then used warfare to defeat six rival kingdoms.
• The Qin standardized several systems but governed harshly, and rebellions followed soon after his death.
• The mausoleum and its Terracotta Army reveal the scale of power and resources mobilized by the court.`,
  },
  "epic-ibn-khaldun-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Ibn Khaldun sống giữa các triều đại thay đổi nhanh ở Bắc Phi và Andalusia, nhiều lần làm quan, ngoại giao và giảng dạy.
• Trong Muqaddimah, ông xem xét cách đoàn kết nhóm, kinh tế, địa lý và quyền lực góp phần tạo nên hoặc làm suy yếu nhà nước.
• Những khái niệm của ông thường được so sánh với xã hội học hiện đại, nhưng cần đặt trong bối cảnh lịch sử Hồi giáo thế kỷ XIV.`,
    en: `CONTEXT AND LEGACY
• Ibn Khaldun lived through rapidly changing dynasties in North Africa and al-Andalus and served repeatedly in government, diplomacy, and teaching.
• In the Muqaddimah, he examined how group solidarity, economics, geography, and power helped states form or weaken.
• His concepts are often compared with modern sociology but should be read within the context of fourteenth-century Islamic history.`,
  },
  "epic-saladin-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Saladin trưởng thành trong mạng lưới quyền lực của người Zengid và trở thành tể tướng Fatimid trước khi lập triều Ayyubid.
• Việc chiếm lại Jerusalem năm 1187 dẫn tới Thập tự chinh thứ ba; các cuộc đàm phán với Richard I kết thúc bằng thỏa thuận cho phép người hành hương đến thành phố.
• Hình ảnh hiệp sĩ hào hiệp của ông được cả nguồn Hồi giáo và châu Âu về sau xây dựng, đôi khi khác với thực tế chính trị phức tạp.`,
    en: `CONTEXT AND LEGACY
• Saladin rose through the Zengid network and became vizier of the Fatimid caliphate before founding the Ayyubid dynasty.
• His recapture of Jerusalem in 1187 prompted the Third Crusade; negotiations with Richard I ended in an agreement permitting pilgrimages.
• Later Muslim and European accounts shaped his image as a chivalrous ruler, sometimes simplifying complex political realities.`,
  },
  "epic-joan-of-arc-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Joan đến gặp thái tử Charles trong thời điểm quân Anh và đồng minh kiểm soát nhiều vùng của Pháp. Bà mặc giáp và đồng hành cùng quân đội, nhưng không phải là tổng chỉ huy duy nhất.
• Sau khi bị bắt tại Compiègne, bà bị xét xử tại Rouen trong một tòa án chịu ảnh hưởng chính trị của Anh.
• Phiên tòa được xem xét lại năm 1456 và tuyên bố bản án trước đó vô hiệu; hình tượng của bà tiếp tục được diễn giải theo nhiều mục đích khác nhau.`,
    en: `CONTEXT AND LEGACY
• Joan met the dauphin Charles while English forces and their allies controlled much of France. She wore armor and traveled with troops but was not their sole commander.
• Captured near Compiègne, she was tried at Rouen in a court operating under English political influence.
• A review in 1456 nullified the earlier verdict; her image has since been interpreted for many different purposes.`,
  },
  "epic-elizabeth-i-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Elizabeth là con gái của Henry VIII và Anne Boleyn, lên ngôi sau một thời kỳ tranh chấp tôn giáo và kế vị.
• Đạo luật Thống nhất năm 1559 định hình Giáo hội Anh; triều đình cũng phải đối phó với các âm mưu và mâu thuẫn giữa các cường quốc châu Âu.
• Thời Elizabeth chứng kiến Shakespeare và nhiều nhà viết kịch khác hoạt động, nhưng không nên quy toàn bộ thành tựu văn hóa của thời kỳ cho riêng nữ hoàng.`,
    en: `CONTEXT AND LEGACY
• Elizabeth, daughter of Henry VIII and Anne Boleyn, came to the throne after years of religious and succession disputes.
• The 1559 Act of Uniformity shaped the Church of England; her government also faced plots and rivalry among European powers.
• Shakespeare and other playwrights flourished during her reign, though the era's cultural achievements cannot be credited to the queen alone.`,
  },
  "epic-ada-lovelace-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Lovelace là con gái của nhà thơ Lord Byron và được mẹ khuyến khích học toán, khoa học thay vì chỉ theo chương trình giáo dục dành cho phụ nữ thời đó.
• Khi dịch bài viết của Luigi Menabrea về máy phân tích, bà bổ sung ghi chú dài hơn bản dịch và giải thích khả năng xử lý ký hiệu của máy.
• Bản thiết kế máy chưa hoàn thành khi bà còn sống; vì vậy vai trò của bà được hiểu qua văn bản và nghiên cứu lịch sử máy tính.`,
    en: `CONTEXT AND LEGACY
• Lovelace, daughter of poet Lord Byron, was encouraged by her mother to study mathematics and science beyond the usual education offered to women.
• While translating Luigi Menabrea's article on the Analytical Engine, she added notes longer than the original and explained its symbolic operations.
• The machine was never completed in her lifetime, so her role is understood through her writing and later computer history.`,
  },
  "epic-nikola-tesla-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Tesla học kỹ thuật tại châu Âu và chuyển đến Hoa Kỳ năm 1884. Ông từng làm việc với Thomas Edison trước khi theo đuổi các dự án riêng.
• Hệ thống điện xoay chiều nhiều pha của ông được cấp bằng sáng chế và thương mại hóa cùng nhiều kỹ sư, doanh nghiệp khác.
• Tesla còn thử nghiệm truyền thông không dây và điện áp cao; một số ý tưởng của ông nổi tiếng hơn mức chúng được triển khai thực tế.`,
    en: `CONTEXT AND LEGACY
• Tesla studied engineering in Europe and moved to the United States in 1884. He briefly worked with Thomas Edison before pursuing independent projects.
• His polyphase alternating-current system was patented and commercialized alongside work by many other engineers and companies.
• He also experimented with wireless communication and high voltage; some of his ideas became more famous than their practical implementation.`,
  },
  "rare-hammurabi-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Hammurabi củng cố Babylon bằng chiến tranh, ngoại giao và quản lý các thành phố trong khu vực Lưỡng Hà.
• Bộ luật được khắc trên một tấm bia đá bazan cao, hiện lưu giữ tại Bảo tàng Louvre; văn bản gồm các phán quyết mẫu và nguyên tắc pháp lý.
• Hình phạt trong bộ luật khác nhau theo địa vị xã hội, phản ánh cấu trúc thứ bậc của xã hội cổ đại.`,
    en: `CONTEXT AND LEGACY
• Hammurabi strengthened Babylon through warfare, diplomacy, and administration of Mesopotamian cities.
• The code was carved on a tall basalt stele, now held at the Louvre; it contains model judgments and legal principles.
• Penalties differed by social status, reflecting the hierarchical structure of ancient society.`,
  },
  "rare-cyrus-the-great-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Cyrus đánh bại người Media, Lydia và Babylon, tạo nên một đế quốc đa dân tộc trải dài từ Trung Á đến Tây Á.
• Các nguồn Ba Tư, Hy Lạp và Babylon mô tả ông theo những cách khác nhau; nhiều câu chuyện đời ông được viết lại về sau.
• Trụ Cyrus ghi lại lời tuyên bố hoàng gia về việc chiếm Babylon, nhưng cách gọi đây là văn bản nhân quyền hiện đại còn gây tranh luận.`,
    en: `CONTEXT AND LEGACY
• Cyrus defeated the Medes, Lydia, and Babylon, building a multiethnic empire stretching across western and central Asia.
• Persian, Greek, and Babylonian sources portray him differently; many stories about his life were written later.
• The Cyrus Cylinder records a royal account of Babylon's conquest, though calling it a modern human-rights charter remains debated.`,
  },
  "rare-ibn-battuta-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Ibn Battuta rời Tangier năm 1325 với mục tiêu hành hương đến Mecca, rồi tiếp tục nhận việc tại các triều đình và thành phố ông ghé qua.
• Phạm vi hành trình của ông dựa phần lớn vào lời kể được ghi lại sau khi trở về Maroc, chứ không phải nhật ký viết hằng ngày còn nguyên vẹn.
• Rihla cung cấp tư liệu về giao thương, luật Hồi giáo và đời sống đô thị ở nhiều vùng thế kỷ XIV.`,
    en: `CONTEXT AND LEGACY
• Ibn Battuta left Tangier in 1325 for pilgrimage to Mecca, then continued traveling through appointments and opportunities in cities he visited.
• The itinerary is based largely on the account recorded after his return to Morocco, not on a surviving day-by-day journal.
• The Rihla offers evidence about trade, Islamic law, and urban life across several regions in the fourteenth century.`,
  },
  "rare-rumi-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Rumi sống tại Konya, khi ấy thuộc vương quốc Seljuk Rum, và giảng dạy luật Hồi giáo trước khi gặp nhà thần bí Shams of Tabriz.
• Cuộc gặp gỡ được xem là bước ngoặt trong thơ ca của ông; nhiều chi tiết về mối quan hệ này được kể lại qua truyền thống sau đó.
• Các tác phẩm của Rumi được đọc trong bối cảnh thi ca Sufi, với nhiều bản dịch hiện đại đã phóng tác hoặc diễn giải tự do.`,
    en: `CONTEXT AND LEGACY
• Rumi lived in Konya, then part of the Seljuk Sultanate of Rum, and taught Islamic law before meeting the mystic Shams of Tabriz.
• Their encounter is treated as a turning point in his poetry, though many details come through later traditions.
• Rumi's works belong to Sufi literary contexts, and many modern English versions are adaptations rather than literal translations.`,
  },
  "rare-al-khwarizmi-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Al-Khwarizmi làm việc trong môi trường nghiên cứu của Baghdad, nơi các học giả dịch và phát triển toán học từ nhiều truyền thống.
• Sách đại số của ông trình bày các phép biến đổi phương trình bằng lời và ví dụ số, phục vụ cả nhu cầu tính toán thực tế.
• Các bản dịch Latin giúp phương pháp này lan rộng tại châu Âu; lịch sử đại số còn có đóng góp của nhiều học giả Ấn Độ, Hy Lạp và Ả Rập.`,
    en: `CONTEXT AND LEGACY
• Al-Khwarizmi worked in Baghdad's scholarly milieu, where researchers translated and extended mathematics from many traditions.
• His algebra book explained equation transformations in words and numerical examples for practical calculation.
• Latin translations carried these methods into Europe; algebra's history also includes contributions from Indian, Greek, and other Arabic scholars.`,
  },
  "rare-omar-khayyam-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Khayyam làm việc dưới triều Seljuk và tham gia nhóm học giả cải cách lịch theo yêu cầu của Malik-Shah.
• Ông viết về hình học và phương trình, đồng thời sáng tác rubaiyat; nhiều bài thơ được gán cho ông nhưng việc xác định tác giả từng bài không phải lúc nào cũng chắc chắn.
• Bản dịch tự do của FitzGerald thế kỷ XIX tạo hình ảnh Khayyam nổi bật trong văn học tiếng Anh. Văn bản Ba Tư còn lại qua nhiều truyền bản, đôi khi khác nhau về tác giả và cách sắp xếp.`,
    en: `CONTEXT AND LEGACY
• Khayyam worked under the Seljuk dynasty and joined a scholarly group revising the calendar at Malik-Shah's request.
• He wrote on geometry and equations as well as rubaiyat; poems attributed to him are not all securely authenticated.
• FitzGerald's free nineteenth-century adaptation made Khayyam a major figure in English-language literature. The Persian poems survive in manuscript traditions that sometimes differ on authorship and arrangement.`,
  },
  "rare-akbar-the-great-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Akbar lên ngôi khi còn nhỏ, trong giai đoạn đế quốc Mughal phải củng cố quyền lực tại Bắc Ấn Độ.
• Ông dựa vào mạng lưới quan chức nhiều nguồn gốc, cải tổ thuế đất và mở rộng quan hệ với các thủ lĩnh địa phương.
• Các cuộc thảo luận tôn giáo tại triều đình được ghi lại trong văn bản của Abu'l-Fazl, người đồng thời xây dựng hình ảnh chính thống về hoàng đế. Triều đại của Akbar cũng thay đổi quan hệ giữa quyền lực trung ương và giới tinh hoa địa phương.`,
    en: `CONTEXT AND LEGACY
• Akbar came to the throne as a child while the Mughal Empire was still consolidating power in northern India.
• He used officials from diverse backgrounds, reformed land revenue, and expanded alliances with local rulers.
• Court religious debates were recorded by Abu'l-Fazl, whose writings also helped shape the emperor's official image. Akbar's reign reshaped relations between imperial authority and local elites across a diverse population.`,
  },
  "rare-tokugawa-ieyasu-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Ieyasu trải qua thời Sengoku với nhiều liên minh thay đổi, từng phục vụ Oda Nobunaga rồi Toyotomi Hideyoshi trước khi củng cố quyền lực riêng.
• Sau Sekigahara, ông phân phối đất đai và chức vụ cho các lãnh chúa để ổn định trật tự mới.
• Mạc phủ Tokugawa duy trì hòa bình tương đối lâu dài, nhưng xã hội Edo vẫn có phân tầng nghiêm ngặt và kiểm soát chính trị chặt chẽ.`,
    en: `CONTEXT AND LEGACY
• Ieyasu lived through the Sengoku era of shifting alliances, serving Oda Nobunaga and Toyotomi Hideyoshi before securing his own power.
• After Sekigahara, he distributed land and offices among lords to stabilize the new order.
• The Tokugawa shogunate maintained relative peace for a long period, while Edo society retained strict status divisions and political control.`,
  },
  "rare-florence-nightingale-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Nightingale xuất thân từ gia đình khá giả nhưng chọn nghề điều dưỡng khi công việc này chưa được xem trọng tại Anh.
• Trong Chiến tranh Crimea, bà và đội ngũ cải thiện vệ sinh bệnh viện; biểu đồ thống kê giúp bà trình bày mối liên hệ giữa điều kiện chăm sóc và tử vong.
• Bà tiếp tục vận động cải cách y tế công cộng và đào tạo chuyên môn sau khi trở về. Mô hình Nightingale cũng ảnh hưởng đến quy hoạch bệnh viện và việc thu thập thống kê sức khỏe.`,
    en: `CONTEXT AND LEGACY
• Nightingale came from a wealthy family but chose nursing when the work was not highly regarded in Britain.
• During the Crimean War, she and her team improved hospital sanitation; statistical charts helped show links between care conditions and deaths.
• After returning home, she continued advocating for public-health reform and professional training. Her model also influenced hospital planning and the collection of health statistics.`,
  },
  "rare-harriet-tubman-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Tubman lớn lên trong cảnh nô lệ tại Maryland, chịu bạo lực và chấn thương đầu có ảnh hưởng lâu dài đến sức khỏe.
• Sau khi tự trốn thoát, bà nhiều lần dẫn người thân và những người khác đi về phía các bang tự do, bất chấp nguy cơ bị bắt.
• Những câu chuyện về bà được các nhà báo và người viết tiểu sử ghi lại, đôi khi khác nhau về số chuyến đi và người được giải cứu.`,
    en: `CONTEXT AND LEGACY
• Tubman was enslaved in Maryland and endured violence and a head injury that affected her health for life.
• After escaping, she repeatedly guided relatives and others toward free states despite the danger of capture.
• Journalists and biographers recorded her story, with accounts sometimes differing on the number of trips and people rescued.`,
  },
  "rare-frederick-douglass-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Douglass tự học đọc và viết khi còn bị nô lệ, rồi trốn đến miền Bắc và diễn thuyết công khai về chế độ nô lệ.
• Ông xuất bản báo North Star, tham gia các chiến dịch bãi nô và gặp Tổng thống Lincoln trong Nội chiến.
• Sau năm 1865, ông giữ nhiều chức vụ liên bang và tiếp tục vận động cho quyền của người Mỹ gốc Phi. Các bài diễn thuyết và tự truyện của ông trở thành tư liệu bền vững cho phong trào bãi nô.`,
    en: `CONTEXT AND LEGACY
• Douglass secretly learned to read and write while enslaved, then escaped north and spoke publicly about slavery.
• He published the newspaper North Star, joined abolitionist campaigns, and met President Lincoln during the Civil War.
• After 1865, he held several federal posts and continued advocating for African Americans' rights. His speeches and autobiographies became lasting sources for the abolitionist cause.`,
  },
  "rare-michael-faraday-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Faraday không được học đại học; khi làm thợ đóng sách, ông đọc các sách khoa học và tự học hóa học, vật lý.
• Ông trở thành trợ lý của Humphry Davy tại Viện Hoàng gia rồi tiến hành thí nghiệm nổi tiếng về điện và từ.
• Faraday từ chối nhiều danh hiệu cao quý, nhưng các bài giảng khoa học đại chúng của ông thu hút đông đảo người nghe. Các phát hiện của ông khiến thí nghiệm trở thành trọng tâm trong giáo dục khoa học đại chúng.`,
    en: `CONTEXT AND LEGACY
• Faraday did not attend university; while working as a bookbinder, he read scientific books and taught himself chemistry and physics.
• He became Humphry Davy's assistant at the Royal Institution and later conducted landmark experiments on electricity and magnetism.
• Faraday declined several honors, while his public science lectures attracted large audiences. His discoveries also made experiment central to public science education.`,
  },
  "rare-louis-pasteur-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Pasteur ban đầu nghiên cứu hóa học tinh thể trước khi chuyển sang lên men và vi sinh vật học.
• Thí nghiệm với bình cổ thiên nga bác bỏ quan niệm vi sinh vật tự sinh trong điều kiện thông thường.
• Vaccine phòng bệnh dại được thử nghiệm năm 1885; thành quả dựa trên nghiên cứu của Pasteur và công sức của cộng sự trong phòng thí nghiệm. Những phương pháp này thúc đẩy an toàn thực phẩm và nghiên cứu bệnh truyền nhiễm, đồng thời làm thay đổi thực hành y tế công cộng.`,
    en: `CONTEXT AND LEGACY
• Pasteur first studied the chemistry of crystals before turning to fermentation and microbiology.
• His swan-neck flask experiments challenged the idea that microorganisms spontaneously arose under ordinary conditions.
• A rabies vaccine was tested in 1885; the achievement depended on Pasteur's research and the work of laboratory collaborators. These methods advanced food safety and infectious-disease research and changed public-health practice.`,
  },
  "rare-raphael-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Raphael học nghề ở Urbino và Perugia trước khi đến Florence, nơi ông nghiên cứu tác phẩm của Leonardo và Michelangelo.
• Giáo hoàng Julius II giao cho ông trang trí các phòng trong Vatican; nhiều trợ lý cùng tham gia hoàn thiện những dự án lớn.
• Ông qua đời ở tuổi 37, nhưng xưởng và các tác phẩm của ông tiếp tục ảnh hưởng tới hội họa châu Âu. Xưởng của ông đào tạo nghệ sĩ trẻ và giúp lan tỏa phong cách Phục Hưng Ý.`,
    en: `CONTEXT AND LEGACY
• Raphael trained in Urbino and Perugia before moving to Florence, where he studied the work of Leonardo and Michelangelo.
• Pope Julius II commissioned him to decorate rooms in the Vatican, with assistants helping complete large projects.
• He died at thirty-seven, but his workshop and paintings continued to influence European art. His workshop trained younger artists and helped spread a coherent style across Italy.`,
  },
  "rare-vincent-van-gogh-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Van Gogh từng làm việc trong ngành nghệ thuật, giảng dạy và truyền giáo trước khi tập trung vẽ tranh.
• Ông sống tại Hà Lan, Paris, Arles và Saint-Rémy; những nơi này tạo nên nhiều thay đổi trong màu sắc và phong cách.
• Em dâu Johanna van Gogh-Bonger bảo quản thư từ, tổ chức triển lãm và góp phần đưa tác phẩm của ông đến công chúng.`,
    en: `CONTEXT AND LEGACY
• Van Gogh worked in the art trade, teaching, and missionary activity before concentrating on painting.
• He lived in the Netherlands, Paris, Arles, and Saint-Rémy; each place shaped changes in his color and style.
• His sister-in-law Johanna van Gogh-Bonger preserved letters, organized exhibitions, and helped bring his work to wider audiences.`,
  },
  "common-catherine-the-great-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Catherine sinh tại một gia đình quý tộc Đức, đến Nga khi kết hôn với người thừa kế Peter III và học tiếng Nga.
• Bà lên ngôi sau cuộc đảo chính năm 1762; các cuộc chiến mở rộng ảnh hưởng của Nga về phía Biển Đen và Ba Lan.
• Những cải cách giáo dục và văn hóa cùng việc duy trì chế độ nông nô khiến di sản của bà vừa có thành tựu vừa gây tranh luận. Thư từ của bà với các triết gia châu Âu góp phần quảng bá hình ảnh chuyên chế khai sáng.`,
    en: `CONTEXT AND LEGACY
• Catherine was born into a German noble family, moved to Russia through marriage, and learned the Russian language.
• She took power after the 1762 coup; wars expanded Russian influence toward the Black Sea and Poland.
• Educational and cultural reforms coexisted with continued serfdom, leaving a legacy of achievement and controversy. Her correspondence with European thinkers helped promote an image of enlightened absolutism.`,
  },
  "common-peter-the-great-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Peter đi cùng một phái đoàn ngoại giao tới Tây Âu và học hỏi về đóng tàu, quân sự cùng kỹ thuật.
• Ông thành lập hải quân thường trực, xây dựng Saint Petersburg và cải tổ nhiều cơ quan nhà nước.
• Các thay đổi của ông tăng sức mạnh đế quốc nhưng cũng đòi hỏi thuế cao và lao động cưỡng bức từ dân chúng. Cải cách tác động đến trang phục, giáo dục và nghĩa vụ của tầng lớp tinh hoa.`,
    en: `CONTEXT AND LEGACY
• Peter traveled with a diplomatic mission to western Europe and studied shipbuilding, military practice, and technology.
• He established a permanent navy, founded Saint Petersburg, and reformed many state institutions.
• His changes strengthened the empire but also demanded heavy taxes and forced labor from the population. Reforms affected dress, education, and obligations among the elite.`,
  },
  "common-queen-victoria-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Victoria lên ngôi năm 18 tuổi và kết hôn với Hoàng thân Albert năm 1840; họ có chín người con.
• Sau khi Albert qua đời năm 1861, bà để tang lâu dài và rút khỏi nhiều hoạt động công chúng trong một thời gian.
• Đế quốc Anh mở rộng dưới triều đại bà, trong khi quyền lực ngày càng chuyển sang nghị viện và chính phủ.`,
    en: `CONTEXT AND LEGACY
• Victoria became queen at eighteen and married Prince Albert in 1840; they had nine children.
• After Albert's death in 1861, she remained in prolonged mourning and withdrew from many public duties for a time.
• The British Empire expanded during her reign as political authority increasingly shifted toward Parliament and government.`,
  },
  "common-abraham-lincoln-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Lincoln trưởng thành tại vùng biên giới Kentucky, Indiana và Illinois, tự học luật rồi trở thành luật sư và chính khách.
• Ông thắng cử tổng thống năm 1860 trong lúc xung đột về nô lệ và quyền của các bang ngày càng căng thẳng.
• Tu chính án thứ 13 bãi bỏ chế độ nô lệ trên toàn quốc sau khi ông qua đời, trong tiến trình tái thiết còn nhiều tranh chấp. Diễn văn Gettysburg vẫn là một phần tiêu biểu của ngôn ngữ chính trị Hoa Kỳ.`,
    en: `CONTEXT AND LEGACY
• Lincoln grew up on the Kentucky, Indiana, and Illinois frontier, studied law independently, and became a lawyer and politician.
• He won the presidency in 1860 as conflict over slavery and states' rights intensified.
• The Thirteenth Amendment abolished slavery nationwide after his death, amid a contested Reconstruction process. The Gettysburg Address remains a defining piece of American political rhetoric.`,
  },
  "common-martin-luther-king-jr-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• King trở thành mục sư tại Montgomery, Alabama, và giữ vai trò lãnh đạo trong cuộc tẩy chay xe buýt năm 1955–1956.
• Các cuộc tuần hành và chiến dịch do nhiều nhà hoạt động tổ chức đã góp phần tạo áp lực cho Đạo luật Dân quyền 1964.
• Ông cũng lên tiếng về nghèo đói và chiến tranh; di sản của phong trào rộng hơn vai trò của bất kỳ một lãnh đạo nào. Các chiến dịch dựa vào mạng lưới nhà thờ, sinh viên và cộng đồng địa phương.`,
    en: `CONTEXT AND LEGACY
• King became a pastor in Montgomery, Alabama, and helped lead the 1955–1956 bus boycott.
• Marches and campaigns organized by many activists helped build support for the Civil Rights Act of 1964.
• He also spoke about poverty and war; the movement's legacy extends beyond any single leader. Campaigns depended on networks of churches, students, and local communities.`,
  },
  "common-simon-bolivar-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Bolívar sinh trong một gia đình giàu có ở Caracas, mất cha mẹ khi còn nhỏ và được giáo dục tại châu Âu.
• Các chiến dịch quân sự của ông dựa vào liên minh giữa nhiều nhóm địa phương và trải qua những thất bại trước khi giành thắng lợi.
• Kế hoạch thống nhất các nước mới độc lập trong Gran Colombia tan rã vì khác biệt khu vực và tranh chấp quyền lực.`,
    en: `CONTEXT AND LEGACY
• Bolívar was born into a wealthy Caracas family, lost both parents young, and received part of his education in Europe.
• His military campaigns relied on alliances among diverse local groups and suffered setbacks before eventual victories.
• His plan to unite the new states in Gran Colombia weakened amid regional differences and political rivalries.`,
  },
  "common-jose-de-san-martin-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• San Martín sinh tại vùng nay thuộc Argentina nhưng gia nhập quân đội Tây Ban Nha khi còn trẻ.
• Ông trở về Nam Mỹ năm 1812, tổ chức Quân đội Andes và phối hợp với các lực lượng địa phương chống lại quân đội hoàng gia.
• Sau cuộc gặp với Bolívar tại Guayaquil năm 1822, ông rút khỏi chiến trường và sống lưu vong tại châu Âu.`,
    en: `CONTEXT AND LEGACY
• San Martín was born in what is now Argentina but joined the Spanish army as a young man.
• He returned to South America in 1812, organized the Army of the Andes, and coordinated with local forces against royalist troops.
• After meeting Bolívar at Guayaquil in 1822, he withdrew from the campaign and lived in European exile.`,
  },
  "common-sun-yat-sen-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Sun học y khoa tại Hong Kong nhưng sớm chuyển sang hoạt động cách mạng, vận động cộng đồng người Hoa ở nước ngoài.
• Cách mạng Tân Hợi lật đổ nhà Thanh năm 1911; ông trở thành tổng thống lâm thời nhưng nhanh chóng phải nhường chức.
• Trung Quốc tiếp tục chia rẽ sau khi ông mất, và nhiều lực lượng chính trị khác nhau cùng nhận mình kế thừa tư tưởng của ông.`,
    en: `CONTEXT AND LEGACY
• Sun studied medicine in Hong Kong but soon turned to revolutionary work, organizing Chinese communities abroad.
• The 1911 Revolution ended the Qing dynasty; he became provisional president but soon yielded the office.
• China remained divided after his death, and several political movements claimed parts of his legacy.`,
  },
  "common-rabindranath-tagore-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Tagore sinh trong một gia đình hoạt động văn hóa tại Bengal và bắt đầu sáng tác từ khi còn nhỏ.
• Ông thành lập trường học Santiniketan, nhấn mạnh học tập ngoài trời, nghệ thuật và giao lưu giữa các nền văn hóa.
• Năm 1919, ông trả lại tước hiệp sĩ để phản đối vụ thảm sát Amritsar, dù quan điểm chính trị của ông không hoàn toàn trùng với các phong trào dân tộc.`,
    en: `CONTEXT AND LEGACY
• Tagore was born into a culturally active Bengali family and began writing while still young.
• He founded the Santiniketan school, emphasizing outdoor study, the arts, and exchange among cultures.
• In 1919 he renounced his knighthood in protest against the Amritsar massacre, though his political views did not fully align with nationalist movements.`,
  },
  "common-katsushika-hokusai-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Hokusai đổi tên nghệ thuật nhiều lần và làm việc với tranh in, sách minh họa cùng bản vẽ hướng dẫn.
• Ông tiếp tục sáng tác ở tuổi cao, thường chuyển nơi ở và tìm cách quan sát thiên nhiên từ nhiều góc nhìn.
• Tranh in của ông được xuất khẩu sang châu Âu thế kỷ XIX và ảnh hưởng đến nhiều họa sĩ, nhà sưu tập phương Tây. Lời tự thuật muộn của Hokusai về việc học cách vẽ thiên nhiên thường được trích dẫn qua bản dịch.`,
    en: `CONTEXT AND LEGACY
• Hokusai used many artistic names and worked in prints, illustrated books, and instructional drawings.
• He continued creating in old age, moved frequently, and sought new ways to observe nature.
• His prints reached Europe in the nineteenth century and influenced many Western artists and collectors. His late reflection on learning to draw nature is often quoted in translation.`,
  },
  "common-frida-kahlo-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Một tai nạn xe buýt năm 1925 khiến Kahlo bị thương nặng và phải trải qua nhiều ca phẫu thuật.
• Bà dùng tự họa để thể hiện cơ thể, bản sắc và trải nghiệm riêng; tác phẩm kết hợp biểu tượng dân gian, hiện thực và tưởng tượng.
• Khi sinh thời bà được biết đến trong giới nghệ thuật, nhưng danh tiếng quốc tế rộng lớn tăng mạnh sau khi bà qua đời. Nhiều tác phẩm của bà hiện được lưu giữ trong gia đình và các bộ sưu tập ở Mexico.`,
    en: `CONTEXT AND LEGACY
• A 1925 bus accident left Kahlo seriously injured and led to many operations.
• She used self-portraits to explore the body, identity, and personal experience, combining folk symbols with realism and fantasy.
• She was known in artistic circles during her life, while her international fame grew greatly after her death. Many works remained with her family or in Mexican collections.`,
  },
  "common-claude-monet-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Monet từng gặp khó khăn tài chính và bị giới nghệ thuật chính thống phản đối khi cùng các họa sĩ khác tổ chức triển lãm độc lập.
• Ông thường vẽ ngoài trời và quay lại cùng một cảnh vật để ghi nhận ánh sáng, thời tiết và thời điểm khác nhau.
• Tại Giverny, ông thiết kế khu vườn và ao hoa súng, nơi trở thành chủ đề cho nhiều bức tranh cuối đời. Những thử nghiệm của ông cùng đồng nghiệp giúp định hình trường phái Ấn tượng.`,
    en: `CONTEXT AND LEGACY
• Monet faced financial hardship and resistance from the art establishment while organizing independent exhibitions with fellow painters.
• He often painted outdoors and returned to the same scene to capture changing light, weather, and time.
• At Giverny he designed a garden and water-lily pond that became subjects of many late paintings. Experiments shared with fellow painters helped define Impressionism.`,
  },
  "common-charles-dickens-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Khi còn nhỏ, Dickens từng làm việc trong nhà máy xi đánh giày sau khi cha bị giam vì nợ; trải nghiệm này ảnh hưởng đến văn chương của ông.
• Ông nổi tiếng qua các kỳ phát hành truyện trên báo, thường kết hợp hồi hộp, hài hước và bình luận xã hội.
• Dickens cũng đi diễn thuyết và đọc tác phẩm trước công chúng tại Anh và Hoa Kỳ.`,
    en: `CONTEXT AND LEGACY
• As a child, Dickens worked in a blacking factory after his father was imprisoned for debt; the experience shaped his writing.
• He became famous through serialized fiction that mixed suspense, humor, and social criticism.
• Dickens also toured Britain and the United States giving public readings of his work.`,
  },
  "common-jane-austen-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Austen sống phần lớn đời mình trong các cộng đồng nông thôn Anh và quan sát những giới hạn pháp lý, kinh tế của phụ nữ.
• Bà viết bản thảo trong nhiều năm; các cuốn đầu được phát hành với dòng ghi tác giả là “một quý cô”.
• Tiểu thuyết của bà tiếp tục được chuyển thể và nghiên cứu nhờ cấu trúc chặt chẽ, lời thoại tinh tế và cách nhìn về tầng lớp xã hội. Các nhà văn cùng thời và độc giả về sau đánh giá cao nghệ thuật kể chuyện của bà.`,
    en: `CONTEXT AND LEGACY
• Austen spent much of her life in English country communities and observed women's legal and economic constraints.
• She worked on manuscripts for years; early books named their author only as “a lady.”
• Her novels remain widely adapted and studied for structure, subtle dialogue, and insight into social class. Contemporary writers and later readers praised her narrative craft.`,
  },
  "common-miguel-de-cervantes-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Cervantes tham chiến tại Lepanto năm 1571 và bị thương ở tay trái; sau đó ông bị cướp biển bắt và giam tại Algiers nhiều năm.
• Khi trở về Tây Ban Nha, ông làm nhiều nghề trước khi Don Quixote đem lại danh tiếng rộng lớn.
• Tác phẩm thường được đọc như lời châm biếm truyện hiệp sĩ, đồng thời đặt câu hỏi về trí tưởng tượng, danh dự và đời sống thường nhật.`,
    en: `CONTEXT AND LEGACY
• Cervantes fought at Lepanto in 1571 and injured his left hand; pirates later captured him and held him in Algiers for years.
• Back in Spain, he worked in several occupations before Don Quixote brought wide recognition.
• The book satirizes chivalric romances while also exploring imagination, honor, and everyday life.`,
  },
  "common-karl-marx-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Marx rời Phổ và sống lưu vong tại Paris, Brussels rồi London, thường xuyên đối mặt với khó khăn tài chính.
• Ông cộng tác lâu dài với Friedrich Engels; nhiều bản thảo được Engels biên tập và xuất bản sau khi Marx mất.
• Các tổ chức lao động và phong trào cách mạng tiếp nhận tư tưởng của Marx theo nhiều cách khác nhau, dẫn tới những diễn giải và tranh luận lớn. Ảnh hưởng của ông lan rộng qua các công đoàn, đảng phái và trường đại học.`,
    en: `CONTEXT AND LEGACY
• Marx left Prussia and lived in exile in Paris, Brussels, and London, often facing financial hardship.
• He collaborated closely with Friedrich Engels; several manuscripts were edited and published by Engels after Marx's death.
• Labor organizations and revolutionary movements adopted Marx's ideas in different ways, producing lasting debate and competing interpretations. His influence spread through unions, political parties, and universities worldwide.`,
  },
  "common-sigmund-freud-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Freud làm việc tại Vienna và phát triển phương pháp phân tâm cùng các cộng sự, trong đó có Josef Breuer.
• Năm 1938, sau khi Đức Quốc xã sáp nhập Áo, ông rời Vienna sang London; bốn chị em gái của ông sau đó bị sát hại trong Holocaust.
• Phân tâm học ảnh hưởng đến văn học và nghệ thuật, dù nhiều giả thuyết của Freud khó kiểm chứng theo tiêu chuẩn khoa học hiện nay. Đồng nghiệp khi ấy cũng tranh luận về phương pháp và bằng chứng của ông.`,
    en: `CONTEXT AND LEGACY
• Freud worked in Vienna and developed psychoanalytic methods with colleagues, including Josef Breuer.
• In 1938, after Nazi Germany annexed Austria, he left Vienna for London; four of his sisters were later murdered in the Holocaust.
• Psychoanalysis influenced literature and art, although many Freudian hypotheses are difficult to test by current scientific standards. His methods and evidence also faced debate among contemporaries.`,
  },
  "common-mary-wollstonecraft-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Wollstonecraft làm gia sư, mở trường học và viết báo trong lúc phụ nữ có rất ít lựa chọn nghề nghiệp độc lập.
• Bà sống tại Paris thời Cách mạng Pháp và ghi lại quan sát trong A Historical and Moral View of the French Revolution.
• Con gái bà, Mary Shelley, trở thành tác giả Frankenstein; những tác phẩm của Wollstonecraft tiếp tục được đọc trong lịch sử tư tưởng nữ quyền.`,
    en: `CONTEXT AND LEGACY
• Wollstonecraft worked as a governess, opened a school, and wrote for publications when women had few independent career options.
• She lived in Paris during the French Revolution and recorded her observations in A Historical and Moral View of the French Revolution.
• Her daughter Mary Shelley became the author of Frankenstein; Wollstonecraft's work remains central to feminist intellectual history.`,
  },
  "common-alexander-fleming-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Fleming học y khoa tại Bệnh viện St Mary's ở London và phục vụ trong quân y ở Thế chiến thứ nhất.
• Ông nhận thấy nấm mốc Penicillium ngăn vi khuẩn phát triển trong một đĩa nuôi cấy, rồi công bố kết quả nghiên cứu năm 1929.
• Việc sản xuất penicillin quy mô lớn đòi hỏi công trình bổ sung của Florey, Chain và nhiều nhà khoa học, kỹ sư khác.`,
    en: `CONTEXT AND LEGACY
• Fleming studied medicine at St Mary's Hospital in London and served in military medicine during the First World War.
• He observed that Penicillium mold inhibited bacteria in a culture dish and published the finding in 1929.
• Mass production of penicillin required further work by Florey, Chain, and many other scientists and engineers.`,
  },
  "common-emmeline-pankhurst-marble": {
    vi: `BỐI CẢNH VÀ DI SẢN
• Pankhurst hoạt động trong các tổ chức đòi quyền bầu cử trước khi thành lập WSPU cùng các con gái.
• Khẩu hiệu “Deeds, not words” gắn với chiến dịch trực tiếp; nhiều thành viên bị bắt và tuyệt thực trong tù.
• Đạo luật năm 1918 trao quyền bầu cử cho một bộ phận phụ nữ Anh; quyền bình đẳng về độ tuổi được thông qua sau khi bà mất. Con gái Christabel và nhiều nhà hoạt động tiếp tục công việc tổ chức.`,
    en: `CONTEXT AND LEGACY
• Pankhurst worked in suffrage organizations before founding the WSPU with her daughters.
• The slogan “Deeds, not words” became associated with direct action; many members were arrested and went on hunger strikes.
• The 1918 law enfranchised some British women; equal voting age was enacted after her death. Her daughter Christabel and many activists carried the organizing work forward.`,
  },
};
