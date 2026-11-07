# Kiểm tra trang Ôn tập trên điện thoại

1. Trong Chrome Android, tải lại trang rồi chọn tab **Ôn tập**. Trong Expo Go, mở lại tab sau khi bản cập nhật tải xong. Không xóa dữ liệu ứng dụng hoặc tải lại kho từ điển.
2. Trang đầu là tổng quan, không tự mở thẻ. Tổng **Sổ từ đã có** phải bằng số từ cá nhân đã lưu; sáu cột ghi số từ ở cấp 1–6. Không tính kho tra cứu vào tổng này.
3. Cột dùng thang tuyến tính từ 0. Từ hoàn tất/đóng băng vẫn nằm ở cấp đang lưu và được tính trong biểu đồ. Chạm cột để xem số đầy đủ; sổ trống có sáu số 0, không có dữ liệu mẫu.
4. Nếu có từ đến hạn hoặc quá hạn, bấm **Ôn tập ngay**. Lật thẻ, trả lời đúng/sai hoặc đóng băng như trước. Quay lại tổng quan không chấm điểm hay tự đổi tiến độ.
5. Sau khi ôn hết từ đến hạn, app trở về tổng quan. Nếu còn lịch tương lai, nút ôn được thay bằng thanh **đếm ngược** tới ngày ôn gần nhất. Lịch hiện tại tính theo ngày: bắt đầu đến hạn lúc 00:00 của ngày đó theo giờ thiết bị, không phải thêm 24 giờ tính từ lúc mở trang.
6. Đồng hồ cập nhật mỗi giây khi tab đang mở. Ra nền rồi quay lại hoặc chuyển tab rồi trở về phải lấy lại giờ hiện tại, không tiếp tục một đồng hồ cũ. Khi đến hạn, xuất hiện nút **Ôn tập ngay**, không tự bắt đầu phiên.
7. Nếu sổ trống, mọi từ đã hoàn tất hoặc mọi từ còn lại đóng băng, không có lịch tương lai để đếm. App báo **Chưa có lịch ôn** và cho thêm từ hoặc mở từ đóng băng, không tạo thời gian chờ giả.
8. Lỗi đọc SQLite phải hiện lỗi và nút thử lại, không hiển thị số 0 như thống kê thật. Khi tải, hiện trạng thái chờ.

## Đã kiểm tra tự động

- Tổng các cột khớp tổng sổ; loại từ hoàn tất/đóng băng khỏi lượt đến hạn và lịch kế tiếp.
- Hạn trong ngày/quá hạn, chuyển nửa đêm và các ngày đổi giờ mùa hè 23/25 giờ.
- Dọn đồng hồ khi ra nền/rời tab, tính lại từ giờ thực khi quay về.
- Bắt đầu/quay lại/kết thúc phiên; tới hạn sau khi kết thúc chỉ hiện nút, không tự vào thẻ.
- Cột cao tỉ lệ thuận, số 0 không dựng cột giả; giữ khóa nhấn trùng khi chấm điểm/đóng băng.
- Logic chấm điểm/đóng băng gốc được giữ nguyên; các kiểm tra SRS và SQLite đóng băng vẫn đạt.

Các kiểm tra callback dùng bộ dựng React/native giả lập để kiểm tra logic, không thay thế kiểm tra chạm trên máy thật. Ảnh xem trước đã xác nhận trang tổng quan trống không bị vỡ ở 375×812.
