import courseData from "./phrasal-verb-course-data.json";

export interface PhrasalVerbCourseEntry {
  definition: string;
  example: string;
  exampleTranslation?: string;
  spellingNote?: string;
  rootVerb?: string;
  topicId?: string;
  topicTitle?: string;
  partOfSpeech?: string;
  dictionarySource?: "offline";
}

export interface PhrasalVerbCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface PhrasalVerbCourseLesson {
  id: string;
  title: string;
  focus: string;
  topicId?: string;
  topicTitle?: string;
  questions: readonly PhrasalVerbCourseQuestion[];
}

interface DictionaryPhrasalVerbEntry {
  term: string;
  definition: string;
  example: string;
  rootVerb: string;
  topicId: string;
  topicTitle: string;
  partOfSpeech: string;
  dictionarySource: "offline";
}

interface DictionaryPhrasalVerbTopic {
  id: string;
  title: string;
  focus: string;
  terms: string[];
}

interface DictionaryPhrasalVerbData {
  generatedFrom: string;
  sourceSha256: string;
  uniqueTerms: number;
  topics: DictionaryPhrasalVerbTopic[];
  entries: Record<string, DictionaryPhrasalVerbEntry>;
}

type EntryRow = readonly [
  term: string,
  definition: string,
  example: string,
  exampleTranslation: string,
  note?: string,
];

type Topic = {
  id: string;
  title: string;
  focus: string;
  entries: readonly EntryRow[];
};

export const PHRASAL_VERB_COURSE_ID = "phrasal-verbs-v1";
export const PHRASAL_VERB_COURSE_TITLE = "Cụm động từ thông dụng";

