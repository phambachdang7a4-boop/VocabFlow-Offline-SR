---
name: Nhập SQLite WAL
description: Khác biệt giữa đọc SQLite trên đĩa và deserialize vào bộ nhớ của Expo.
---

Không coi một adapter ghi binary xuống đĩa rồi mở SQLite là phép kiểm đầy đủ cho `deserialize` vào bộ nhớ. Nguồn đang ở chế độ WAL có thể đọc bình thường trên đĩa nhưng báo `SQLITE_CANTOPEN` (14) khi deserialize, vì bộ nhớ không có tệp WAL phụ.

**Why:** Điều này đã được tái hiện với chính binary từ điển và SQLite WASM đi kèm Expo, trong khi kiểm bằng adapter file vẫn qua. Chỉ kiểm mạng, checksum hoặc truy vấn trên file gốc không phát hiện được sai khác này.

**How to apply:** Luôn xác minh kích thước/hash trên bytes nguồn nguyên gốc trước. Nếu cần chuẩn hóa chế độ nhật ký để nhập, chỉ làm trên bản sao nhập riêng, giữ nguyên nội dung và tệp phân phối. Duy trì kiểm tra bằng bộ máy WASM thật cho deserialize/backup/truy vấn; không thay bằng mock ghi file khi thay đổi pipeline nhập.
