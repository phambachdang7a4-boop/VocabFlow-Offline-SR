---
name: Expo preview khởi động chậm
description: Phân biệt ảnh trắng do biên dịch route lần đầu với lỗi giao diện thực sự.
---

Không kết luận app bị lỗi chỉ từ ảnh trắng chụp ngay sau khi khởi động Expo. Các route và layout tải bất đồng bộ có thể vẫn đang biên dịch dù HTML và bundle chính đã trả HTTP 200.

**Why:** Preview của dự án này từng chụp trắng trong lúc các layout/route đang biên dịch, rồi hiển thị bình thường khi chúng đã tải xong; không cần thay đổi mã giao diện để xử lý.

**How to apply:** Khi kiểm tra preview sau restart, xác nhận route và các layout phía trình duyệt đã biên dịch xong trước khi chụp. Dùng log và phản hồi tài nguyên để phân biệt tải chậm với crash; không lặp chụp hoặc sửa font/provider chỉ vì khung hình đầu trắng.