const TOPICS: readonly Topic[] = [
  {
    id: "curated-daily-life",
    title: "Sinh hoạt hằng ngày",
    focus: "Thức dậy, chuẩn bị và làm những việc thường nhật.",
    entries: [
      ["wake up", "thức giấc, không còn ngủ", "I wake up before dawn but stay in bed until my alarm rings.", "Tôi thức giấc trước bình minh nhưng vẫn nằm trên giường cho đến khi chuông báo thức reo."],
      ["get up", "ra khỏi giường để bắt đầu ngày mới", "I get up and make breakfast before anyone else wakes.", "Tôi ra khỏi giường và làm bữa sáng trước khi những người khác thức dậy."],
      ["lie down", "nằm xuống để nghỉ", "If you feel dizzy, lie down on the sofa.", "Nếu thấy chóng mặt, hãy nằm xuống ghế sofa."],
      ["sit down", "ngồi xuống", "There's a chair for you; please sit down while you wait for the doctor.", "Có ghế dành cho bạn; vui lòng ngồi xuống trong khi chờ bác sĩ."],
      ["stand up", "đứng lên", "Everyone stood up when the judge entered the room.", "Mọi người đứng lên khi thẩm phán bước vào phòng."],
      ["get dressed", "mặc quần áo", "The children get dressed before breakfast.", "Bọn trẻ mặc quần áo trước bữa sáng."],
      ["put on", "mặc hoặc đeo một món đồ lên người", "Put on your coat before you go outside.", "Hãy mặc áo khoác trước khi ra ngoài.", "Có thể tách: put your coat on; đại từ phải đứng giữa: put it on."],
      ["take off", "cởi bỏ quần áo hoặc giày dép", "Please take off your shoes at the door.", "Vui lòng cởi giày ở cửa.", "Có thể tách: take your shoes off; đại từ phải đứng giữa: take them off."],
      ["try on", "mặc thử để xem có vừa hoặc hợp không", "She tried on the blue jacket before buying it.", "Cô ấy mặc thử chiếc áo khoác xanh trước khi mua.", "Có thể tách: try the jacket on; đại từ phải đứng giữa: try it on."],
      ["turn on", "bật thiết bị hoặc nguồn điện", "The kitchen is dark, so could you turn on the light?", "Bếp tối rồi, bạn bật đèn lên giúp tôi được không?", "Có thể tách: turn the light on; đại từ phải đứng giữa: turn it on."],
      ["turn off", "tắt thiết bị hoặc nguồn điện", "The oven timer has rung, so turn off the oven before you leave.", "Chuông hẹn giờ lò đã reo, vậy hãy tắt lò trước khi bạn đi.", "Có thể tách: turn the oven off; đại từ phải đứng giữa: turn it off."],
      ["clean up", "dọn dẹp cho sạch sẽ, gọn gàng", "We clean up the kitchen after dinner.", "Chúng tôi dọn bếp sau bữa tối.", "Có thể tách: clean the kitchen up; đại từ phải đứng giữa: clean it up."],
      ["put away", "cất đồ về đúng chỗ", "Please put away your books before lunch.", "Hãy cất sách vào đúng chỗ trước bữa trưa.", "Có thể tách: put your books away; đại từ phải đứng giữa: put them away."],
      ["throw away", "vứt bỏ thứ không còn cần", "Don't throw away the receipt; we may need it.", "Đừng vứt hóa đơn đi; có thể chúng ta sẽ cần nó.", "Có thể tách: throw the receipt away; đại từ phải đứng giữa: throw it away."],
      ["pick up", "đón ai hoặc lấy một món đồ lên", "I'll pick up the parcel from the front desk.", "Tôi sẽ lấy bưu kiện ở quầy lễ tân.", "Có thể tách: pick the parcel up; đại từ phải đứng giữa: pick it up."],
      ["drop off", "đưa ai hoặc vật đến một nơi rồi rời đi", "I drop off my daughter at school before continuing to the office.", "Tôi đưa con gái đến trường trước khi tiếp tục đến văn phòng.", "Có thể tách: drop my daughter off; đại từ phải đứng giữa: drop her off."],
      ["run out of", "dùng hết, không còn thứ gì", "We've run out of milk, so I'll buy some.", "Nhà tôi hết sữa rồi, nên tôi sẽ đi mua.", "Cụm ba từ; tân ngữ theo sau of, không tách."],
      ["fill up", "đổ đầy một vật chứa", "Please fill up the water bottle before the hike.", "Hãy đổ đầy bình nước trước chuyến đi bộ đường dài.", "Có thể tách: fill the bottle up; đại từ phải đứng giữa: fill it up."],
      ["look for", "tìm kiếm thứ đang thất lạc hoặc cần có", "I'm looking for my glasses; have you seen them?", "Tôi đang tìm kính; bạn có thấy chúng không?", "Tân ngữ đứng sau for; không tách."],
      ["find out", "tìm ra hoặc biết được thông tin", "We called the clinic to find out its opening hours.", "Chúng tôi gọi phòng khám để biết giờ mở cửa.", "Có thể tách khi có tân ngữ: find the hours out; đại từ phải đứng giữa."],
    ],
  },
  {
    id: "curated-home",
    title: "Nhà cửa và việc vặt",
    focus: "Sắp xếp nhà cửa, sửa đồ và xử lý việc cá nhân.",
    entries: [
      ["look after", "chăm sóc người hoặc vật", "Mina looks after her neighbor's cat on weekends.", "Mina chăm sóc mèo của hàng xóm vào cuối tuần.", "Tân ngữ đứng sau after; không tách."],
      ["let in", "cho ai hoặc vật đi vào", "Please let in the delivery driver through the side door.", "Hãy cho nhân viên giao hàng vào bằng cửa bên.", "Có thể tách: let the driver in; đại từ đứng giữa: let him in."],
      ["lock up", "khóa cửa để bảo vệ nhà hoặc nơi làm việc", "Remember to lock up before you leave the shop.", "Nhớ khóa cửa trước khi rời cửa hàng.", "Có thể tách: lock the shop up; đại từ đứng giữa: lock it up."],
      ["set up", "lắp đặt hoặc chuẩn bị để sẵn sàng sử dụng", "We set up the new desk in the spare room.", "Chúng tôi lắp chiếc bàn mới trong phòng trống.", "Có thể tách: set the desk up; đại từ đứng giữa: set it up."],
      ["take out", "mang thứ gì từ trong ra ngoài", "The kitchen bin is full; could you take out the rubbish before the cleaners arrive?", "Thùng rác trong bếp đã đầy; bạn mang rác ra ngoài trước khi nhân viên vệ sinh đến được không?", "Có thể tách: take the rubbish out; đại từ đứng giữa: take it out."],
      ["put out", "dập tắt lửa hoặc thuốc đang cháy", "The firefighters put out the small kitchen fire quickly.", "Lính cứu hỏa nhanh chóng dập tắt đám cháy nhỏ trong bếp.", "Có thể tách: put the fire out; đại từ đứng giữa: put it out."],
      ["put down", "đặt một vật xuống bề mặt", "Please put down your bags by the door.", "Vui lòng đặt túi xuống cạnh cửa.", "Có thể tách: put your bags down; đại từ phải đứng giữa: put them down."],
      ["plug in", "cắm phích điện vào ổ", "Plug in the kettle after you fill it and before you switch it on.", "Hãy cắm ấm điện sau khi đổ nước vào và trước khi bật.", "Có thể tách: plug the kettle in; đại từ đứng giữa: plug it in."],
      ["put back", "đặt hoặc trả một vật về chỗ cũ", "Please put back the screwdriver after using it.", "Hãy cất tuốc nơ vít lại sau khi dùng.", "Có thể tách: put the screwdriver back; đại từ phải đứng giữa: put it back."],
      ["turn down", "giảm âm lượng hoặc mức nhiệt", "The music is too loud; please turn down the volume.", "Nhạc to quá; vui lòng giảm âm lượng.", "Có thể tách: turn the music down; đại từ phải đứng giữa: turn it down."],
      ["turn up", "tăng âm lượng hoặc mức nhiệt", "I can't hear the radio; could you turn up the volume?", "Tôi không nghe rõ đài; bạn tăng âm lượng lên được không?", "Có thể tách: turn the radio up; đại từ phải đứng giữa: turn it up."],
      ["move in", "chuyển đến và bắt đầu sống ở một nơi", "Our new neighbors move in next Monday.", "Những người hàng xóm mới sẽ chuyển đến vào thứ Hai tới.", "Không có tân ngữ trực tiếp; không tách."],
      ["move out", "rời khỏi nơi đang sống", "He plans to move out when his lease ends.", "Anh ấy dự định chuyển đi khi hợp đồng thuê nhà hết hạn.", "Không có tân ngữ trực tiếp; không tách."],
      ["fix up", "sửa sang để một vật hoặc căn nhà dùng tốt hơn", "They fixed up the old kitchen over the summer, repairing the cabinets instead of replacing them.", "Họ sửa sang căn bếp cũ trong suốt mùa hè, sửa tủ bếp thay vì thay mới.", "Có thể tách: fix the kitchen up; đại từ đứng giữa: fix it up."],
      ["take apart", "tháo một vật thành các bộ phận", "Dad took apart the broken lamp to find the loose wire.", "Bố tháo chiếc đèn hỏng để tìm sợi dây bị lỏng.", "Có thể tách: take the lamp apart; đại từ đứng giữa: take it apart."],
      ["put together", "lắp các bộ phận thành một vật hoàn chỉnh", "We put together the bookshelf using the instructions.", "Chúng tôi lắp giá sách theo hướng dẫn.", "Có thể tách: put the bookshelf together; đại từ đứng giữa: put it together."],
      ["pay back", "trả lại số tiền đã vay", "I'll pay back the money after I get paid on Friday.", "Tôi sẽ trả lại tiền sau khi nhận lương vào thứ Sáu.", "Có thể tách: pay the money back; đại từ đứng giữa: pay it back."],
      ["bring in", "mang thứ gì từ ngoài vào trong", "Bring in the cushions before it starts to rain.", "Hãy mang đệm vào nhà trước khi trời mưa.", "Có thể tách: bring the cushions in; đại từ đứng giữa: bring them in."],
      ["give away", "cho hoặc tặng một vật mà không lấy tiền", "They gave away the old sofa to a neighbor.", "Họ tặng chiếc ghế sofa cũ cho một người hàng xóm.", "Có thể tách: give the sofa away; đại từ đứng giữa: give it away."],
      ["get rid of", "loại bỏ thứ không còn muốn giữ", "We got rid of the broken chair during the move.", "Chúng tôi bỏ chiếc ghế hỏng khi chuyển nhà.", "Cụm ba từ; tân ngữ đứng sau of, không tách."],
    ],
  },
  {
    id: "curated-work-study",
    title: "Học tập và công việc",
    focus: "Đọc, ghi chép, hoàn thành nhiệm vụ và phối hợp ở nơi làm việc.",
    entries: [
      ["look up", "tra cứu thông tin trong sách hoặc nguồn dữ liệu", "I looked up the word in an online dictionary.", "Tôi tra từ đó trong từ điển trực tuyến.", "Có thể tách: look the word up; đại từ phải đứng giữa: look it up."],
      ["write down", "ghi lại thông tin bằng chữ viết", "Write down the room number before you forget it.", "Hãy ghi số phòng lại trước khi bạn quên.", "Có thể tách: write the number down; đại từ phải đứng giữa: write it down."],
      ["hand in", "nộp bài hoặc tài liệu cho người phụ trách", "Please hand in your assignment by Thursday.", "Vui lòng nộp bài tập trước thứ Năm.", "Có thể tách: hand your assignment in; đại từ đứng giữa: hand it in."],
      ["hand out", "phát tài liệu cho nhiều người", "The teacher handed out the worksheets at the start of class.", "Giáo viên phát phiếu bài tập vào đầu giờ.", "Có thể tách: hand the worksheets out; đại từ đứng giữa: hand them out."],
      ["fill in", "điền thông tin vào chỗ trống hoặc biểu mẫu", "Fill in your name at the top of the form.", "Hãy điền tên bạn vào đầu biểu mẫu.", "Có thể tách: fill the form in; đại từ đứng giữa: fill it in."],
      ["go over", "xem lại hoặc kiểm tra kỹ nội dung", "Let's go over the report before the meeting.", "Hãy cùng xem lại báo cáo trước cuộc họp.", "Tân ngữ đứng sau over; không tách."],
      ["work on", "dành thời gian và công sức để làm hoặc cải thiện việc gì", "I'm working on the budget for next quarter.", "Tôi đang làm ngân sách cho quý tới.", "Tân ngữ đứng sau on; không tách."],
      ["carry out", "thực hiện một kế hoạch, nhiệm vụ hoặc nghiên cứu", "The team carried out a safety check before opening.", "Nhóm đã tiến hành kiểm tra an toàn trước khi mở cửa.", "Có thể tách: carry the check out; đại từ đứng giữa: carry it out."],
      ["figure out", "tìm ra câu trả lời hoặc cách giải quyết", "We figured out why the printer had stopped.", "Chúng tôi tìm ra lý do máy in ngừng hoạt động.", "Có thể tách: figure the reason out; đại từ đứng giữa: figure it out."],
      ["point out", "chỉ ra một sự thật hoặc vấn đề", "The editor pointed out two errors in the final paragraph.", "Biên tập viên chỉ ra hai lỗi trong đoạn cuối.", "Có thể tách: point the errors out; đại từ đứng giữa: point them out."],
      ["put off", "hoãn làm việc gì sang thời điểm muộn hơn", "They put off the interview until next week.", "Họ hoãn buổi phỏng vấn đến tuần sau.", "Có thể tách: put the interview off; đại từ đứng giữa: put it off."],
      ["call off", "hủy một sự kiện hoặc kế hoạch", "The organizers called off the outdoor event because of the storm.", "Ban tổ chức hủy sự kiện ngoài trời vì bão.", "Có thể tách: call the event off; đại từ đứng giữa: call it off."],
      ["take on", "nhận trách nhiệm hoặc đảm nhận công việc", "Jules took on a new project at work.", "Jules nhận một dự án mới ở chỗ làm.", "Có thể tách: take a project on; đại từ đứng giữa: take it on."],
      ["take over", "tiếp quản công việc hoặc vai trò của người khác", "Rosa will take over the team while I'm away.", "Rosa sẽ tiếp quản nhóm khi tôi đi vắng.", "Tân ngữ đứng sau over; không tách."],
      ["catch up", "làm phần việc còn chậm để theo kịp", "I stayed late to catch up on my emails.", "Tôi ở lại muộn để xử lý số email còn tồn.", "Trong catch up on something, tân ngữ theo sau on."],
      ["fall behind", "chậm tiến độ hoặc không theo kịp người khác", "Without a study plan, it's easy to fall behind in class.", "Không có kế hoạch học, bạn rất dễ bị chậm bài trên lớp.", "Không có tân ngữ trực tiếp; không tách."],
      ["keep up", "duy trì tốc độ để không bị tụt lại", "The course is fast, but she can keep up with the lessons.", "Khóa học có nhịp độ nhanh, nhưng cô ấy vẫn theo kịp bài học.", "Trong keep up with something, tân ngữ theo sau with."],
      ["bring up", "đề cập một chủ đề trong cuộc trò chuyện hoặc cuộc họp", "I brought up the delivery delay during the meeting.", "Tôi đề cập việc giao hàng chậm trong cuộc họp.", "Có thể tách: bring the delay up; đại từ đứng giữa: bring it up."],
      ["come up with", "nghĩ ra một ý tưởng hoặc kế hoạch", "The students came up with a simple way to test the idea.", "Các học sinh nghĩ ra một cách đơn giản để thử ý tưởng.", "Cụm ba từ; tân ngữ đứng sau with, không tách."],
      ["read over", "đọc lại để kiểm tra nội dung", "Read over your application before you send it.", "Hãy đọc lại đơn đăng ký trước khi gửi.", "Có thể tách: read your application over; đại từ đứng giữa: read it over."],
    ],
  },
  {
    id: "curated-communication",
    title: "Giao tiếp và các mối quan hệ",
    focus: "Trao đổi, giữ liên lạc và ứng xử với người khác.",
    entries: [
      ["speak up", "nói to hoặc rõ hơn để người khác nghe thấy", "Please speak up; the microphone isn't working.", "Vui lòng nói to hơn; micro không hoạt động.", "Không có tân ngữ trực tiếp; không tách."],
      ["talk over", "thảo luận kỹ một vấn đề trước khi quyết định", "Let's talk over the options before we choose.", "Hãy cùng bàn kỹ các lựa chọn trước khi quyết định.", "Tân ngữ đứng sau over; không tách."],
      ["call back", "gọi điện lại cho người đã liên lạc", "I missed your call, so I'll call back after lunch.", "Tôi lỡ cuộc gọi của bạn, nên sẽ gọi lại sau bữa trưa.", "Có thể tách: call you back; đại từ đứng giữa: call them back."],
      ["get back to", "liên hệ lại với ai để trả lời hoặc tiếp tục trao đổi", "I'll get back to you with an answer this afternoon.", "Chiều nay tôi sẽ liên hệ lại với bạn để trả lời.", "Cụm ba từ; tân ngữ đứng sau to, không tách."],
      ["hang up", "kết thúc cuộc gọi điện thoại", "She hung up after saying goodbye.", "Cô ấy kết thúc cuộc gọi sau khi nói lời tạm biệt.", "Không có tân ngữ trực tiếp; không tách."],
      ["hold on", "chờ trong chốc lát, thường khi đang gọi điện", "Hold on a moment while I check your booking.", "Vui lòng chờ một lát trong khi tôi kiểm tra đặt chỗ.", "Không có tân ngữ trực tiếp; không tách."],
      ["get through", "kết nối được qua điện thoại", "I couldn't get through to the clinic this morning.", "Sáng nay tôi không gọi kết nối được đến phòng khám.", "Trong get through to someone, người nhận theo sau to."],
      ["cut off", "làm gián đoạn đột ngột cuộc gọi hoặc lời nói", "We were cut off when the train entered the tunnel.", "Cuộc gọi của chúng tôi bị ngắt khi tàu đi vào đường hầm.", "Có thể tách: cut the call off; đại từ đứng giữa: cut it off."],
      ["show up", "đến một nơi, nhất là khi đã hẹn hoặc dự kiến", "Nina showed up ten minutes early for the interview.", "Nina đến sớm mười phút cho buổi phỏng vấn.", "Không có tân ngữ trực tiếp; không tách."],
      ["turn away", "không cho ai vào một nơi", "The venue turned away visitors without tickets.", "Địa điểm đó không cho khách không có vé vào.", "Có thể tách: turn visitors away; đại từ đứng giữa: turn them away."],
      ["cheer up", "làm ai vui lên hoặc trở nên vui hơn", "A funny message can cheer up a friend after a difficult day.", "Một tin nhắn vui có thể làm bạn phấn chấn hơn sau ngày khó khăn.", "Có thể tách: cheer a friend up; đại từ đứng giữa."],
      ["calm down", "bình tĩnh lại hoặc làm ai bình tĩnh lại", "Take a deep breath and calm down before you reply.", "Hãy hít sâu và bình tĩnh lại trước khi trả lời.", "Có thể dùng không tân ngữ hoặc tách: calm the child down."],
      ["open up", "bắt đầu chia sẻ suy nghĩ hoặc cảm xúc riêng", "After a few weeks, he opened up about his worries.", "Sau vài tuần, anh ấy bắt đầu chia sẻ những lo lắng của mình.", "Không có tân ngữ trực tiếp trong nghĩa này; không tách."],
      ["make up", "bịa ra một câu chuyện hoặc lời giải thích", "The child made up a story about a friendly dragon.", "Đứa trẻ bịa ra câu chuyện về một con rồng thân thiện.", "Có thể tách: make a story up; đại từ đứng giữa: make it up."],
      ["fall out", "cãi nhau và trở nên không còn thân thiết", "The two friends fell out over a misunderstanding.", "Hai người bạn cãi nhau vì một hiểu lầm.", "Không có tân ngữ trực tiếp; không tách."],
      ["get over", "hồi phục sau bệnh tật hoặc vượt qua chuyện buồn", "It took him a week to get over the flu.", "Anh ấy mất một tuần để khỏi cúm.", "Trong ví dụ này là hồi phục sau bệnh; tân ngữ đứng sau over."],
      ["ask out", "mời ai đi hẹn hò", "Kai plans to ask out a classmate for coffee after class.", "Kai dự định mời một bạn cùng lớp đi uống cà phê sau giờ học.", "Có thể tách: ask someone out; đại từ đứng giữa."],
      ["back down", "nhượng bộ hoặc rút lại lập trường sau bất đồng", "Neither side backed down during the negotiations.", "Không bên nào nhượng bộ trong cuộc đàm phán.", "Không có tân ngữ trực tiếp; không tách."],
      ["stand up for", "bênh vực hoặc bảo vệ một người hay điều mình tin", "Maya stood up for her colleague when the criticism was unfair.", "Maya bênh vực đồng nghiệp khi lời chỉ trích không công bằng.", "Cụm ba từ; người hoặc điều được bảo vệ đứng sau for."],
      ["get along", "có mối quan hệ hòa thuận với ai", "Our new neighbors get along well with everyone on the floor.", "Những người hàng xóm mới hòa thuận với mọi người trong tầng.", "Thường dùng get along with someone; tân ngữ theo sau with."],
    ],
  },
  {
    id: "curated-travel",
    title: "Di chuyển và thay đổi",
    focus: "Đi lại, khởi hành, quay về và thích nghi với thay đổi.",
    entries: [
      ["set off", "bắt đầu một chuyến đi", "We set off for the airport before sunrise to avoid traffic.", "Chúng tôi khởi hành đến sân bay trước lúc mặt trời mọc để tránh tắc đường.", "Không có tân ngữ trực tiếp trong nghĩa này; không tách."],
      ["drive off", "lái xe rời khỏi một nơi", "The driver drove off before I could ask for directions.", "Tài xế lái xe đi trước khi tôi kịp hỏi đường.", "Không có tân ngữ trực tiếp; không tách."],
      ["get in", "vào trong ô tô hoặc taxi", "Get in the car quickly; it's starting to rain.", "Mau vào ô tô đi; trời bắt đầu mưa rồi.", "Dùng get in a car; không có tân ngữ trực tiếp."],
      ["get out", "ra khỏi ô tô hoặc taxi", "We got out of the taxi in front of the hotel.", "Chúng tôi xuống taxi trước khách sạn.", "Dùng get out of a car/taxi; không có tân ngữ trực tiếp."],
      ["get on", "lên xe buýt, tàu hoặc máy bay", "The bus has just arrived at our stop, so we got on.", "Xe buýt vừa đến trạm của chúng tôi nên chúng tôi đã lên xe.", "Dùng get on a bus/train/plane; không có tân ngữ trực tiếp."],
      ["get off", "xuống xe buýt, tàu hoặc máy bay", "Please get off the train at Central Station.", "Vui lòng xuống tàu ở ga Trung tâm.", "Dùng get off a bus/train/plane; không có tân ngữ trực tiếp."],
      ["check in", "làm thủ tục nhận phòng hoặc xác nhận chuyến đi", "We checked in at the hotel shortly after noon.", "Chúng tôi làm thủ tục nhận phòng khách sạn ngay sau buổi trưa.", "Không có tân ngữ trực tiếp trong nghĩa làm thủ tục."],
      ["check out", "trả phòng và hoàn tất thủ tục rời khách sạn", "Guests must check out by eleven in the morning.", "Khách phải trả phòng trước mười một giờ sáng.", "Không có tân ngữ trực tiếp trong nghĩa trả phòng."],
      ["pull over", "tấp xe vào lề và dừng lại", "The driver pulled over to let the ambulance pass.", "Tài xế tấp vào lề để nhường xe cứu thương đi qua.", "Không có tân ngữ trực tiếp; không tách."],
      ["pull up", "dừng xe sát một nơi hoặc người nào đó", "A taxi pulled up outside the station.", "Một chiếc taxi dừng trước nhà ga.", "Không có tân ngữ trực tiếp; không tách."],
      ["head back", "bắt đầu quay trở lại một nơi", "We headed back to the hotel before it got dark.", "Chúng tôi bắt đầu quay về khách sạn trước khi trời tối.", "Thường dùng head back to a place."],
      ["come back", "trở lại nơi người nói đang ở hoặc nhắc đến", "I'll wait here, so come back when you have the signed form.", "Tôi sẽ đợi ở đây, vậy hãy quay lại khi bạn có biểu mẫu đã ký.", "Không có tân ngữ trực tiếp; không tách."],
      ["go back", "quay trở lại một nơi đã rời đi", "I need to go back to the shop for my umbrella.", "Tôi cần quay lại cửa hàng lấy ô.", "Thường dùng go back to a place."],
      ["turn around", "đổi hướng để quay về phía ngược lại", "Turn around at the next street and follow the signs.", "Hãy quay đầu ở con phố tiếp theo rồi đi theo biển chỉ dẫn.", "Không có tân ngữ trực tiếp; không tách."],
      ["speed up", "tăng tốc độ di chuyển hoặc tiến trình", "The train began to speed up after leaving the station.", "Tàu bắt đầu tăng tốc sau khi rời ga.", "Không có tân ngữ trực tiếp trong ví dụ này."],
      ["slow down", "giảm tốc độ di chuyển hoặc tiến trình", "Slow down near the school crossing.", "Hãy giảm tốc độ khi đến gần lối sang đường của trường học.", "Có thể dùng với tân ngữ: slow the car down."],
      ["grow up", "lớn lên từ lúc còn nhỏ đến khi trưởng thành", "She grew up in a small town near the coast.", "Cô ấy lớn lên ở một thị trấn nhỏ gần bờ biển.", "Không có tân ngữ trực tiếp; không tách."],
      ["give up", "ngừng cố gắng hoặc từ bỏ việc đang làm", "Don't give up when the first attempt fails.", "Đừng bỏ cuộc khi lần thử đầu tiên thất bại.", "Có thể dùng với danh từ: give up the plan; đại từ đứng giữa: give it up."],
      ["take up", "bắt đầu một sở thích hoặc hoạt động mới", "He took up swimming to improve his fitness.", "Anh ấy bắt đầu tập bơi để cải thiện thể lực.", "Có thể tách: take swimming up; đại từ đứng giữa khi thay thế tân ngữ."],
      ["start over", "bắt đầu lại từ đầu", "I deleted the wrong file, so I had to start over.", "Tôi xóa nhầm tệp nên phải bắt đầu lại từ đầu.", "Không có tân ngữ trực tiếp; không tách."],
    ],
  },
  {
    id: "curated-problem-solving",
    title: "Giải quyết tình huống",
    focus: "Đối phó với vấn đề, thay đổi hướng và tìm cách xử lý.",
    entries: [
      ["carry on", "tiếp tục làm việc đang làm", "The power went out, but the class carried on by candlelight.", "Điện bị mất nhưng lớp học vẫn tiếp tục dưới ánh nến.", "Không có tân ngữ trực tiếp; không tách."],
      ["move on", "chuyển sang việc hoặc giai đoạn tiếp theo", "After discussing the budget, we moved on to the schedule.", "Sau khi thảo luận ngân sách, chúng tôi chuyển sang lịch trình.", "Không có tân ngữ trực tiếp trong nghĩa chuyển sang việc tiếp theo."],
      ["end up", "cuối cùng rơi vào một kết quả hoặc tình huống", "We took the wrong road and ended up at the lake.", "Chúng tôi đi nhầm đường và cuối cùng đến hồ.", "Thường theo sau là trạng thái, địa điểm hoặc động từ thêm -ing."],
      ["turn out", "hóa ra là hoặc cuối cùng có kết quả như thế nào", "The repair turned out to be cheaper than we expected.", "Hóa ra việc sửa chữa rẻ hơn chúng tôi dự tính.", "Trong ví dụ này theo sau là to be; không có tân ngữ trực tiếp."],
      ["break down", "hỏng và ngừng hoạt động (máy móc hoặc xe cộ)", "Our washing machine broke down during the night.", "Máy giặt nhà tôi hỏng trong đêm.", "Ở nghĩa này không có tân ngữ trực tiếp; máy bị hỏng."],
      ["wear out", "mòn hoặc hỏng do sử dụng nhiều", "These running shoes wear out after about a year.", "Đôi giày chạy này bị mòn sau khoảng một năm.", "Có thể dùng có tân ngữ: wear the shoes out; đại từ đứng giữa: wear them out."],
      ["break up", "kết thúc một mối quan hệ tình cảm", "They broke up after realizing they wanted different things.", "Họ chia tay sau khi nhận ra mình muốn những điều khác nhau.", "Ở nghĩa chia tay, không có tân ngữ trực tiếp."],
      ["run into", "tình cờ gặp một người", "I ran into my former teacher at the bookshop.", "Tôi tình cờ gặp giáo viên cũ ở hiệu sách.", "Nghĩa khác: gặp vấn đề; ở cả hai nghĩa, tân ngữ đứng sau into."],
      ["come across", "tình cờ tìm thấy hoặc bắt gặp điều gì", "She came across an old photo while clearing the drawer.", "Cô ấy tình cờ tìm thấy một bức ảnh cũ khi dọn ngăn kéo.", "Tân ngữ đứng sau across; không tách."],
      ["look into", "điều tra hoặc tìm hiểu kỹ một vấn đề", "The manager promised to look into the billing error.", "Người quản lý hứa sẽ tìm hiểu lỗi tính phí.", "Tân ngữ đứng sau into; không tách."],
      ["rule out", "loại trừ một khả năng sau khi cân nhắc", "The doctor ruled out an allergy after reviewing the test results.", "Bác sĩ đã loại trừ khả năng dị ứng sau khi xem kết quả xét nghiệm.", "Có thể tách: rule an allergy out; đại từ đứng giữa: rule it out."],
      ["narrow down", "thu hẹp nhiều lựa chọn thành một số ít", "We narrowed down the search to three apartments.", "Chúng tôi thu hẹp danh sách tìm kiếm còn ba căn hộ.", "Có thể tách: narrow the choices down; đại từ đứng giữa: narrow them down."],
      ["sort out", "giải quyết hoặc sắp xếp ổn thỏa một vấn đề", "The support team sorted out the account problem by noon.", "Nhóm hỗ trợ giải quyết xong vấn đề tài khoản trước buổi trưa.", "Có thể tách: sort the problem out; đại từ đứng giữa: sort it out."],
      ["work out", "tìm ra cách giải quyết cho một vấn đề cụ thể", "We worked out a way to share the room fairly.", "Chúng tôi tìm ra cách chia sẻ căn phòng công bằng.", "Nghĩa khác: tập thể dục hoặc có kết quả; ví dụ này là tìm giải pháp."],
      ["deal with", "xử lý một vấn đề hoặc tình huống", "I deal with customer complaints each morning.", "Mỗi sáng tôi xử lý khiếu nại của khách hàng.", "Tân ngữ đứng sau with; không tách."],
      ["get by", "xoay xở với số tiền hoặc nguồn lực hạn chế", "They can get by on one income for a few months.", "Họ có thể xoay xở với một nguồn thu nhập trong vài tháng.", "Thường dùng get by on/with; không có tân ngữ trực tiếp."],
      ["get away", "đi khỏi nơi thường ngày để nghỉ ngơi", "We hope to get away for a few days in June.", "Chúng tôi hy vọng đi nghỉ vài ngày vào tháng Sáu.", "Thường dùng get away for/to; không có tân ngữ trực tiếp."],
      ["put up with", "chịu đựng một điều khó chịu mà không phản ứng", "I can't put up with the constant noise from the construction site.", "Tôi không thể chịu nổi tiếng ồn liên tục từ công trường.", "Cụm ba từ; tân ngữ đứng sau with, không tách."],
      ["come apart", "rời ra thành các bộ phận hoặc mảnh", "The handle came apart when I tried to open the jar.", "Tay cầm rời ra khi tôi cố mở chiếc lọ.", "Không có tân ngữ trực tiếp; vật tự rời ra."],
      ["hold up", "làm chậm hoặc trì hoãn ai hay việc gì", "Roadworks held up the bus for nearly twenty minutes.", "Công trình đường bộ làm xe buýt chậm gần hai mươi phút.", "Có thể tách: hold the bus up; đại từ đứng giữa: hold it up."],
    ],
  },
];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  }
  return hash >>> 0;
}

