---
name: Quy tắc phần thưởng rương
description: Quy ước đã chốt về đổi mảnh, xác suất nâng cấp và bảo toàn phần thưởng cũ.
---

Mảnh Common và Uncommon không được đổi thành Stone; mảnh hai bậc này không cộng vào phần thưởng sưu tập hiện tại. Giữ nguyên các khoản Stone đã nhận từ rương Common trước đây. Rương chưa mở phải dùng quy tắc mới, kể cả khi đã có lượt nâng cấp. Không đổi cơ chế xác suất nâng cấp theo lượt: lượt trượt vẫn tiêu hao, bậc giữ nguyên; lượt Siêu Việt hiện có vẫn hoạt động như cũ.

**Why:** Người dùng muốn bỏ đổi mảnh Common/Uncommon thành Stone nhưng giữ các quy tắc nâng cấp hiện tại và không làm thay đổi khoản thưởng lịch sử đã nhận.

**How to apply:** Khi cập nhật phần thưởng rương, giữ riêng quy tắc dữ liệu cũ và mới xuyên suốt SQLite, backup, đồng bộ client/server; chỉ áp dụng quy tắc mới cho rương chưa mở.
