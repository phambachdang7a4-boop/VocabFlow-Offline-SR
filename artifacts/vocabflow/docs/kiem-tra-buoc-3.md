# Bước 3 — Đóng băng từ

## Cách hoạt động

- Trong phiên Ôn tập, mỗi từ chưa nộp câu trả lời có nút **Đóng băng**. Thao tác này không chấm điểm SRS.
- Từ đóng băng không xuất hiện trong ôn tập nữa, trừ khi bạn chủ động bỏ đóng băng.
- Từ vẫn ở Sổ từ, tìm kiếm được, có nhãn “Đã đóng băng”, có thể sửa nội dung hoặc xóa như bình thường. Đóng băng không giảm tổng số từ đã lưu, nên sau này vẫn tính vào giới hạn Free.
- Vào **Cài đặt → Từ đã đóng băng** để xem danh sách riêng và bỏ đóng băng. Cũng có nút tương ứng khi mở từ trong Sổ từ.
- Bỏ đóng băng đưa từ về **cấp 6**, không tự hoàn tất từ. Ngày học, nội dung và số lần trả lời vẫn được giữ.
- Hạn cấp 6 là ngày học đầu +30 ngày. Nếu đã qua mốc này, từ đến hạn ngay; nếu đã trả lời trong hôm nay thì ôn lại từ ngày mai.
- SQLite lưu trạng thái bền vững. Không cần đăng nhập hoặc mạng để dùng các thao tác này khi app đã tải.

## Kiểm tra trên điện thoại Android

1. Mở lại VocabFlow trong Expo Go. Kiểm tra từ và tiến độ cũ vẫn còn.
2. Nếu chưa có từ, tự thêm một từ để học ngay. Trong Ôn tập, bắt đầu phiên rồi nhấn **Đóng băng**: hiện xác nhận đã đóng băng, bấm Tiếp tục/Kết thúc. Từ rời lượt ôn; nếu là từ cuối thì quay về tổng quan, không có lịch giả cho từ đóng băng.
3. Sang Sổ từ và tìm từ đó bằng tiếng Anh hoặc nghĩa tiếng Việt: từ vẫn còn, có nhãn **Đã đóng băng**. Tổng số từ trong Cài đặt không giảm.
4. Mở từ để sửa nghĩa, lưu rồi kiểm tra: từ vẫn đóng băng, không quay lại ôn tập.
5. Đóng hẳn Expo Go rồi mở lại đúng dự án: trạng thái đóng băng vẫn còn.
6. Vào **Cài đặt → Từ đã đóng băng**: kiểm tra có từ vừa đóng băng. Nhấn **Bỏ đóng băng**: từ ra khỏi danh sách riêng.
7. Mở từ từ Sổ từ: kiểm tra **cấp 6**, ngày học và số lần trả lời không bị đặt lại. Từ chỉ trở lại Ôn tập khi đến hạn theo quy tắc ở trên.
8. Có thể đóng băng thêm lần nữa từ màn xem/sửa từ; thử xóa một từ đóng băng sau khi xác nhận để kiểm tra nó được xóa khỏi cả sổ lẫn danh sách đóng băng.

Không gỡ ứng dụng hoặc xóa dữ liệu Expo Go để kiểm tra lưu bền vững vì việc đó có thể xóa cơ sở dữ liệu.

## Kiểm tra tự động

```sh
pnpm --filter @workspace/vocabflow run typecheck
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-srs.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-storage.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-freeze.cjs
```

Các kiểm tra chỉ dùng dữ liệu tạm, không thêm từ mẫu vào app. Bao gồm giữ nguyên dữ liệu khi nâng cấp, loại trừ từ đóng băng, chống chấm điểm từ đóng băng, lưu sau mở lại, đếm tổng từ, sửa/xóa, bỏ đóng băng về cấp 6 và giữ nguyên quy tắc sai lùi một cấp.
