---
name: Expo FileSystem trên web
description: Hành vi không tương thích của File/Directory Expo FileSystem trong bản web VocabFlow.
---

Không khởi tạo `File` hoặc `Directory` của `expo-file-system` khi `Platform.OS === "web"`. Trong SDK 58, implementation web chỉ là stub; constructor của lớp File/Directory gọi `validatePath`, nhưng lớp nền web không cung cấp hàm đó, gây lỗi `this.validatePath is not a function`.

**Why:** Khi đặt lại dữ liệu trong Chrome, dữ liệu học cục bộ đã bị xóa nhưng bước dọn gói audio tiếp tục tạo `File` và phát sinh lỗi. Audio offline chỉ hỗ trợ Android; phần xóa database SQLite có thể xử lý riêng trên web.

**How to apply:** Thêm nhánh web trước mọi helper tạo `File`/`Directory`, chỉ gọi các API có hỗ trợ trên web như xóa database SQLite; giữ xóa tệp/cache trên iOS và Android.
