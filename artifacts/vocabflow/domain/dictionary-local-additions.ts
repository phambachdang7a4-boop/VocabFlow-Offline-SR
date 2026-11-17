import { TOEIC_TOPIC_COURSE_ENTRIES } from "./toeic-topic-course-data-loader";

export interface LocalDictionaryAddition {
  term: string;
  definition: string;
  example: string;
  exampleTranslation: string;
  pos: string;
  subPos: string | null;
  allowAdditionalSenses?: boolean;
}

export const LOCAL_DICTIONARY_ADDITIONS_REVISION = "local-additions-v7";

const LOCAL_DICTIONARY_ADDITION_ENTRIES: LocalDictionaryAddition[] = [
  {
    term: "as if",
    definition:
      "Như thể, như là; mô tả điều gì đó có vẻ đúng hoặc được hình dung như thật, nhưng không khẳng định tình huống ấy là sự thật.",
    example: "The child spoke to the author as if they had known each other for years.",
    exampleTranslation: "Đứa trẻ nói chuyện với tác giả như thể hai người đã quen nhau nhiều năm.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "as long as",
    definition:
      "Miễn là; đặt điều kiện để việc ở mệnh đề chính được chấp nhận hoặc tiếp tục. Cụm này cũng có thể chỉ khoảng thời gian kéo dài.",
    example: "You may borrow my compass as long as you return it before sunset.",
    exampleTranslation: "Bạn có thể mượn la bàn miễn là trả lại trước khi mặt trời lặn.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "as much as",
    definition:
      "Dù ... đến đâu; ở đầu mệnh đề, cụm này nhượng bộ một điều (thường là điều người nói thực sự cảm thấy) trước khi nêu ý trái ngược.",
    example: "As much as I like the idea, I cannot approve the budget without figures.",
    exampleTranslation: "Dù rất thích ý tưởng đó, tôi không thể duyệt ngân sách khi chưa có số liệu.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "as soon as",
    definition:
      "Ngay khi; việc ở mệnh đề chính xảy ra ngay sau khi mốc được nêu ở mệnh đề sau.",
    example: "Text me as soon as the plane lands.",
    exampleTranslation: "Hãy nhắn cho tôi ngay khi máy bay hạ cánh.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "as far as",
    definition:
      "Theo như, trong phạm vi mà thông tin hoặc hiểu biết cho phép; giới hạn nhận định đang nêu, không diễn tả điều kiện.",
    example: "As far as the map shows, the footpath ends at the river.",
    exampleTranslation: "Theo như bản đồ thể hiện, lối mòn kết thúc ở con sông.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "as though",
    definition:
      "Như thể, dường như; mô tả một ấn tượng hoặc tình huống được hình dung, chứ không xác nhận tình huống ấy là thật.",
    example: "The dog stared at the empty bowl as though it expected another meal.",
    exampleTranslation: "Con chó nhìn chằm chằm vào chiếc bát trống như thể nó đang chờ thêm thức ăn.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "by the time",
    definition:
      "Đến lúc ... thì; nêu một mốc mà trước hoặc ngay tại đó, việc khác đã xảy ra, hoàn tất hoặc kéo dài đến mốc ấy.",
    example: "The rescue team had been waiting at the village for two hours by the time the ambulance arrived.",
    exampleTranslation: "Đến lúc xe cứu thương đến, đội cứu hộ đã chờ ở làng được hai tiếng.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "inasmuch as",
    definition:
      "Bởi vì, xét theo mức độ mà; cách nói trang trọng, dùng để nêu lý do hoặc giới hạn phạm vi.",
    example: "Inasmuch as two signatures are missing, we cannot approve the form.",
    exampleTranslation: "Vì còn thiếu hai chữ ký, chúng tôi chưa thể duyệt biểu mẫu.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "in order that",
    definition:
      "Để, nhằm để; giới thiệu mục đích, thường dùng trong văn phong trang trọng và hay đi với can, could, may hoặc might.",
    example: "The guide repeated each step slowly in order that every visitor could follow.",
    exampleTranslation: "Người hướng dẫn lặp lại từng bước chậm rãi để mọi khách tham quan có thể theo kịp.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "in case",
    definition:
      "Phòng khi; nói về việc chuẩn bị hoặc biện pháp để ứng phó nếu một khả năng xảy ra, không đơn thuần nêu điều kiện như if.",
    example: "Save the emergency number in your phone in case you need help.",
    exampleTranslation: "Hãy lưu số khẩn cấp vào điện thoại phòng khi bạn cần trợ giúp.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "now that",
    definition:
      "Giờ đây vì, vì hiện tại; nêu hoàn cảnh hiện tại làm lý do cho việc ở mệnh đề chính. Hoàn cảnh đó không nhất thiết vừa mới thay đổi.",
    example: "Now that the repair is finished, the library can reopen.",
    exampleTranslation: "Giờ việc sửa chữa đã xong, thư viện có thể mở cửa lại.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "now when",
    definition:
      "Giờ đây khi, giờ đây mỗi khi; đặt sự việc ở mệnh đề sau vào bối cảnh hiện tại, có thể nói về một lần cụ thể hoặc việc lặp lại; không nêu lý do như now that.",
    example: "Now when I hear the old school bell, I remember my first day.",
    exampleTranslation: "Giờ đây, mỗi khi nghe tiếng chuông trường cũ, tôi lại nhớ ngày đầu tiên đi học.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "even if",
    definition:
      "Ngay cả nếu, ngay cả khi; nêu một điều kiện hoặc khả năng chưa xác định, trong khi kết quả vẫn đúng dù điều kiện ấy có xảy ra hay không.",
    example: "Even if it snows tonight, the airport will remain open.",
    exampleTranslation: "Ngay cả khi tối nay có tuyết, sân bay vẫn sẽ mở cửa.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "even though",
    definition:
      "Mặc dù, dẫu cho; nhượng bộ một sự việc được trình bày như thật hoặc đã biết, trái với điều thường được mong đợi.",
    example: "Even though the road was icy, the bus arrived on time.",
    exampleTranslation: "Mặc dù đường đóng băng, xe buýt vẫn đến đúng giờ.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "provided that",
    definition:
      "Với điều kiện là, miễn là; đặt điều kiện cần để mệnh đề chính đúng. Thường trang trọng hoặc chính thức hơn if.",
    example: "The lab will accept your sample provided that it is sealed before noon.",
    exampleTranslation: "Phòng thí nghiệm sẽ nhận mẫu với điều kiện mẫu được niêm phong trước buổi trưa.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "if only",
    definition:
      "Giá mà; mở đầu lời ước hoặc tiếc nuối. Khi nói về quá khứ, thường diễn tả điều người nói mong đã xảy ra nhưng thực tế không xảy ra.",
    example: "If only I had kept the receipt, I could have returned the headphones.",
    exampleTranslation: "Giá mà tôi đã giữ hóa đơn thì tôi đã có thể trả lại tai nghe.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "just as",
    definition:
      "Đúng lúc, ngay khi; trong nghĩa chỉ thời gian, nêu hai việc xảy ra cùng lúc hoặc gần như cùng lúc.",
    example: "Just as the referee blew the whistle to start the match, the striker kicked the ball.",
    exampleTranslation: "Đúng lúc trọng tài thổi còi khai cuộc, tiền đạo sút bóng.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "so that",
    definition:
      "Để, để cho; thường nêu mục đích và thông dụng hơn in order that. Tùy ngữ cảnh, cụm này cũng có thể nêu kết quả.",
    example: "Nora labeled every jar so that nobody would confuse the spices.",
    exampleTranslation: "Nora dán nhãn lên từng lọ để không ai nhầm các loại gia vị.",
    pos: "conj",
    subPos: "subordinating",
  },
  {
    term: "accordingly",
    definition:
      "Theo đó; điều chỉnh hành động cho phù hợp với tình huống. Khác therefore/consequently, vốn chỉ kết quả hoặc kết luận.",
    example:
      "The opening hours changed, so we adjusted our schedule accordingly.",
    exampleTranslation:
      "Giờ mở cửa đã thay đổi, vì vậy chúng tôi điều chỉnh lịch trình cho phù hợp.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "consequently",
    definition:
      "Do đó; nêu kết quả trực tiếp của sự việc trước. Gần nghĩa với therefore/hence.",
    example:
      "Leo left his passport at home; consequently, he could not board the flight.",
    exampleTranslation:
      "Leo để quên hộ chiếu ở nhà; vì vậy, cậu ấy không thể lên máy bay.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "hence",
    definition:
      "Vì vậy; nối một lý do với kết luận hoặc kết quả. Thường ngắn gọn, hơi trang trọng.",
    example:
      "The bridge is closed; hence, we must take another route.",
    exampleTranslation:
      "Cây cầu đã đóng; vì vậy, chúng ta phải đi đường khác.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "therefore",
    definition:
      "Do đó; đưa ra kết luận hợp lý từ thông tin trước. Thường nhấn mạnh suy luận hoặc kết luận.",
    example:
      "Every safety test passed; therefore, the device is ready to ship.",
    exampleTranslation:
      "Mọi bài kiểm tra an toàn đều đạt; vì vậy, thiết bị đã sẵn sàng để giao.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "then",
    definition:
      "Sau đó; chỉ bước tiếp theo trong một trình tự.",
    example: "Label each jar; then, place it on the correct shelf.",
    exampleTranslation:
      "Hãy dán nhãn từng lọ; sau đó, đặt lọ lên đúng kệ.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "finally",
    definition:
      "Cuối cùng; chỉ bước cuối hoặc kết quả ở cuối một chuỗi.",
    example:
      "We checked every page and finally found the missing signature.",
    exampleTranslation:
      "Chúng tôi kiểm tra từng trang và cuối cùng tìm thấy chữ ký còn thiếu.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "furthermore",
    definition:
      "Hơn nữa; bổ sung một lý do hoặc thông tin hỗ trợ.",
    example:
      "The bike is affordable; furthermore, its battery lasts all day.",
    exampleTranslation:
      "Chiếc xe đạp có giá phải chăng; hơn nữa, pin dùng được cả ngày.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "moreover",
    definition:
      "Hơn nữa; thêm một ý hỗ trợ cho nhận định trước.",
    example:
      "The museum is free; moreover, it is open every Sunday.",
    exampleTranslation:
      "Bảo tàng miễn phí; hơn nữa, nơi này mở cửa vào mỗi Chủ nhật.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "meanwhile",
    definition:
      "Trong lúc đó; hai việc diễn ra đồng thời.",
    example:
      "The rice is cooking; meanwhile, chop the vegetables.",
    exampleTranslation:
      "Cơm đang nấu; trong lúc đó, hãy cắt rau củ.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "however",
    definition:
      "Tuy nhiên; nêu một ý trái với điều người đọc có thể mong đợi.",
    example:
      "The forecast promised sunshine; however, it rained all afternoon.",
    exampleTranslation:
      "Dự báo nói trời sẽ nắng; tuy nhiên, trời mưa suốt buổi chiều.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "nevertheless",
    definition:
      "Dù vậy; nhấn mạnh kết quả vẫn xảy ra bất chấp trở ngại.",
    example:
      "The path was steep; nevertheless, the hikers continued to the summit.",
    exampleTranslation:
      "Con đường dốc; dù vậy, nhóm đi bộ vẫn tiếp tục lên đỉnh.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "nonetheless",
    definition:
      "Mặc dù thế; cho biết sự việc vẫn xảy ra dù có trở ngại.",
    example:
      "The instructions looked complicated; nonetheless, Ava built the desk.",
    exampleTranslation:
      "Hướng dẫn trông có vẻ phức tạp; mặc dù thế, Ava vẫn lắp được chiếc bàn.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "instead",
    definition:
      "Thay vào đó; chọn một hành động khác để thay thế.",
    example:
      "The café had no tables, so we ordered takeaway instead.",
    exampleTranslation:
      "Quán cà phê không còn bàn, vì vậy chúng tôi gọi đồ mang đi thay vào đó.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "rather",
    definition:
      "Đúng hơn là; sửa lại hoặc nói chính xác hơn ý vừa nêu.",
    example:
      "The problem was not the price; rather, the delivery was too slow.",
    exampleTranslation:
      "Vấn đề không nằm ở giá; đúng hơn là khâu giao hàng quá chậm.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "indeed",
    definition:
      "Quả thật; nhấn mạnh hoặc củng cố ý vừa nêu.",
    example:
      "The hike was demanding; indeed, we climbed for six hours.",
    exampleTranslation:
      "Chuyến đi bộ thật vất vả; quả thật, chúng tôi đã leo suốt sáu tiếng.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "likewise",
    definition:
      "Tương tự như vậy; nối một trường hợp có cách làm giống trường hợp trước.",
    example:
      "Mai volunteered at the shelter; likewise, her brother gave up weekends to help.",
    exampleTranslation:
      "Mai tình nguyện ở mái ấm; tương tự, anh trai cô cũng dành cuối tuần để giúp đỡ.",
    pos: "adv",
    subPos: null,
  },
  {
    term: "similarly",
    definition:
      "Tương tự; chỉ ra rằng trường hợp tiếp theo có điểm giống trường hợp trước.",
    example:
      "The first class improved its scores. Similarly, the second class made progress.",
    exampleTranslation:
      "Lớp đầu tiên cải thiện điểm số. Tương tự, lớp thứ hai cũng tiến bộ.",
    pos: "adv",
    subPos: null,
  },
];

