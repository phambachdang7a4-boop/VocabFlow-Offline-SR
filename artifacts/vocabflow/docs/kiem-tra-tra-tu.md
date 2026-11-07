# Tra Từ — từ điển Anh–Việt trên thiết bị

## Các phần đã hoàn thiện

1. **Kho tham chiếu riêng:** tệp SQLite nguồn đã xác minh có 104.829 mục từ, 158.307 định nghĩa, 175.735 liên kết nghĩa/ví dụ. Dung lượng tải chính xác 44.212.224 byte, khoảng 42,2 MiB. Không tự thêm vào sổ cá nhân.
2. **Tab Tra Từ:** tìm tiếng Anh theo các chữ cái đầu, không phân biệt chữ hoa/thường; xem IPA, loại từ, nghĩa và ví dụ. Kết quả và các nghĩa chia trang, mỗi trang 30. Ký tự `%`, `_` được coi là ký tự người dùng nhập, không là ký tự đại diện SQL.
3. **Đưa vào sổ:** bấm **Lưu từ** cạnh nghĩa muốn học để lưu ngay, không qua biểu mẫu xác nhận. Mỗi nghĩa là một mục SRS riêng, học được ngay. Nghĩa đã có mở đúng mục hiện có, không ghi đè hoặc đặt lại tiến độ/đóng băng; các nghĩa khác cùng từ vẫn lưu được.
4. **Nguồn:** nút thông tin mở phần ghi công và văn bản giấy phép đầy đủ, có sẵn trong app, không cần tải trang web.

## Kiểm tra trên Android bằng Expo Go hoặc Chrome

### 1. Nạp lần đầu và tra cứu

- Mở app qua mã QR dự án như trước, chọn tab **Tra Từ** ở thanh dưới.
- Nếu đang dùng Chrome Android, tải lại trang để nhận bản mới, sau đó chọn **Tra Từ**; không cần chuyển sang Expo Go hoặc xóa dữ liệu trình duyệt.
- Tệp tải trực tiếp từ nguồn GitHub công khai, ghim commit và kiểm SHA-256. Không cần đăng nhập cho tệp từ điển; không tải qua API preview riêng tư. Bản mirror App Storage vẫn được giữ cho người phát triển.
- Trước khi tải, app hỏi **Tải kho từ điển về máy?**, nêu dung lượng **42,2 MiB (khoảng 44,2 MB)** và cảnh báo cước 3G/4G/5G. Chưa nhấn **Đồng ý tải** thì không gửi yêu cầu tải tệp, trên cả Wi-Fi lẫn dữ liệu di động. Chọn **Để sau** để về Sổ từ; vẫn thêm từ và ôn tập bình thường.
- Lần đầu cần có mạng và đủ dung lượng trống. Chỉ sau khi đồng ý, app mới tải 42,2 MiB và cần thêm dung lượng tạm để xác minh/nhập SQLite, không chỉ đúng 42,2 MiB. Nên có ít nhất vài trăm MB trống.
- Sau khi nhấn **Đồng ý tải**, nút phải được thay ngay bằng trạng thái kiểm tra/tải; thao tác không cần chuyển tab rồi quay lại để bắt đầu. Nhấn liên tiếp không tạo nhiều lượt tải.
- Chờ thông báo tải/kiểm tra biến mất. Nếu mất mạng hoặc tệp thiếu/hỏng, app hiện lỗi và hỏi lại trước lần tải tiếp theo. Chỉ nhấn **Đồng ý tải** khi sẵn sàng; app không ghi nhớ quyền dùng dữ liệu di động cho các lần tải lại. Sổ cá nhân không bị xóa khi tải lỗi.
- Sau khi xác minh, app hiện **Đã tải xong. Đang nhập từ điển vào SQLite trên máy…**. Bản tải gốc được kiểm SHA-256 trước; bản sao để nhập được chuẩn hóa chế độ nhật ký SQLite, không sửa nội dung từ hay sổ cá nhân.
- Nhập một từ tiếng Anh, chẳng hạn từ bạn đang cần học. Tìm theo tiền tố, bấm một kết quả, kiểm tra nghĩa/IPA/ví dụ.
- Thử một chuỗi không có trong nguồn: app báo không có mục từ, vẫn cho tự ghi từ mới.
- Thử gõ `sincth`, `recieve` hoặc `langauge` sau khi kho đã nạp: nếu không có kết quả tiền tố, app hiện **Có phải bạn đang tìm từ này?** và gợi ý từ gần đúng (`since`, `receive`, `language`). Chạm gợi ý để sửa ô tìm và mở đúng mục từ; không tự lưu vào sổ.
- Gợi ý chạy trên SQLite đã nạp, không tải thêm dữ liệu hay gửi từ tra cứu lên mạng. Tối đa 10 từ gần đúng cho truy vấn 2–32 ký tự, có xử lý thiếu/thừa/sai/đảo chữ. Đổi hoặc xóa truy vấn trong lúc đang gợi ý không được hiện lại kết quả cũ. Không có từ đủ gần thì giữ nút tự ghi từ mới.

