---
name: Lịch sử thống kê ôn tập
description: Giới hạn của dữ liệu SRS cũ khi hiển thị số lượt ôn và tỷ lệ chính xác theo ngày.
---

Chỉ tính thống kê từ những lượt ôn được ghi nhận sau khi có tính năng thống kê. Dữ liệu SRS cũ lưu tổng lượt và ngày ôn gần nhất, không đủ để khôi phục chính xác từng ngày hay phân biệt câu trả lời đúng và sai. Không tạo dữ liệu lịch sử ước lượng.

**Why:** Số liệu suy đoán sẽ làm sai tỷ lệ chính xác và biểu đồ người dùng dựa vào để theo dõi tiến độ.

**How to apply:** Khi bổ sung bộ lọc tuần, xuất báo cáo hoặc thay đổi schema thống kê, giữ nguyên giới hạn này và thông báo rõ rằng dữ liệu lịch sử bắt đầu từ thời điểm ghi nhận mới.