export const LOCAL_DICTIONARY_ADDITIONS =
  LOCAL_DICTIONARY_ADDITION_ENTRIES.filter((entry) => entry.pos === "conj");

// These curated definitions intentionally supplement existing upstream headwords.
export const LINKING_ADVERB_DICTIONARY_ADDITIONS =
  LOCAL_DICTIONARY_ADDITION_ENTRIES.filter((entry) => entry.pos === "adv").map(
    (entry) => ({ ...entry, allowAdditionalSenses: true }),
  );

export const LOCAL_DICTIONARY_WORD_ADDITIONS: LocalDictionaryAddition[] = [
  {
    term: "fly",
    definition:
      "Bay; di chuyển trong không trung bằng cánh hoặc bằng phương tiện bay. Quá khứ: flew; phân từ quá khứ: flown.",
    example: "The birds have flown south for the winter.",
    exampleTranslation: "Đàn chim đã bay về phương nam để tránh mùa đông.",
    pos: "v",
    subPos: null,
  },
];

export const TOEIC_TOPIC_DICTIONARY_ADDITIONS: LocalDictionaryAddition[] =
  Object.entries(TOEIC_TOPIC_COURSE_ENTRIES).map(([term, entry]) => ({
    term,
    definition: entry.definition,
    example: entry.example,
    exampleTranslation: entry.exampleTranslation,
    pos: "phrase",
    subPos: null,
    allowAdditionalSenses: true,
  }));

export const ALL_LOCAL_DICTIONARY_ADDITIONS: readonly LocalDictionaryAddition[] = [
  ...LOCAL_DICTIONARY_ADDITIONS,
  ...LINKING_ADVERB_DICTIONARY_ADDITIONS,
  ...LOCAL_DICTIONARY_WORD_ADDITIONS,
  ...TOEIC_TOPIC_DICTIONARY_ADDITIONS,
];