### 2. Lưu để ôn và chống trùng

- Chọn kết quả để xem nghĩa ngay trong tab **Tra Từ** (tab ngoài cùng bên trái). Bấm **Lưu từ** cạnh đúng nghĩa muốn học: lưu ngay từ, nghĩa được chọn, IPA, ví dụ và ghi chú nguồn vào SQLite. Hiện **Đã lưu vào Sổ từ**, vẫn ở màn Tra Từ, không mở Từ mới để xác nhận.
- Ngay dưới thanh tìm kiếm khi mở mục từ có ô **Từ loại**: mặc định chọn loại của nghĩa đầu tiên theo thứ tự nguồn (nếu nghĩa đầu tiên là động từ thì chọn Verb), và chỉ hiện các nghĩa thuộc loại đó. Mở checklist chọn **Verb, Noun, Adjective, Adverb, Idiom, Others**; các loại có trong từ cũng theo thứ tự xuất hiện. Chọn nhiều loại để xem hợp các nghĩa; **Tất cả** bỏ bộ lọc. Loại không có trong mục từ bị vô hiệu hóa; các lựa chọn được tính trên toàn bộ nghĩa, không chỉ trang đầu.
- Thử mục từ nhiều nghĩa như `work`, đổi giữa Noun và Verb rồi chọn cả hai, tải thêm và lưu một nghĩa. Từ/định nghĩa/IPA/ví dụ phải đúng nghĩa được chọn. Bộ lọc không sửa nội dung nguồn hay tiến độ trong sổ; đổi sang mục từ mới phải chọn loại của nghĩa đầu tiên của từ mới, không kế thừa bộ lọc trước. Dòng hướng dẫn “Bấm Lưu từ…” không còn hiển thị.
- Dùng nút kính lúp hoặc phím tìm kiếm để tra ngay; nếu có từ khớp chính xác, app mở mục từ đó. **Kết quả tra cứu** quay về danh sách; sửa/xóa nội dung tìm kiếm cũng trở về kết quả, không để phản hồi cũ mở nhầm từ.
- Chưa bấm Lưu thì từ chưa được thêm. Nhấn trùng hoặc bấm hai nghĩa khi đang lưu chỉ tạo một lượt ghi. Lỗi ghi phải hiện lỗi, giữ màn tra cứu và cho bấm lưu lại; không báo thành công giả, không cắt nguồn âm thầm. Sau khi đã ghi mà tải lại sổ lỗi, chỉ thử tải lại sổ, không lưu trùng.
- Sang **Sổ từ** và **Ôn tập** để kiểm tra từ mới và hạn học ngay. Có thể sửa nội dung sau trong Sổ từ.
- Tra lại cùng từ: chỉ nghĩa đã lưu hiện **Trong sổ** hoặc **Đóng băng**, mở đúng mục của nghĩa đó. Các nghĩa chưa lưu vẫn có nút **Lưu từ**; lưu thêm nghĩa khác tạo mục mới với cấp 1 riêng.
- Ví dụ lưu hai nghĩa của `take`: Sổ từ phải có hai mục với nghĩa/ví dụ riêng; tổng số từ tăng 2. Ôn đúng một mục làm mục đó lên cấp 2, mục còn lại vẫn cấp 1/đến hạn. Không gom hoặc chấm cả hai chỉ vì đáp án tiếng Anh giống nhau.
- Khi cập nhật, dữ liệu cũ giữ nguyên nội dung, ID, cấp, lịch ôn và trạng thái đóng băng/hoàn tất. Không tự tách mục cũ hoặc thêm những nghĩa chưa chọn.
- Đóng băng từ đã lưu, tra lại rồi mở trang trong sổ: trạng thái đóng băng và tiến độ vẫn giữ nguyên.

### 3. Tra khi không có mạng và lưu bền vững

- Sau khi đã nạp xong, giữ app đang mở, bật chế độ máy bay rồi tra một từ khác chưa tra trước đó: kết quả vẫn phải có từ SQLite trên máy.
- Vẫn có thể thêm từ vừa tra vào sổ và ôn khi ngắt mạng.
- Kết nối lại để tải JavaScript từ máy chủ phát triển nếu Expo Go yêu cầu khi mở lại dự án. Đóng hẳn và mở lại để xác nhận sổ, tiến độ và kho tham chiếu còn trên thiết bị, không tải lại 42,2 MiB.
- Expo Go là môi trường phát triển: việc cần kết nối máy chủ để lấy mã JavaScript khác với việc tra cứu cần mạng. Bản phát hành cần kiểm tra riêng trên điện thoại thật với mã app đã đóng gói; không coi kiểm tra trình duyệt là kiểm tra Android thật.
- Không gỡ app hoặc xóa dữ liệu Expo Go để thử lưu bền vững: thao tác đó có thể xóa SQLite. Chưa có chức năng sao lưu cá nhân.

