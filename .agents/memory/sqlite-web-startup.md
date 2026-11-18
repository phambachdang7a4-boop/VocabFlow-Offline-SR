---
name: SQLite trên trình duyệt
description: Ràng buộc khởi tạo và quyền sở hữu OPFS của Expo SQLite trên web.
---

Không coi promise khởi tạo riêng của từng kho SQLite là đủ để bảo vệ lần khởi động đầu. Các kho khác nhau vẫn dùng chung worker và bộ máy SQLite/VFS của Expo web, nên các lần mở đầu phải được phối hợp.

**Why:** Worker SDK xử lý message bất đồng bộ; phần khởi tạo WASM/VFS không có promise khởi tạo chung. Hai kho mở cùng lúc có thể chồng lấn quá trình tạo OPFS access-handle pool. OPFS cũng giữ access handle độc quyền giữa các tab cùng nguồn.

**How to apply:** Giữ phối hợp khởi tạo giữa sổ cá nhân và kho tham chiếu. Quyền sở hữu vùng lưu trữ trên web cần tồn tại qua Fast Refresh và chỉ được nhường khi tab kết thúc. Nếu một tab khác đang giữ vùng lưu trữ, báo cách đóng tab/thử lại trước khi khởi tạo worker; không thay bằng dữ liệu tạm hoặc yêu cầu xóa dữ liệu trình duyệt.

Khi chẩn đoán lỗi tải từ điển, kiểm tra cả Sổ từ và trình duyệt thực tế trong ảnh. Lỗi SQLite ở cả hai nơi có thể xảy ra trước bất kỳ yêu cầu tải mạng nào; cần giữ nguyên lỗi gốc để phân biệt với lỗi mạng.

Khi nhập cơ sở dữ liệu lớn trên web, `expo-sqlite` chuyển `Uint8Array` qua Worker bằng structured clone rồi nạp vào SQLite WebAssembly. Tránh tạo thêm bản sao toàn tệp trước bước này: chỉ sau khi xác minh SHA-256, chuẩn hóa buffer tải tạm tại chỗ và dùng các đoạn tải nhỏ hơn. Một tệp SQLite khoảng 44 MiB có thể gây `memory access out of bounds` trên trình duyệt di động dù tệp hợp lệ.

**Why:** Buffer nguồn, bản sao chuẩn hóa, bản structured clone sang Worker và bộ nhớ SQLite WASM cùng tồn tại ở đỉnh nhập; kiểm tra WASM trực tiếp trên desktop không tái hiện áp lực bộ nhớ của trình duyệt điện thoại.

**How to apply:** Với tệp lớn đưa vào `deserializeDatabaseAsync` trên web, xác minh toàn bộ hash trước, tái sử dụng buffer dùng một lần sau xác minh, giảm kích thước từng đoạn tải và kiểm tra trên Chrome Android. Không bỏ xác minh toàn vẹn hoặc thay bằng nguồn tạm.

Khi nhập chỉ mục khóa học lớn, gom tra cứu và ghi nghĩa/liên kết thành các lô SQL có kích thước giới hạn thay vì gửi một lệnh cho mỗi mục qua SQLite Worker.

**Why:** Mỗi câu lệnh Expo SQLite trên web là một lượt nhắn tin bất đồng bộ tới Worker; vài nghìn lượt tuần tự khiến màn nhập đầu tiên trông như bị treo trên điện thoại.

**How to apply:** Dùng truy vấn theo lô với số tham số thấp hơn giới hạn SQLite, giữ cập nhật trong transaction, và cho giao diện biết riêng khi đang áp dụng nhãn/thuật ngữ khóa học.
