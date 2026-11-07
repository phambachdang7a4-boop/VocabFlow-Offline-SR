# Kiểm tra Bước 1 trên Android

## Mở ứng dụng

1. Cài Expo Go trên điện thoại Android.
2. Mở bản xem trước VocabFlow trong Replit và chọn mở bằng Expo Go hoặc quét mã QR bằng Expo Go.
3. Giữ mạng để tải bản phát triển lần đầu. Giao diện ban đầu phải trống, không có từ mẫu.

## Các thao tác cần kiểm tra

1. Từ Sổ từ, nhấn thêm từ. Để trống từ/nghĩa và nhấn lưu: phải có báo lỗi, không tạo mục rỗng.
2. Nhập một từ tiếng Anh và nghĩa tiếng Việt của bạn; có thể bổ sung IPA, ví dụ, ghi chú. Lưu và kiểm tra từ xuất hiện.
3. Tìm bằng từ tiếng Anh hoặc nghĩa tiếng Việt. Có thể tìm không dấu. Tìm nội dung không có phải hiện thông báo không tìm thấy.
4. Chạm từ để sửa nghĩa. Lưu và kiểm tra danh sách đã cập nhật. Tạo lại cùng từ với chữ hoa/thường khác nhau phải được báo trùng.
5. Sang Luyện tập, lật thẻ xem nghĩa; nếu có nhiều từ, thử chuyển thẻ. Đây là luyện thủ công, chưa lên lịch SRS.
6. Sang Cài đặt: số từ phải khớp với danh sách.
7. Đóng hoàn toàn Expo Go rồi mở lại đúng dự án: từ và nội dung đã sửa phải còn.
8. Khi dự án đã tải xong, thử tắt mạng và thêm/sửa/tìm từ trong phiên đang mở. SQLite không cần mạng.
9. Mở từ, nhấn xóa, thử hủy trước: từ phải còn. Xác nhận xóa: từ phải mất khỏi danh sách và thẻ luyện.

## Lưu ý quan trọng

- Expo Go là môi trường phát triển. Tải/mở lại bản JavaScript có thể cần mạng; khả năng khởi chạy nguội hoàn toàn offline cần kiểm tra trên bản Android cài độc lập sau này.
- Không gỡ ứng dụng hoặc xóa dữ liệu Expo Go để kiểm tra lưu bền vững; việc đó có thể xóa cơ sở dữ liệu.
- Dữ liệu chỉ ở thiết bị hiện tại. Trình duyệt, trình mô phỏng và điện thoại có dữ liệu riêng, không đồng bộ.
- Chưa có SRS, đóng băng hoặc giới hạn Free trong Bước 1.
