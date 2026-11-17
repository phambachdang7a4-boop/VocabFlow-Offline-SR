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

export const LOCAL_DICTIONARY_ADDITIONS_REVISION = "local-additions-v5";

export const LOCAL_DICTIONARY_ADDITIONS: LocalDictionaryAddition[] = [
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
];

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
  ...LOCAL_DICTIONARY_WORD_ADDITIONS,
  ...TOEIC_TOPIC_DICTIONARY_ADDITIONS,
];
