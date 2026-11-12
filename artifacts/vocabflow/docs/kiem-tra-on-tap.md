# Kiểm tra trang Ôn tập trên điện thoại

Thanh dưới có thứ tự **Thư Viện · Khóa Học · Ôn tập · Sổ từ · Trống**. Khóa Học chưa có khóa nào; Trống chưa có nội dung. Bấm bánh răng góc trên phải Ôn tập để vào Cài đặt, dùng nút quay lại để trở về. Cài đặt không còn chiếm một tab.

1. Trong Chrome Android, tải lại trang rồi chọn tab **Ôn tập**. Trong Expo Go, mở lại tab sau khi bản cập nhật tải xong. Không xóa dữ liệu ứng dụng hoặc tải lại kho từ điển.
2. Trang đầu là tổng quan, không tự mở thẻ. Tổng **Sổ từ đã có** phải bằng số từ cá nhân đã lưu; sáu cột ghi số từ ở cấp 1–6. Không tính kho tra cứu vào tổng này.
3. Cột dùng thang tuyến tính từ 0. Từ hoàn tất/đóng băng vẫn nằm ở cấp đang lưu và được tính trong biểu đồ. Chạm cột để xem số đầy đủ; sổ trống có sáu số 0, không có dữ liệu mẫu.
4. Nếu có từ đến hạn hoặc quá hạn, bấm **Ôn tập ngay**. App trộn đọc nghĩa viết từ và đọc câu điền từ. Câu không chứa đúng từ đã lưu hoặc không có ví dụ thì chuyển sang đọc nghĩa, không tự tạo câu.
5. Nhập đầy đủ từ tiếng Anh, kể cả chữ đã gợi ý, rồi bấm **Kiểm tra** hoặc Enter. App tự chấm; **Mình không thuộc từ này** luôn tính sai. Cấp 1–3 có gợi ý giảm dần (từ quá ngắn có thể không có chữ gợi ý); cấp 4–6 không có chữ gợi ý. Khoảng trắng thừa và hoa/thường không bị tính sai, lỗi chính tả vẫn tính sai.
6. Kết quả và đáp án giữ nguyên đến khi bấm **Tiếp tục** hoặc **Kết thúc**. Đúng lên một cấp, sai lùi một cấp và hẹn ngày mai. Không hỏi cùng từ cả hai dạng trong một phiên, không chấm lại khi chuyển câu hoặc nhấn trùng.
7. Có thể **Đóng băng** trước khi nộp câu trả lời, sau đó Tiếp tục/Kết thúc. Không chấm SRS khi đóng băng. Quay lại tổng quan trước khi trả lời không tự đổi tiến độ; kết quả đã chấm thì vẫn được giữ.
8. Sau câu cuối, bấm **Kết thúc** để về tổng quan. Nếu còn lịch tương lai, nút ôn được thay bằng thanh **đếm ngược** tới ngày ôn gần nhất. Lịch tính theo ngày: đến hạn lúc 00:00 theo giờ thiết bị, không phải thêm 24 giờ từ lúc mở trang.
9. Đồng hồ cập nhật mỗi giây khi tab đang mở. Ra nền rồi quay lại hoặc chuyển tab rồi trở về phải lấy lại giờ hiện tại, không tiếp tục một đồng hồ cũ. Khi đến hạn, xuất hiện nút **Ôn tập ngay**, không tự bắt đầu phiên.
10. Nếu sổ trống, mọi từ đã hoàn tất hoặc mọi từ còn lại đóng băng, không có lịch tương lai để đếm. App báo **Chưa có lịch ôn** và cho thêm từ hoặc mở từ đóng băng, không tạo thời gian chờ giả.
11. Lỗi đọc SQLite phải hiện lỗi và nút thử lại, không hiển thị số 0 như thống kê thật. Nếu đã ghi kết quả rồi mới lỗi đọc, kết quả vẫn hiện và chỉ tải lại danh sách; không chấm lần nữa. Nếu lỗi ghi, nhập liệu khóa và **Thử lưu lại** gửi đúng kết quả ban đầu.
12. Thử câu dài trên màn hình nhỏ: cuộn để tới nút khi bàn phím mở, chạm Kiểm tra không cần nhấn hai lần. Không mở nhiều tab web cùng dùng SQLite.

## Đã kiểm tra tự động

- Tổng các cột khớp tổng sổ; loại từ hoàn tất/đóng băng khỏi lượt đến hạn và lịch kế tiếp.
- Hạn trong ngày/quá hạn, chuyển nửa đêm và các ngày đổi giờ mùa hè 23/25 giờ.
- Dọn đồng hồ khi ra nền/rời tab, tính lại từ giờ thực khi quay về.
- Bắt đầu/quay lại/kết thúc phiên; tới hạn sau khi kết thúc chỉ hiện nút, không tự vào thẻ.
- Cột cao tỉ lệ thuận, số 0 không dựng cột giả; giữ khóa nhấn trùng khi chấm điểm/đóng băng.
- Logic chấm điểm/đóng băng gốc được giữ nguyên; các kiểm tra SRS và SQLite đóng băng vẫn đạt.
- Hai dạng trộn dù các từ khác số lần ôn, câu thiếu ví dụ dùng nghĩa; che mọi lần xuất hiện của từ, không che nhầm một phần từ khác.
- Không gợi ý ở cấp 4–6, không lộ đáp án trước khi nộp; khóa nhấn trùng cả khi thử lưu lại và giữ nguyên kết quả sai sau khi đã xem đáp án.
- SQLite thật xác nhận mỗi lượt chỉ thay tiến độ một lần; lượt cuối giữ phản hồi đến khi kết thúc, callback cũ không mở lại phiên đã rời.

Các kiểm tra callback dùng bộ dựng React/native giả lập, không thay thế chạm trên máy thật. Ảnh xem trước xác nhận trang tổng quan ở 375×812. Lần kiểm tra tương tác trình duyệt bị chặn bởi trang đăng nhập preview riêng tư của Replit; chưa xác nhận hành trình nhập từ trên điện thoại thật.
