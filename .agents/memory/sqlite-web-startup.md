---
name: SQLite trên trình duyệt
description: Ràng buộc khởi tạo và quyền sở hữu OPFS của Expo SQLite trên web.
---

Không coi promise khởi tạo riêng của từng kho SQLite là đủ để bảo vệ lần khởi động đầu. Các kho khác nhau vẫn dùng chung worker và bộ máy SQLite/VFS của Expo web, nên các lần mở đầu phải được phối hợp.

**Why:** Worker SDK xử lý message bất đồng bộ; phần khởi tạo WASM/VFS không có promise khởi tạo chung. Hai kho mở cùng lúc có thể chồng lấn quá trình tạo OPFS access-handle pool. OPFS cũng giữ access handle độc quyền giữa các tab cùng nguồn.

**How to apply:** Giữ phối hợp khởi tạo giữa sổ cá nhân và kho tham chiếu. Quyền sở hữu vùng lưu trữ trên web cần tồn tại qua Fast Refresh và chỉ được nhường khi tab kết thúc. Nếu một tab khác đang giữ vùng lưu trữ, báo cách đóng tab/thử lại trước khi khởi tạo worker; không thay bằng dữ liệu tạm hoặc yêu cầu xóa dữ liệu trình duyệt.

Khi chẩn đoán lỗi tải từ điển, kiểm tra cả Sổ từ và trình duyệt thực tế trong ảnh. Lỗi SQLite ở cả hai nơi có thể xảy ra trước bất kỳ yêu cầu tải mạng nào; cần giữ nguyên lỗi gốc để phân biệt với lỗi mạng.