const IRREGULAR_VERB_FORMS: Readonly<Record<string, string>> = {
  be: "am|are|is|was|were|been|being",
  become: "became|become",
  begin: "began|begun",
  bend: "bent",
  bet: "bet",
  bind: "bound",
  bite: "bit|bitten",
  bleed: "bled",
  blow: "blew|blown",
  bring: "brought",
  break: "broke|broken",
  build: "built",
  buy: "bought",
  catch: "caught",
  choose: "chose|chosen",
  come: "came",
  cost: "cost",
  creep: "crept",
  cut: "cut",
  deal: "dealt",
  dig: "dug",
  do: "did|done",
  draw: "drew|drawn",
  drink: "drank|drunk",
  drive: "drove|driven",
  eat: "ate|eaten",
  fall: "fell",
  feed: "fed",
  feel: "felt",
  fight: "fought",
  find: "found",
  flee: "fled",
  fly: "flew|flown",
  forget: "forgot|forgotten",
  forgive: "forgave|forgiven",
  freeze: "froze|frozen",
  get: "got|gotten",
  give: "gave|given",
  go: "went|gone",
  grow: "grew|grown",
  hang: "hung|hanged",
  have: "had",
  hear: "heard",
  hide: "hid|hidden",
  hit: "hit",
  hold: "held",
  hurt: "hurt",
  keep: "kept",
  know: "knew|known",
  lay: "laid",
  lead: "led",
  leave: "left",
  lend: "lent",
  let: "let",
  lie: "lay|lain",
  lose: "lost",
  make: "made",
  mean: "meant",
  meet: "met",
  pay: "paid",
  put: "put",
  read: "read",
  ride: "rode|ridden",
  ring: "rang|rung",
  rise: "rose|risen",
  run: "ran",
  say: "said",
  see: "saw|seen",
  seek: "sought",
  sell: "sold",
  send: "sent",
  set: "set",
  shake: "shook|shaken",
  shoot: "shot",
  show: "showed|shown",
  shut: "shut",
  sing: "sang|sung",
  sink: "sank|sunk",
  sit: "sat",
  sleep: "slept",
  slide: "slid",
  speak: "spoke|spoken",
  spend: "spent",
  stand: "stood",
  steal: "stole|stolen",
  stick: "stuck",
  strike: "struck|stricken",
  sweep: "swept",
  swim: "swam|swum",
  take: "took|taken",
  teach: "taught",
  tear: "tore|torn",
  tell: "told",
  think: "thought",
  throw: "threw|thrown",
  understand: "understood",
  wake: "woke|woken",
  wear: "wore|worn",
  win: "won",
  write: "wrote|written",
};

