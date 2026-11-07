# VocabFlow

Ứng dụng Android học từ vựng Anh–Việt cho người Việt, offline-first, không tài khoản hay API trả phí.

## Phạm vi và tiến trình

- Bước 1: quản lý từ cá nhân, SQLite, điều hướng Danh sách từ / Thêm–Sửa từ / Ôn tập / Cài đặt.
- Bước 2: SRS 6 cấp, chỉ ôn từ đến hạn (kể cả quá hạn), lưu tiến độ SQLite.
- Bước 3: đóng băng từ khỏi ôn tập, danh sách riêng, bỏ đóng băng về cấp 6.
- Bước tiếp theo trong kế hoạch: giới hạn Free 100 từ và màn mời Premium 169.000đ/năm.
- Không thêm dữ liệu mẫu, từ khởi tạo, từ điển lớn hoặc thanh toán thật.
- Người dùng yêu cầu làm tuần tự từng bước chạy được và báo cách kiểm tra trên điện thoại sau mỗi bước.

## Run & Operate

- Workflow mobile: `artifacts/vocabflow: expo`.
- `pnpm --filter @workspace/vocabflow run typecheck`
- `node artifacts/vocabflow/scripts/check-storage.cjs`
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-srs.cjs`
- `TZ=America/New_York node artifacts/vocabflow/scripts/check-srs.cjs`
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-freeze.cjs`
- Các workflow API và Canvas là scaffold có sẵn; app hiện không gọi backend.

## Cấu trúc

- `artifacts/vocabflow/app/`: các màn hình và điều hướng Expo Router.
- `artifacts/vocabflow/contexts/`: trạng thái dùng chung.
- `artifacts/vocabflow/data/`: kiểu dữ liệu và truy cập SQLite.
- `artifacts/vocabflow/components/`: giao diện dùng chung.
- `artifacts/vocabflow/constants/`: màu sắc.
- `artifacts/vocabflow/docs/kiem-tra-buoc-1.md`: kiểm tra trên Android.
- `artifacts/vocabflow/docs/kiem-tra-buoc-2.md`: quy tắc SRS và kiểm tra trên Android.
- `artifacts/vocabflow/docs/kiem-tra-buoc-3.md`: đóng băng và bỏ đóng băng.

## Quy tắc SRS

- Theo lịch mới người dùng yêu cầu: học mới ngay trong ngày đầu, sau đó +1, +3, +7, +14, +30 ngày từ ngày học gốc. Không cộng dồn các khoảng cách giữa các lần ôn.
- Từ vừa lưu có hạn học ngay; ngày học gốc được chốt khi trả lời thẻ lần đầu, không phải ngày thêm nếu người dùng học trễ.
- Cấp là mốc đang chờ kiểm tra. Đúng: lên một cấp; đúng ở cấp 6: hoàn tất chu kỳ, vẫn giữ từ trong sổ.
- Sai chỉ lùi một cấp, thấp nhất cấp 1; giữ ngày học gốc và hẹn ngày mai. Quy tắc này thay cho giả định ban đầu “sai về cấp 1”.
- Nếu trả lời đúng muộn và mốc tiếp theo đã qua, hẹn ngày mai để không ôn nhiều cấp cùng một ngày.
- Sửa từ không đặt lại SRS. Dữ liệu Bước 1 được chuyển sang cấp 1 với ngày học lấy từ ngày tạo cũ, không xóa từ.
- Đổi lịch chỉ tính lại hạn ôn, giữ cấp, số lần trả lời, ngày học và trạng thái hoàn tất. Nếu đã trả lời hôm nay, hạn sớm nhất là ngày mai.

## Đóng băng

- Từ đóng băng vẫn trong danh sách và tổng số từ; chỉ tắt ôn, không xóa hoặc chuyển sang kho lưu trữ khác. Chấm điểm cũng phải từ chối từ đóng băng.
- Bỏ đóng băng về cấp 6, giữ ngày học và số lần trả lời. Hạn là mốc ngày học +30, hoặc hôm nay nếu đã quá hạn; nếu đã trả lời hôm nay thì sớm nhất ngày mai.
- Lý do: cấp 6 dùng cùng mốc 30 ngày của lịch SRS đã chọn, không tính lại một chu kỳ 30 ngày từ ngày bỏ đóng băng và không tự hoàn tất từ.
- Mở danh sách riêng từ Cài đặt; có thể đóng/bỏ đóng băng từ màn xem/sửa từ. Trong Ôn tập, nút đóng băng dùng cùng khóa bận với chấm điểm để tránh thao tác trùng.

## Lưu trữ

SQLite cục bộ là nguồn dữ liệu cho từ và tiến độ; không thay bằng AsyncStorage hay cơ sở dữ liệu máy chủ. Migration có phiên bản, không xóa hoặc seed dữ liệu. Các thao tác được tuần tự hóa và dùng tham số SQL. Sửa từ không thay ngày tạo.

Đóng app không xóa dữ liệu. Gỡ app/xóa dữ liệu ứng dụng (hoặc xóa dữ liệu Expo Go) có thể làm mất dữ liệu; chưa có sao lưu hoặc đồng bộ.

Kiểm tra SQL tự động chạy trên SQLite của Node với adapter mô phỏng cầu nối Expo. Không thay thế kiểm tra thực tế Android/Expo Go.
