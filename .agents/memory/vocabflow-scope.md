---
name: Phạm vi VocabFlow
description: Yêu cầu sản phẩm và cách triển khai do người dùng quy định.
---

VocabFlow là app Android học từ vựng tiếng Anh cho người Việt, offline-first, không cần đăng nhập, không gọi API trả phí. Dùng SQLite cục bộ cho toàn bộ từ vựng và tiến độ. Không thêm dữ liệu mẫu hay từ khởi tạo. Giao diện tiếng Việt.

Ví dụ trong các khóa học phải lấy nguyên văn từ SQLite từ điển offline; không tự tạo câu mới.

**Why:** Người dùng yêu cầu rõ phạm vi này.

**How to apply:** Trước khi viết code phải tóm tắt kế hoạch tối đa 10 dòng và chờ đồng ý. Sau đó làm từng bước nhỏ chạy được; sau mỗi bước báo cách kiểm tra trên điện thoại. Khóa cơ bản hiện có 978 mục trong 49 bài, gồm bài Màu sắc, sau khi bỏ bài đầu; B1/B2 dùng danh sách cấp độ có nguồn công khai và chỉ nghĩa từ SQLite offline. Không triển khai rương/mảnh ghép, tranh, truyện, linh vật hoặc đồng nghĩa/trái nghĩa. Từ điển tra cứu đã được người dùng yêu cầu mở rộng khỏi phạm vi ban đầu. Phạm vi hiện tại được ghi trong `replit.md`; không tự tiếp tục kế hoạch thu phí cũ.

