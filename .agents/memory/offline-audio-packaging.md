---
name: Gói audio offline
description: Quyết định lưu trữ và tải bộ phát âm lớn của VocabFlow.
---

Giữ bộ audio từ điển ngoài APK và tải thành gói SQLite riêng từ App Storage khi người dùng chọn cài trong Cài đặt.

**Why:** Bộ audio chứa hơn 100.000 tệp Opus và lớn hơn 300 MB; nhúng vào APK sẽ làm ứng dụng tải về nặng hơn đáng kể.

**How to apply:** Khi cập nhật audio, tạo lại gói SQLite có checksum và số mục cố định, tải lên App Storage, rồi cập nhật metadata/endpoint; giữ phát âm TTS làm phương án dự phòng khi gói chưa cài.
