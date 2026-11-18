---
name: Từ khóa học trong từ điển
description: Quy tắc giữ đồng bộ nhãn khóa học với kho từ điển offline.
---

Sinh chỉ mục khóa học thành dữ liệu gọn, đối chiếu với đúng SHA-256 của kho từ điển nguồn. Gắn nhãn theo mã khóa học ổn định; chỉ bổ sung nghĩa từ dữ liệu khóa học khi từ/cụm chưa có trong kho nguồn. Không thay nghĩa sẵn có để khớp cách diễn giải trong khóa.

**Why:** Tải toàn bộ dữ liệu bài học cùng lúc khi khởi tạo từ điển sẽ tăng bộ nhớ đỉnh trên WebAssembly; ghi đè nghĩa nguồn có thể làm thay đổi các mục dùng chung giữa nhiều khóa.

**How to apply:** Khi thay danh sách mục từ, nhóm khóa hoặc phiên bản từ điển nguồn, hãy tạo lại chỉ mục khóa học và kiểm tra hash. Giữ nâng cấp tag trong giao dịch SQLite offline để cache hiện có được cập nhật mà không tải lại kho nguồn.
