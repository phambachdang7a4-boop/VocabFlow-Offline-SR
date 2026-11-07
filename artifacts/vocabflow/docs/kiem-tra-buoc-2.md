# Bước 2 — SRS 6 cấp

## Quy tắc đang dùng

- Từ mới vào cấp 1, học ngay sau khi lưu (lần học mới trong ngày đầu).
- Các mốc là ngày học gốc +0, +1, +3, +7, +14, +30 ngày theo lịch thiết bị, không cộng dồn giữa các lần ôn.
- Ngày học gốc được chốt khi trả lời thẻ lần đầu. Nếu chỉ lưu từ rồi vài ngày sau mới học, lịch được tính từ lần học thực tế đó, không từ ngày thêm.
- Ví dụ thêm ngày 01/01: hạn học/ôn là 01/01, 02/01, 04/01, 08/01, 15/01, 31/01 nếu luôn trả lời đúng đúng hạn.
- Cấp hiển thị là cấp đang chờ kiểm tra. Đúng ở cấp 1–5 thì lên một cấp. Đúng ở cấp 6 thì hoàn tất, không còn vào hàng đợi ôn nhưng vẫn tra cứu được trong sổ.
- Sai lùi đúng một cấp, cấp 1 giữ nguyên. Không đặt lại ngày học gốc. Từ sai được hẹn ngày mai.
- Nếu ôn đúng nhưng đã lỡ mốc kế tiếp, hẹn ngày mai thay vì cho ôn nhiều cấp trong một ngày.
- Hàng đợi gồm từ có hạn ôn hôm nay hoặc trước hôm nay; không lấy từ chưa đến hạn hay đã hoàn tất. Từ cũ quá hạn được ưu tiên trước.
- Chỉ lưu khi nhấn “Trả lời đúng” hoặc “Trả lời sai”, không lưu chỉ vì lật thẻ. Chặn nhấn đúp; nếu lưu thất bại, giữ thẻ và báo lỗi.
- Khi cập nhật lịch cũ, giữ nội dung, ngày học, cấp, số lần trả lời và trạng thái hoàn tất; chỉ tính lại hạn theo mốc mới. Từ đã trả lời hôm nay không bị đưa lại vào ôn ngay.

## Kiểm tra trên Android qua Expo Go

1. Mở lại đúng dự án VocabFlow, không gỡ app hay xóa dữ liệu Expo Go. Từ từ Bước 1 vẫn phải còn.
2. Thêm một từ mới của bạn. Vào Ôn tập: từ vừa thêm phải xuất hiện ngay ở cấp 1.
3. Mở từ vừa thêm từ Sổ từ: kiểm tra cấp 1, hạn hôm nay và số lần trả lời bằng 0. Sau khi trả lời đúng lần đầu, kiểm tra cấp 2 và hạn ngày mai.
4. Khi có từ đến hạn, vào Ôn tập, lật thẻ và chọn “Trả lời đúng”. Từ đó rời hàng đợi, lên một cấp và có hạn mới.
5. Với một từ đến hạn ở cấp 3, chọn “Trả lời sai”: mở lại trong Sổ từ phải thấy cấp 2, không phải cấp 1; hạn ngày mai. Sai ở cấp 1 vẫn giữ cấp 1.
6. Đóng hoàn toàn Expo Go, mở lại: cấp, hạn và số lần trả lời phải được giữ.
7. Sửa nghĩa hoặc ghi chú của từ: cấp và hạn không đổi. Xóa từ phải xóa luôn thẻ khỏi hàng đợi.
8. Khi hoàn tất cấp 6, từ vẫn trong Sổ từ với nhãn đã hoàn tất và không xuất hiện trong ôn tập.

## Kiểm tra nhanh không cần chờ đủ 30 ngày

Đã có kiểm tra tự động cho cả sáu mốc, lùi cấp, cấp 1, quá hạn, hoàn tất, đổi tháng/năm, năm nhuận, múi giờ và chuyển dữ liệu từ Bước 1:

```sh
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-srs.cjs
TZ=America/New_York node artifacts/vocabflow/scripts/check-srs.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-storage.cjs
```

Các dữ liệu kiểm thử chỉ nằm trong cơ sở dữ liệu tạm, không được thêm vào app.

Nếu muốn đi qua các mốc ngay trên giao diện, dùng **máy Android thử nghiệm hoặc trình mô phỏng**, tải dự án trước, rồi tăng ngày hệ thống lần lượt. Không nên đổi ngày điện thoại đang dùng chính vì có thể ảnh hưởng ứng dụng khác và kết nối bảo mật. Bật lại ngày giờ tự động sau khi thử. App không có nút sửa tiến độ hay dữ liệu mẫu để giả lập.

Expo Go có thể cần mạng để tải bản phát triển. Kiểm tra SQLite trên máy thử nghiệm không thay thế kiểm tra bản Android cài độc lập.
