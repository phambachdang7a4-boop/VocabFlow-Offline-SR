---
name: Quy tắc phần thưởng rương
description: Quy ước đã chốt về đổi mảnh, xác suất nâng cấp và bảo toàn phần thưởng cũ.
---

Mảnh Common và Uncommon không được đổi thành Stone; mảnh hai bậc này không cộng vào phần thưởng sưu tập hiện tại. Giữ nguyên các khoản Stone đã nhận từ rương Common trước đây. Rương chưa mở phải dùng quy tắc mới, kể cả khi đã có lượt nâng cấp. Không đổi cơ chế xác suất nâng cấp theo lượt: lượt trượt vẫn tiêu hao, bậc giữ nguyên; lượt Siêu Việt hiện có vẫn hoạt động như cũ.

**Why:** Người dùng muốn bỏ đổi mảnh Common/Uncommon thành Stone nhưng giữ các quy tắc nâng cấp hiện tại và không làm thay đổi khoản thưởng lịch sử đã nhận.

**How to apply:** Khi cập nhật phần thưởng rương, giữ riêng quy tắc dữ liệu cũ và mới xuyên suốt SQLite, backup, đồng bộ client/server; chỉ áp dụng quy tắc mới cho rương chưa mở.

Rương nhiệm vụ chỉ được nâng tối đa đến Platinum; rương Platinum chốt ngay, còn rương Corvi đã kiếm được từ luật cũ vẫn mở được nhưng không nâng tiếp. Mỗi nhiệm vụ mới được nhận sau ngày triển khai cho 1 mảnh Corvi; đủ 15 mảnh tự mở rương, thưởng 2.000 Stone, tượng Corvi và mảnh sưu tập xác định ổn định. Không cấp bù mảnh cho nhiệm vụ lịch sử.

**Why:** Người dùng muốn Corvi chuyển từ bậc nâng cấp cuối sang phần thưởng tiến độ nhiệm vụ, đồng thời giữ phần thưởng tượng/mảnh và dữ liệu lịch sử.

**How to apply:** Giữ mốc ngày bắt đầu trong dữ liệu cục bộ để không hồi tố; đồng bộ mảnh và rương theo khóa duy nhất để nhiều thiết bị không trả trùng Stone hoặc tượng.
