---
name: Tab Expo Router
description: Khác biệt API định tuyến tab trong SDK hiện tại so với các ví dụ cũ.
---

Với Expo Router của SDK hiện tại, không truyền `initialRouteName` trực tiếp vào `Tabs`. Dùng `unstable_settings.anchor` để khai báo màn neo và `backBehavior="initialRoute"` khi muốn nút quay lại trở về màn đó.

**Why:** Ví dụ cũ còn dùng `initialRouteName`, nhưng kiểu props hiện tại đã loại bỏ thuộc tính đó. Cú pháp cũ trong `unstable_settings` còn tạo cảnh báo deprecated, và màn neo không khớp hành vi quay lại mặc định nếu chỉ đổi thứ tự các tab.

**How to apply:** Khi sắp xếp lại tab, giữ đường dẫn gốc và màn khởi đầu theo yêu cầu riêng; vị trí tab đầu không đồng nghĩa phải đổi trang mặc định. Xác minh cả thứ tự tab và hành vi quay lại, dùng typecheck thay vì sao chép ví dụ API cũ.