function verbForms(verb: string): string[] {
  const irregular = IRREGULAR_VERB_FORMS[verb];
  const doubleFinal =
    /^[^aeiou]*[aeiou][^aeiouwxy]$/i.test(verb) && verb.length < 7
      ? `${verb}${verb.at(-1)}`
      : verb;
  const regularPast = verb.endsWith("e")
    ? `${verb}d`
    : verb.endsWith("y") && !/[aeiou]y$/.test(verb)
      ? `${verb.slice(0, -1)}ied`
      : `${doubleFinal}ed`;
  const singleFinalPast =
    doubleFinal !== verb && !verb.endsWith("e") && !verb.endsWith("y")
      ? `${verb}ed`
      : null;
  const regularThirdPerson = verb.endsWith("y") && !/[aeiou]y$/.test(verb)
    ? `${verb.slice(0, -1)}ies`
    : /(?:s|x|z|ch|sh|o)$/.test(verb)
      ? `${verb}es`
      : `${verb}s`;
  const ing = verb.endsWith("ie")
    ? `${verb.slice(0, -2)}ying`
    : verb.endsWith("e") && !/(?:ee|ye|oe)$/.test(verb)
      ? `${verb.slice(0, -1)}ing`
      : `${doubleFinal}ing`;
  return [verb, ...regularPast.split("|"), ...(singleFinalPast ? [singleFinalPast] : []), ...regularThirdPerson.split("|"), ing,
    ...(irregular?.split("|") ?? [])];
}