## Dữ liệu, giấy phép và phân phối

- Nguồn: https://github.com/skypediacode/english-vietnamese-dictionary
- Phiên bản được chốt trong `domain/dictionary.ts`; không dùng nhánh `main` thay đổi tự động trong app.
- Tệp phục vụ qua API được lưu trong **App Storage**, không nằm trong lịch sử Git; bản tải để kiểm tra ở `/generated-artifacts/dictionary/` và bị loại khỏi Git/triển khai.
- API chỉ tải file công khai một lần, không nhận từ tìm kiếm, sổ cá nhân hoặc tiến độ. Không API tra cứu trả phí, không đăng nhập, không giới hạn số từ.
- Nội dung từ điển nguồn giữ nguyên; bản trên máy chỉ thêm chỉ mục tìm kiếm và dấu hoàn tất. Cache tham chiếu chỉ đọc sau khởi tạo. Sổ và tiến độ vẫn dùng `vocabflow.db` riêng.
- Giữ nguyên LICENSE và ATTRIBUTION của Skypedia, cùng snapshot LICENSE upstream MinhQND, trong `assets/dictionary-notices.json`, đọc được ngay trong app.
- Skypedia công bố CC BY-SA 4.0, có nhắc nguồn OVDP GPLv2. MinhQND có LICENSE MIT nhưng README dẫn CC BY-SA. Đây là điểm cần làm rõ trước khi phân phối thương mại; app không khẳng định các quyền đã được xác minh đầy đủ. Phần dữ liệu phái sinh được phân phối phải tôn trọng điều kiện ghi công/chia sẻ tương tự áp dụng; không suy diễn giấy phép dữ liệu thành kết luận về toàn bộ mã app.
- Các ví dụ được tạo theo mô tả của nguồn; không bảo đảm mọi câu đều đúng hoặc phù hợp mọi ngữ cảnh.

## Kiểm tra tự động

```sh
node artifacts/vocabflow/scripts/prepare-dictionary.cjs
pnpm --filter @workspace/vocabflow run typecheck
pnpm --filter @workspace/api-server run typecheck
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-dictionary.cjs
node artifacts/vocabflow/scripts/check-dictionary-button.cjs
node artifacts/vocabflow/scripts/check-dictionary-ui.cjs
node artifacts/vocabflow/scripts/check-dictionary-wasm.cjs
node artifacts/vocabflow/scripts/check-sqlite-connection.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-storage.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-freeze.cjs
TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-srs.cjs
```

Kiểm tra dùng dữ liệu tạm, không tạo từ mẫu trong app. Bao gồm không tải trước xác nhận ở cả tra cứu/chi tiết/biểu mẫu, xin phép lại khi tải lỗi; SHA-256/kích thước/schema thật; truy vấn có giới hạn; thoát ký tự SQL; sao chép đúng nghĩa; không lưu trước xác nhận; bảo toàn từ trùng/đóng băng; nhập cache, mở lại cache khi không có mạng không cần xác nhận lại; không xóa sổ cá nhân; cache chỉ đọc.

App Storage đã có bản mirror (không phải đường tải mặc định của app). Nếu cần khôi phục mirror trên môi trường có App Storage đã cấp:

```sh
node artifacts/vocabflow/scripts/prepare-dictionary.cjs --upload
```

Không gọi lệnh này khi khởi động app hoặc cho người dùng upload. Đây là lệnh chuẩn bị dữ liệu công khai của người phát triển.

## Phạm vi xác minh

TypeScript, truy vấn trên dữ liệu thật, logic nhập/cache và mở lại khi không có mạng bằng adapter Node SQLite, kiểm tra hồi quy sổ/SRS/đóng băng đều đạt. Endpoint phục vụ trả đúng kích thước và SHA-256 của tệp nguồn; manifest và bundle Android biên dịch thành công. Ảnh bản xem trước xác nhận tab Tra Từ và giao diện tải kho.

Lượt kiểm tra tự động toàn bộ luồng nhấn nút bằng trình duyệt ngoài bị trang bảo vệ bản xem trước riêng tư của Replit chặn trước khi vào app. Chưa xác minh trọn luồng UI hoặc chạy trên điện thoại Android thật; không báo lượt này là đã đạt. Không thay đổi quyền riêng tư dự án để né trang bảo vệ. Thực hiện các bước kiểm tra trên điện thoại ở trên trước khi phát hành.
