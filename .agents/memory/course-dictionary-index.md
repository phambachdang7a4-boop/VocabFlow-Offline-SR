---
name: Từ khóa học trong từ điển
description: Quy tắc giữ đồng bộ nhãn khóa học với kho từ điển offline.
---

Sinh chỉ mục khóa học thành dữ liệu gọn, đối chiếu với đúng SHA-256 của kho từ điển nguồn. Gắn nhãn theo mã khóa học ổn định; chỉ bổ sung nghĩa từ dữ liệu khóa học khi từ/cụm chưa có trong kho nguồn. Không thay nghĩa sẵn có để khớp cách diễn giải trong khóa.

Để nội dung bài học không nằm trong gói JavaScript, đóng các khóa và chỉ mục nhãn từ điển vào một gói riêng có phiên bản, kích thước và SHA-256; chỉ mở khóa học sau khi gói được tải và xác minh. Xóa gói không xóa tiến độ, từ đã lưu, lịch ôn hay nhãn khóa học đã ghi trong từ điển.

**Why:** Tải toàn bộ dữ liệu bài học cùng lúc khi khởi tạo từ điển sẽ tăng bộ nhớ đỉnh trên WebAssembly; gói riêng cho phép người dùng quản lý dung lượng mà không làm mất dữ liệu học. Ghi đè nghĩa nguồn có thể làm thay đổi các mục dùng chung giữa nhiều khóa.

**How to apply:** Khi thay danh sách mục từ, nhóm khóa hoặc phiên bản từ điển nguồn, hãy tạo lại chỉ mục khóa học, kiểm tra hash gói và giữ thông tin gói đồng nhất giữa ứng dụng với máy chủ. Giữ nâng cấp tag trong giao dịch SQLite offline để cache hiện có được cập nhật mà không tải lại kho từ điển nguồn.
