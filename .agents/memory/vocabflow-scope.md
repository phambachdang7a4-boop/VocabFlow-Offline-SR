---
name: Phạm vi VocabFlow
description: Yêu cầu sản phẩm và cách triển khai do người dùng quy định.
---

VocabFlow là app Android học từ vựng tiếng Anh cho người Việt, offline-first, có đăng nhập và đồng bộ thiết bị; không gọi API trả phí. SQLite cục bộ là nguồn dữ liệu chính cho từ và tiến độ; đồng bộ máy chủ chỉ dành cho tài khoản đã xác thực. Không thêm dữ liệu mẫu hay từ khởi tạo. Giao diện tiếng Việt.

Ví dụ trong các khóa học phải lấy nguyên văn từ SQLite từ điển offline; không tự tạo câu mới.

Từ đã lưu chỉ được xem, đóng băng/bỏ đóng băng hoặc xóa; không cho người dùng sửa nội dung. Form thêm từ không có trường ghi chú. Ghi chú cũ được giữ trong dữ liệu, không xóa khi ẩn trường.

**Why:** Người dùng yêu cầu offline-first và SQLite, sau đó yêu cầu đăng nhập cùng đồng bộ thiết bị; gần đây họ quy định từ đã lưu không được chỉnh sửa và yêu cầu bỏ ghi chú. Giữ ghi chú cũ tránh xóa dữ liệu ngoài yêu cầu.

**How to apply:** Trước khi viết code phải tóm tắt kế hoạch tối đa 10 dòng và chờ đồng ý. Sau đó làm từng bước nhỏ chạy được; sau mỗi bước báo cách kiểm tra trên điện thoại. Giữ giao diện của từ đã lưu ở chế độ chỉ đọc; chỉ để các thao tác đóng băng/bỏ đóng băng và xóa hiện có. Không hiển thị trường ghi chú, không xóa ghi chú cũ nếu chưa được yêu cầu rõ. Trong Sổ từ, từ đã đóng băng không xuất hiện khi lọc Cấp 1–6 nhưng vẫn được tính vào tổng số từ; bỏ lọc vẫn có thể tra cứu từ đó. Khóa cơ bản hiện có 978 mục trong 49 bài, gồm bài Màu sắc, sau khi bỏ bài đầu; B1/B2 dùng danh sách cấp độ có nguồn công khai và chỉ nghĩa từ SQLite offline. Người dùng hiện yêu cầu rương nhiệm vụ và Bộ Sưu Tập: giữ Stone đã tích lũy, mỗi rương mở một mảnh, 20 mảnh cùng phẩm chất ghép thành tranh ngẫu nhiên, và rương có ba lượt nâng cấp. Không thêm truyện, linh vật hoặc đồng nghĩa/trái nghĩa nếu chưa được yêu cầu. Từ điển tra cứu đã được người dùng yêu cầu mở rộng khỏi phạm vi ban đầu. Phạm vi hiện tại được ghi trong `replit.md`; không tự tiếp tục kế hoạch thu phí cũ.

