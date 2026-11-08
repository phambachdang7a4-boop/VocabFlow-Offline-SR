---
name: Tần suất cụm từ
description: Nguồn tần suất collocation và cách xử lý các mục không có số đếm trực tiếp.
---

OpenSubtitles Collocations (CC BY 4.0, phiên bản được ghim) cung cấp số đếm trực tiếp cho các cụm trong bảng của nó. Các cụm WordNet bổ sung dùng số đếm cụm chính xác từ WikiText-103 Raw (CC BY-SA 3.0, bản phát hành được ghim). Số đếm từ hai corpus chỉ xếp hạng trong từng nguồn, không so sánh chéo; số 0 nghĩa là cụm không xuất hiện trong corpus đã quét, không phải thiếu dữ liệu. Không suy ra số đếm từ tần suất thành tố.

**Why:** Tần suất thành tố phổ biến có thể khiến một cụm kỹ thuật ít gặp bị xếp cao. Corpus khác nhau không có cùng quy mô hay phân bố, nên số đếm thô không thể so sánh chéo. Sự vắng mặt trong một nguồn chỉ cho biết số đếm trong nguồn đó, không phải tần suất phổ quát.

**How to apply:** Khi mở rộng danh sách collocation, chỉ dùng số đếm của chính cụm từ nguồn có giấy phép, phiên bản và checksum rõ ràng; giữ từng nguồn thành bảng xếp hạng riêng, và phân biệt số đếm 0 với dữ liệu không có.
