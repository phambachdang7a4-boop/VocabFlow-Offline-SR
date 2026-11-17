---
name: Tải dữ liệu công khai
description: Vì sao tệp từ điển phải truy cập công khai độc lập với máy chủ preview và cách xác minh đường tải.
---

Tệp từ điển tham chiếu phải tải được mà không cần cookie hoặc tài khoản của dự án phát triển. Dùng nguồn công khai ghim phiên bản và xác minh toàn bộ kích thước/SHA-256 trước khi nhập; không tự chuyển qua nguồn dự phòng và phát sinh lượt tải mới ngoài xác nhận của người dùng. Với tải theo byte-range từ GitHub, CORS có thể ẩn `Content-Range` khỏi JavaScript dù máy chủ trả HTTP 206; kiểm 206 và đúng số byte mỗi đoạn, chỉ đối chiếu `Content-Range` khi trình duyệt đọc được, rồi xác minh SHA-256 toàn tệp trước khi nhập.

**Why:** Một API trong dự án riêng tư có thể trả đúng tệp khi gọi từ sandbox nhưng trình duyệt độc lập lại bị chuyển tới cổng đăng nhập nền tảng. Khi app ở tên miền Expo gọi tên miền API khác, lỗi xác thực/chuyển hướng có thể chỉ hiện thành “Failed to fetch”, không phải lỗi SQLite hay nút bấm. Chuyển sang cùng nguồn trang cũng không làm API riêng tư trở thành tệp công khai cho app native không có cookie.

**How to apply:** Không dùng thành công của curl/Node làm bằng chứng duy nhất. Xác minh bằng fetch chéo miền trong trình duyệt không có phiên đăng nhập, đọc hết tệp và kiểm mã băm; không cần và không được đổi quyền riêng tư của dự án để sửa việc phân phối tệp vốn đã công khai. Với byte-range, thiếu `Content-Range` không đồng nghĩa sai vị trí; nếu header có mặt thì vẫn phải so khớp chính xác, đồng thời giữ kiểm tra kích thước và SHA-256 toàn tệp. Với dữ liệu cá nhân, giữ lưu trữ cục bộ và không áp dụng cách phân phối công khai này.

Trong nguồn từ điển VocabFlow hiện ghim, `word_definitions.example` chỉ lưu câu tiếng Anh; workbook xuất kèm có cột “Nghĩa câu ví dụ” nhưng cột đang trống. **Why:** Tên cột và nghĩa tiếng Việt của từ dễ bị nhầm thành bản dịch câu ví dụ. **How to apply:** Trước khi báo số câu đã dịch hoặc nhập bản dịch, kiểm tra nội dung cột thực tế trong nguồn mới nhất.
