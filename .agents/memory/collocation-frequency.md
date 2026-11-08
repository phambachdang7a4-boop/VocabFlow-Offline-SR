---
name: Tần suất cụm từ
description: Nguồn tần suất collocation và cách xử lý các mục không có số đếm trực tiếp.
---

OpenSubtitles Collocations là nguồn có số đếm trực tiếp cho các cụm được liệt kê, theo giấy phép CC BY 4.0 và phiên bản được ghim. Các cụm bổ sung từ WordNet không có trong bảng tần suất phải giữ `count: null` và xếp sau cụm có số đếm; không dùng tần suất của từng từ thành tố làm đại diện.

**Why:** Tần suất thành tố phổ biến có thể khiến một cụm kỹ thuật ít gặp bị xếp cao. Bảng OpenSubtitles hiện chỉ chứa 15.000 collocation, nên sự vắng mặt không chứng minh tần suất thực là 0.

**How to apply:** Khi mở rộng danh sách collocation, chỉ gán điểm từ số đếm của chính cụm trong nguồn có giấy phép và phiên bản rõ ràng; nếu không có số đếm, để trống và không trộn vào thứ tự cụm đã quan sát.
