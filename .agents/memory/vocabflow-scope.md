---
name: Phạm vi VocabFlow
description: Yêu cầu sản phẩm và cách triển khai do người dùng quy định.
---

VocabFlow là app Android học từ vựng tiếng Anh cho người Việt, offline-first, có đăng nhập và đồng bộ thiết bị; không gọi API trả phí. SQLite cục bộ là nguồn dữ liệu chính cho từ và tiến độ; đồng bộ máy chủ chỉ dành cho tài khoản đã xác thực. Không thêm dữ liệu mẫu hay từ khởi tạo. Giao diện tiếng Việt.

Ví dụ trong các khóa học phải lấy nguyên văn từ SQLite từ điển offline; không tự tạo câu mới.

Từ đã lưu chỉ được xem, đóng băng/bỏ đóng băng hoặc xóa; không cho người dùng sửa nội dung. Form thêm từ không có trường ghi chú. Ghi chú cũ được giữ trong dữ liệu, không xóa khi ẩn trường.

**Why:** Người dùng yêu cầu offline-first và SQLite, sau đó yêu cầu đăng nhập cùng đồng bộ thiết bị; gần đây họ quy định từ đã lưu không được chỉnh sửa và yêu cầu bỏ ghi chú. Giữ ghi chú cũ tránh xóa dữ liệu ngoài yêu cầu.

**How to apply:** Trước khi viết code phải tóm tắt kế hoạch tối đa 10 dòng và chờ đồng ý. Sau đó làm từng bước nhỏ chạy được; sau mỗi bước báo cách kiểm tra trên điện thoại. Giữ giao diện từ đã lưu ở chế độ chỉ đọc; không hiển thị trường ghi chú, không xóa ghi chú cũ nếu chưa được yêu cầu rõ. Trong Sổ từ, từ đã đóng băng không xuất hiện khi lọc Cấp 1–6 nhưng vẫn tính vào tổng số từ; bỏ lọc thì có thể tra cứu từ đó. Không tự thêm truyện, nội dung từ điển, hay kế hoạch thu phí nếu chưa được yêu cầu. Phạm vi sản phẩm và các lựa chọn hiện tại được ghi trong `replit.md`.

## Corvi
Corvi là linh vật chính thức của VocabFlow. Hình pixel-art người dùng gửi là mẫu tham chiếu: quạ đen đeo kính, mặc áo vest/nơ đỏ và đứng trong thư viện. Phẩm chất rương cao nhất mang tên Corvi, chủ đề Hắc Diệu Thạch màu đen.

**Why:** Người dùng xác nhận hình pixel-art đã gửi chính là linh vật; trước đó họ đã nêu tên Corvi và cách thể hiện bậc rương cao nhất.

**How to apply:** Dùng hình đã gửi làm tham chiếu nhất quán khi thể hiện Corvi: quạ đen đeo kính, mặc áo vest/nơ đỏ trong thư viện. Artwork vector hiện tại cần giữ các dấu hiệu nhận diện này cùng rương viền bạc; dùng tên Corvi và tông đen Hắc Diệu Thạch cho bậc rương cao nhất.

## Stone từ Combo
Chỉ chuỗi có ít nhất 20 câu đúng liên tiếp mới nhận Stone; số Stone bằng độ dài chuỗi khi chuỗi kết thúc do trả lời sai hoặc kết thúc/thoát phiên. Chuỗi ngắn hơn 20 câu không nhận Stone. Mỗi chuỗi đủ điều kiện tính riêng, không giới hạn số lần nhận.

**Why:** Người dùng cập nhật ngưỡng nhận Stone thành 20 câu sau khi chọn quy tắc thưởng theo chuỗi. Giữ Stone đã nhận trước khi đổi để không thu hồi phần thưởng cũ.

**How to apply:** Ghi mỗi chuỗi thành một sự kiện thưởng riêng, chống ghi trùng khi xử lý lại cùng phiên và đồng bộ/backup sự kiện đó để số dư Stone không mất hoặc bị cộng lặp.

