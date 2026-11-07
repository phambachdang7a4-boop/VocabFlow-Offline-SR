# VocabFlow

Ứng dụng Android học từ vựng Anh–Việt cho người Việt, offline-first, không tài khoản hay API trả phí.

## Phạm vi và tiến trình

- Bước 1: quản lý từ cá nhân, SQLite, điều hướng Danh sách từ / Thêm–Sửa từ / Ôn tập / Cài đặt.
- Ôn tập hiện là lật thẻ thủ công; chưa phải SRS.
- Các bước tiếp theo trong kế hoạch: SRS 6 cấp; đóng băng; giới hạn Free 100 từ và màn mời Premium 169.000đ/năm.
- Không thêm dữ liệu mẫu, từ khởi tạo, từ điển lớn hoặc thanh toán thật.
- Người dùng yêu cầu làm tuần tự từng bước chạy được và báo cách kiểm tra trên điện thoại sau mỗi bước.

## Run & Operate

- Workflow mobile: `artifacts/vocabflow: expo`.
- `pnpm --filter @workspace/vocabflow run typecheck`
- `node artifacts/vocabflow/scripts/check-storage.cjs`
- Các workflow API và Canvas là scaffold có sẵn; app hiện không gọi backend.

## Cấu trúc

- `artifacts/vocabflow/app/`: các màn hình và điều hướng Expo Router.
- `artifacts/vocabflow/contexts/`: trạng thái dùng chung.
- `artifacts/vocabflow/data/`: kiểu dữ liệu và truy cập SQLite.
- `artifacts/vocabflow/components/`: giao diện dùng chung.
- `artifacts/vocabflow/constants/`: màu sắc.
- `artifacts/vocabflow/docs/kiem-tra-buoc-1.md`: kiểm tra trên Android.

## Lưu trữ

SQLite cục bộ là nguồn dữ liệu cho từ và tiến độ; không thay bằng AsyncStorage hay cơ sở dữ liệu máy chủ. Migration có phiên bản, không xóa hoặc seed dữ liệu. Các thao tác được tuần tự hóa và dùng tham số SQL. Sửa từ không thay ngày tạo.

Đóng app không xóa dữ liệu. Gỡ app/xóa dữ liệu ứng dụng (hoặc xóa dữ liệu Expo Go) có thể làm mất dữ liệu; chưa có sao lưu hoặc đồng bộ.

Kiểm tra SQL tự động chạy trên SQLite của Node với adapter mô phỏng cầu nối Expo. Không thay thế kiểm tra thực tế Android/Expo Go.
