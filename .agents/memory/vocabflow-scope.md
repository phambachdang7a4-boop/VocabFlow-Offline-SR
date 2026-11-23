---
name: Phạm vi VocabFlow
description: Yêu cầu sản phẩm và cách triển khai do người dùng quy định.
---

VocabFlow là app Android học từ vựng tiếng Anh cho người Việt, offline-first; không có đăng nhập hay đồng bộ cloud. SQLite cục bộ là nguồn dữ liệu chính cho từ và tiến độ; mở app không cần mạng. Không thêm dữ liệu mẫu hay từ khởi tạo. Giao diện tiếng Việt.

**Why:** Người dùng yêu cầu không ép app cần Wi-Fi hoặc dữ liệu di động mỗi lần mở; app phải dùng được ngoại tuyến sau khi dữ liệu đã có trên máy.

**How to apply:** Không chặn khởi động, tab học/ôn, hay dữ liệu cục bộ vì kiểm tra mạng hoặc dịch vụ từ xa. Chỉ truy cập mạng khi người dùng chủ động tải/cập nhật tài nguyên. Giữ sổ từ, tiến độ, sao lưu và khôi phục trên máy.

Với Mắt Quạ, dán/đọc văn bản và tra từ phải dùng dữ liệu cục bộ, không gọi dịch vụ mạng. Từ được thêm đi qua luồng lưu hiện có như Tra Từ/Khóa học; dữ liệu chỉ lưu trên máy.

**Why:** Người dùng chọn bỏ Clerk ngay và giữ sổ cục bộ, không chuyển qua tài khoản.

**How to apply:** Không thêm API hoặc cơ chế đồng bộ cloud cho Mắt Quạ. Giữ các tệp SQLite tài khoản cũ không bị xóa; nếu cần dữ liệu đó, yêu cầu xuất bản sao lưu từ bản cũ rồi nhập vào sổ cục bộ.

Từ vựng khóa học dùng chung nguồn dữ liệu mục từ với từ điển offline; không tạo bản sao riêng của cùng một từ. Cấu trúc bài, câu hỏi và thứ tự học vẫn thuộc khóa học. Ưu tiên ví dụ nguyên văn trong từ điển; nếu cần ví dụ theo ngữ cảnh, khóa học có thể giữ câu riêng theo yêu cầu.

Với khóa ngữ pháp, mỗi câu trắc nghiệm cần có một đáp án tự nhiên, rõ ràng; nghĩa nên ghi cụm gần tương đương và điểm khác nhau khi người học dễ nhầm.

**Why:** Người dùng yêu cầu rà khóa liên từ và trạng từ liên kết để tránh ví dụ có thể chọn nhiều đáp án, đồng thời muốn nghĩa giải thích rõ các cặp gần nghĩa.

**How to apply:** Khi thêm hoặc sửa bài ngữ pháp, rà cả câu dẫn lẫn phương án nhiễu; ghi chú so sánh trong nghĩa hiển thị của khóa học, không tự sửa dữ liệu từ điển gốc.

Từ đã lưu chỉ được xem, đóng băng/bỏ đóng băng hoặc xóa; không cho người dùng sửa nội dung. Form thêm từ không có trường ghi chú. Ghi chú cũ được giữ trong dữ liệu, không xóa khi ẩn trường.

**Why:** Người dùng yêu cầu bỏ đăng nhập và lưu dữ liệu cục bộ. Người dùng cũng quy định từ đã lưu không được chỉnh sửa và yêu cầu bỏ ghi chú. Giữ ghi chú cũ tránh xóa dữ liệu ngoài yêu cầu.

**How to apply:** Trước khi viết code phải tóm tắt kế hoạch tối đa 10 dòng và chờ đồng ý. Sau đó làm từng bước nhỏ chạy được; sau mỗi bước báo cách kiểm tra trên điện thoại. Giữ giao diện từ đã lưu ở chế độ chỉ đọc; không hiển thị trường ghi chú, không xóa ghi chú cũ nếu chưa được yêu cầu rõ. Trong Sổ từ, từ đã đóng băng không xuất hiện khi lọc Cấp 1–6 nhưng vẫn tính vào tổng số từ; bỏ lọc thì có thể tra cứu từ đó. Không tự thêm truyện, nội dung từ điển, hay kế hoạch thu phí nếu chưa được yêu cầu. Phạm vi sản phẩm và các lựa chọn hiện tại được ghi trong `replit.md`.