function headwordPattern(term: string): RegExp {
  const [verb, ...particles] = term.split(" ");
  const forms = [...new Set(verbForms(verb))].sort(
    (left, right) => right.length - left.length,
  );
  const escapedForms = forms.map((form) =>
    form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const escapedParticles = particles.map((particle) =>
    particle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const contiguous = `\\b(?:${escapedForms.join("|")})\\s+${escapedParticles.join("\\s+")}\\b`;
  const separated = particles.length === 1
    ? `\\b(?:${escapedForms.join("|")})\\s+(?:[A-Za-z0-9'’-]+\\s+){1,4}${escapedParticles[0]}\\b`
    : "";
  return new RegExp(
    separated ? `(?:${contiguous}|${separated})` : contiguous,
    "i",
  );
}

function blankHeadword(example: string, term: string): string {
  const pattern = headwordPattern(term);
  if (!pattern.test(example)) {
    throw new Error(`Câu ví dụ không chứa nguyên cụm động từ: ${term}`);
  }
  return example.replace(
    new RegExp(pattern.source, `${pattern.flags}g`),
    "_____",
  );
}

function choicesFor(term: string, lessonTerms: readonly string[]): string[] {
  const distractors: string[] = [];
  const mutuallySimilarPairs = new Set(
    [
      ["catch up", "keep up"],
      ["come back", "go back"],
      ["come back", "head back"],
      ["go back", "head back"],
      ["drive off", "come back"],
      ["drive off", "go back"],
      ["drive off", "head back"],
      ["fix up", "get rid of"],
      ["fix up", "take away"],
      ["go over", "read over"],
      ["point out", "bring up"],
      ["sort out", "work out"],
      ["sort out", "deal with"],
      ["take out", "put out"],
    ].map((pair) => pair.sort().join("|")),
  );
  const conflictsWith = (candidate: string) =>
    [term, ...distractors].some((existing) =>
      mutuallySimilarPairs.has([existing, candidate].sort().join("|")),
    );
  const first = stableHash(`${term}:phrasal-distractors`) % lessonTerms.length;
  const candidates = Array.from(
    { length: lessonTerms.length },
    (_, offset) => lessonTerms[(first + offset) % lessonTerms.length],
  );
  const termRoot = term.split(" ")[0];
  const termParticle = term.split(" ").at(-1);
  const preferred = candidates.filter(
    (candidate) =>
      candidate.split(" ")[0] !== termRoot &&
      candidate.split(" ").at(-1) !== termParticle,
  );
  for (const candidate of [...preferred, ...candidates]) {
    if (
      candidate !== term &&
      !distractors.includes(candidate) &&
      !conflictsWith(candidate)
    )
      distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  return [term, ...distractors].sort((left, right) =>
    stableHash(`${term}:phrasal-choice:${left}`) -
      stableHash(`${term}:phrasal-choice:${right}`) ||
    left.localeCompare(right, "en"),
  );
}

const authoredEntries: Record<string, PhrasalVerbCourseEntry> = Object.fromEntries(
  TOPICS.flatMap((topic) =>
    topic.entries.map(([term, definition, example, exampleTranslation, note]) => [
      term,
      {
        definition,
        example,
        exampleTranslation,
        topicId: topic.id,
        topicTitle: topic.title,
        ...(note ? { spellingNote: `Cấu trúc: ${note}` } : {}),
      },
    ]),
  ),
);

const dictionaryData = courseData as DictionaryPhrasalVerbData;
const dictionaryEntries: Record<string, PhrasalVerbCourseEntry> =
  Object.fromEntries(
    Object.entries(dictionaryData.entries).map(([term, entry]) => [
      term,
      {
        definition: entry.definition,
        example: entry.example,
        rootVerb: entry.rootVerb,
        topicId: entry.topicId,
        topicTitle: entry.topicTitle,
        partOfSpeech: entry.partOfSpeech,
        dictionarySource: entry.dictionarySource,
      },
    ]),
  );

export const PHRASAL_VERB_COURSE_ENTRIES: Readonly<
  Record<string, PhrasalVerbCourseEntry>
> = {
  ...dictionaryEntries,
  ...authoredEntries,
};

export const PHRASAL_VERB_COURSE_WORD_COUNT = Object.keys(
  PHRASAL_VERB_COURSE_ENTRIES,
).length;
export const PHRASAL_VERB_COURSE_TOPIC_COUNT =
  TOPICS.length + dictionaryData.topics.length;

const authoredLessons: PhrasalVerbCourseLesson[] = TOPICS.map(
  (topic, lessonIndex) => {
    const lessonTerms = topic.entries.map(([term]) => term);
    return {
      id: `${PHRASAL_VERB_COURSE_ID}-lesson-${String(lessonIndex + 1).padStart(3, "0")}`,
      title: `Bài ${lessonIndex + 1}: ${topic.title}`,
      focus: topic.focus,
      topicId: topic.id,
      topicTitle: topic.title,
      questions: topic.entries.map(([term, , example]) => ({
        term,
        prompt: blankHeadword(example, term),
        choices: choicesFor(term, lessonTerms),
      })),
    };
  },
);

let dictionaryLessonsSoFar = 0;
const dictionaryLessons: PhrasalVerbCourseLesson[] =
  dictionaryData.topics.flatMap((topic) => {
    const topicTerms = topic.terms.filter((term) => !authoredEntries[term]);
    const lessons: PhrasalVerbCourseLesson[] = [];
    const lessonCount = Math.ceil(topicTerms.length / 20);
    const baseLessonSize = Math.floor(topicTerms.length / lessonCount);
    const largerLessonCount = topicTerms.length % lessonCount;
    let start = 0;
    for (let batchIndex = 0; batchIndex < lessonCount; batchIndex += 1) {
      const lessonSize =
        baseLessonSize + (batchIndex < largerLessonCount ? 1 : 0);
      const lessonTerms = topicTerms.slice(start, start + lessonSize);
      start += lessonSize;
      const firstRoot = dictionaryEntries[lessonTerms[0]].rootVerb!;
      const lastRoot = dictionaryEntries[lessonTerms.at(-1)!].rootVerb!;
      const rootRange =
        firstRoot === lastRoot ? firstRoot : `${firstRoot}–${lastRoot}`;
      const lessonNumber = authoredLessons.length + dictionaryLessonsSoFar + lessons.length + 1;
      lessons.push({
        id: `${PHRASAL_VERB_COURSE_ID}-lesson-${String(lessonNumber).padStart(3, "0")}`,
        title: `Bài ${lessonNumber}: ${topic.title} · ${rootRange}`,
        focus: `${topic.focus} Các cụm được xếp theo động từ gốc (${rootRange}).`,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: lessonTerms.map((term) => ({
          term,
          prompt: blankHeadword(dictionaryEntries[term].example, term),
          choices: choicesFor(term, lessonTerms),
        })),
      });
    }
    dictionaryLessonsSoFar += lessons.length;
    return lessons;
  });

export const PHRASAL_VERB_COURSE_LESSONS: readonly PhrasalVerbCourseLesson[] = [
  ...authoredLessons,
  ...dictionaryLessons,
];