**Why:** Người dùng yêu cầu dữ liệu mục từ trong khóa học và từ điển offline phải được dùng chung, chọn tự thêm mục từ còn thiếu, và quy định IPA bắt buộc cho từ đơn khi nạp số lượng lớn nhưng không cần cho cụm từ.

**How to apply:** Khi xử lý từ khóa học, trước tiên tìm và tái sử dụng mục từ khớp trong từ điển offline. Nếu chưa có, tạo một mục từ dùng chung từ dữ liệu sẵn có rồi để khóa học tham chiếu mục đó; tránh tạo bản sao hoặc ghi đè dữ liệu từ điển phong phú hơn. Giữ thứ tự bài và nội dung câu hỏi riêng trong khóa học. Khi nạp cả khóa vào Sổ từ, tra/bổ sung IPA ngoại tuyến cho từ đơn; cụm nhiều từ không bắt buộc IPA và từ đơn thiếu IPA không được lưu âm thầm ở trạng thái trống.

## Corvi
Corvi là linh vật chính thức của VocabFlow. Hình pixel-art người dùng gửi là mẫu tham chiếu: quạ đen đeo kính, mặc áo vest/nơ đỏ và đứng trong thư viện. Phẩm chất rương cao nhất mang tên Corvi, chủ đề Hắc Diệu Thạch màu đen.

**Why:** Người dùng xác nhận hình pixel-art đã gửi chính là linh vật; trước đó họ đã nêu tên Corvi và cách thể hiện bậc rương cao nhất.

**How to apply:** Dùng hình đã gửi làm tham chiếu nhất quán khi thể hiện Corvi: quạ đen đeo kính, mặc áo vest/nơ đỏ trong thư viện. Artwork vector hiện tại cần giữ các dấu hiệu nhận diện này cùng rương viền bạc; dùng tên Corvi và tông đen Hắc Diệu Thạch cho bậc rương cao nhất.

## Baron
Baron là nhân vật đứng sau quầy trong hình The Baron Trade ở Cửa Hàng; đây không phải Corvi.

**Why:** Người dùng đã đính chính danh tính nhân vật trong hình Cửa Hàng.

**How to apply:** Gọi nhân vật đó là Baron trong mô tả và nội dung liên quan; không đổi nhãn hoặc giao diện nếu người dùng chỉ yêu cầu ghi nhận.

## Cừu Pan
Cừu Pan là một nhân vật riêng của VocabFlow, không phải Corvi. Hình tham chiếu người dùng gửi mô tả Pan đang quét dọn hành lang.

**Why:** Người dùng đã đính chính tên và loài nhân vật trong hình: đó là cừu Pan, không phải Corvi.

**How to apply:** Giữ hình ảnh và lời thoại của Pan tách biệt khỏi Corvi; dùng ngữ cảnh quét dọn khi thể hiện nhân vật này.

## Nhân vật hội thoại
Corvi là người hỏi; Pan hoặc Baron có thể trả lời. Trong Idioms và ôn tập idiom, Pan hồi đáp; trong khóa Cấu trúc câu & từ nối, Baron hồi đáp.

**Why:** Người dùng chỉ định vai hội thoại cho ba chân dung: Corvi hỏi và Pan hoặc Baron trả lời.

**How to apply:** Giữ nguyên nội dung câu hỏi và đáp án khi thay avatar hoặc bố cục thoại; dùng Pan cho idiom và Baron cho cấu trúc câu.

## Stone từ Combo
Chỉ chuỗi có ít nhất 20 câu đúng liên tiếp mới nhận Stone; số Stone bằng độ dài chuỗi khi chuỗi kết thúc do trả lời sai hoặc kết thúc/thoát phiên. Chuỗi ngắn hơn 20 câu không nhận Stone. Mỗi chuỗi đủ điều kiện tính riêng, không giới hạn số lần nhận.

**Why:** Người dùng cập nhật ngưỡng nhận Stone thành 20 câu sau khi chọn quy tắc thưởng theo chuỗi. Giữ Stone đã nhận trước khi đổi để không thu hồi phần thưởng cũ.

**How to apply:** Ghi mỗi chuỗi thành một sự kiện thưởng riêng, chống ghi trùng khi xử lý lại cùng phiên và đồng bộ/backup sự kiện đó để số dư Stone không mất hoặc bị cộng lặp.

