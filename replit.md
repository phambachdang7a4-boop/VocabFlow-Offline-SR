# VocabFlow

Ứng dụng Android học từ vựng Anh–Việt cho người Việt, offline-first, không tài khoản hay API trả phí.

## Phạm vi và tiến trình

- Bước 1: quản lý từ cá nhân, SQLite, điều hướng Danh sách từ / Thêm–Sửa từ / Ôn tập / Cài đặt.
- Bước 2: SRS 6 cấp, chỉ ôn từ đến hạn (kể cả quá hạn), lưu tiến độ SQLite.
- Bước 3: đóng băng từ khỏi ôn tập, danh sách riêng, bỏ đóng băng về cấp 6.
- Theo yêu cầu hiện tại: tạo bản không giới hạn số từ, kể cả từ đóng băng. Tạm hoãn giới hạn Free 100 từ và màn mời Premium; chỉ triển khai lại khi người dùng yêu cầu.
- Không thêm dữ liệu mẫu, từ khởi tạo hoặc thanh toán thật.
- Người dùng đã duyệt mở rộng Tra Từ: tích hợp kho Skypedia Anh–Việt riêng để tra cứu; chỉ đưa từ vào sổ và SRS khi người dùng chọn nghĩa rồi lưu.
- Nút **Lưu từ** ở Tra Từ ghi ngay nghĩa được chọn vào SQLite và giữ màn tra cứu; không chuyển sang Từ mới để xác nhận. Giữ IPA, ví dụ, nguồn; chống nhấn trùng và không ghi đè nghĩa/tiến độ đã có.
- Đơn vị học/đếm là **một nghĩa**, không phải một từ tiếng Anh. Cùng một từ có nhiều nghĩa đã lưu thì có nhiều mục, mỗi mục có ID, SRS, hạn ôn, đóng băng và xóa độc lập. Chỉ lưu/ôn nghĩa đã bấm Lưu; không đánh dấu mọi nghĩa là đã lưu chỉ vì trùng từ tiếng Anh.
- Nghĩa tra cứu nhận diện bằng cặp ID mục từ/nghĩa trong kho đã ghim. Không đổi nguồn/commit kho khi chưa kiểm tra tính ổn định của cặp ID. Mục cũ/thủ công đối chiếu cả từ lẫn nghĩa, không đoán thêm nghĩa hoặc tự tách dữ liệu cũ; giữ nguyên ID, nội dung và tiến độ khi chuyển lưu trữ.

## Giao diện

- Bản sáng mặc định: nền kem giấy `#F7F1E3`, navy `#2F4F86` cho tiêu đề/thẻ từ/thanh điều hướng, nút chính vàng kính `#E9B949` với chữ tối.
- Bản tối người dùng chọn trong Cài đặt: nền xanh đen `#1E2130`, thẻ và thanh điều hướng navy `#2F4F86`, nút chính vàng `#E9B949`.
- Lưu lựa chọn sáng/tối riêng trên thiết bị; khởi động mới không được phụ thuộc vào giao diện hệ thống. Không lưu tùy chọn này thay cho SQLite từ vựng/tiến độ.
- Chữ thường phải đủ tương phản. Không dùng chữ vàng trên nền kem. Đỏ `#C0392B` dành cho sai/cảnh báo; xanh lá `#3E8E5A` cho đúng; xanh băng `#BFE3F2` cho trạng thái đóng băng.
- Giữ hai bảng màu đồng bộ ở mọi màn hình, nút, trạng thái và thanh điều hướng; cập nhật `constants/colors.ts` cùng kiểm tra `scripts/check-appearance.cjs` khi đổi màu giao diện.
- Người dùng yêu cầu Tra Từ theo bố cục ảnh Mochi: phần tìm kiếm xanh, nội dung nghĩa/ví dụ rõ ràng trên nền sáng và nút thêm cạnh nghĩa; tab Tra Từ nằm ngoài cùng bên trái. Giữ tên VocabFlow, không tự thêm đồng nghĩa, IELTS, cấp CEFR hay âm thanh không có dữ liệu/chức năng thật.
- Tra Từ có gợi ý sai chính tả offline khi không khớp tiền tố: câu “Có phải bạn đang tìm từ này?” và các từ gần đúng có thể chạm để xem nghĩa. Chỉ lấy mục từ thật trong SQLite, không API/AI hoặc tự lưu; giữ lựa chọn tự ghi từ mới.
- Người dùng yêu cầu gạch chân từ đang tra trong câu ví dụ ở Tra Từ.
- Người dùng yêu cầu bỏ câu hướng dẫn “Bấm Lưu từ…” và thêm checklist từ loại dưới thanh tìm kiếm: Verb, Noun, Adjective, Adverb, Idiom, Others. Lọc nghĩa của từ đang xem, chọn nhiều loại. Mặc định chọn từ loại của nghĩa xuất hiện đầu tiên theo thứ tự nguồn; không mặc định Tất cả. Danh sách loại có trong từ cũng theo thứ tự xuất hiện.
- Người dùng yêu cầu hỏi trước khi dùng dữ liệu di động để tải từ điển. Quy tắc an toàn: không tự tải trên bất kỳ loại mạng nào; hiện dung lượng/cảnh báo cước và chờ “Đồng ý tải” cho từng lần tải/thử lại. Kho đã nạp vẫn mở offline không cần hỏi lại; “Để sau” giữ nguyên sổ và ôn tập.
- Người dùng yêu cầu làm tuần tự từng bước chạy được và báo cách kiểm tra trên điện thoại sau mỗi bước.
- Thanh tab theo thứ tự **Tra Từ / Khóa Học / Ôn tập / Sổ từ / Trống**; giữ Sổ từ làm trang mở đầu. Khóa Học có bộ “1000 từ cơ bản”, Trống chỉ giữ chỗ. Cài đặt không còn là tab: mở bằng bánh răng góc trên phải Ôn tập, quay lại được màn trước.
- Người dùng duyệt khóa học offline “1000 từ cơ bản”: 25 bài chủ đề đời sống, tổng đúng 1.000 mục từ-nghĩa, số lượng mỗi bài có thể khác nhau. Không tải từ điển hay gọi API trả phí để cung cấp dữ liệu khóa học.
- Mỗi bài gồm xem flashcard, gõ lại từ theo nghĩa tiếng Việt, rồi checklist toàn bộ mục để chọn mục muốn lưu. Chỉ mục đã chọn vào sổ; mục mới bắt đầu SRS cấp 1, mục trùng từ-nghĩa không tạo bản sao. Tiến độ học, lựa chọn checklist, và hoàn thành bài lưu SQLite.
- Bài hoàn thành đổi màu; thẻ khóa học đổi màu khi hoàn thành đủ 25 bài. Người học có thể mở bài bất kỳ; bài dở tiếp tục từ bước đã lưu.
- Ôn tập mở bằng tổng quan theo ảnh tham khảo: biểu đồ 6 cột theo cấp, tổng từ trong sổ và nút bắt đầu phiên ôn. Chưa đến hạn thì thay nút bằng thanh đếm ngược tới lịch gần nhất theo ngày địa phương; không có lịch tương lai thì báo rõ, không tạo đồng hồ giả.
- Biểu đồ đếm cả từ hoàn tất/đóng băng ở cấp đang lưu để tổng cột khớp tổng sổ cá nhân. Hàng đợi ôn và đếm ngược vẫn loại từ hoàn tất/đóng băng; không thay lịch SRS hoặc tự bắt đầu phiên khi đồng hồ hết.

## Run & Operate

- Workflow mobile: `artifacts/vocabflow: expo`.
- `pnpm --filter @workspace/vocabflow run typecheck`
- `node artifacts/vocabflow/scripts/check-storage.cjs`
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-srs.cjs`
- `TZ=America/New_York node artifacts/vocabflow/scripts/check-srs.cjs`
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-review.cjs` (cũng chạy với `TZ=America/New_York` để kiểm tra DST): tổng 6 cấp, lịch gần nhất, chuyển ngày, vòng đời đồng hồ.
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-review-ui.cjs`: tổng quan, bắt đầu/quay lại/kết thúc phiên, hết đếm ngược, tỉ lệ cột và khóa lưu/chấm điểm/đóng băng.
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-review-exercises.cjs`: hai dạng câu, gợi ý 1–3/không gợi ý 4–6, so đáp án, SQLite chống chấm trùng.
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-independent-senses.cjs`: nhiều nghĩa cùng từ, SRS/đóng băng/xóa riêng, chuyển dữ liệu cũ không mất tiến độ, rollback khi lỗi và giữ ID.
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-freeze.cjs`
- `node artifacts/vocabflow/scripts/prepare-dictionary.cjs`: chuẩn bị tệp nguồn cho kiểm tra (nằm ngoài Git); `--upload` chỉ dùng khi cần cấp lại asset công khai trong App Storage.
- `TZ=Asia/Ho_Chi_Minh node artifacts/vocabflow/scripts/check-dictionary.cjs`
- `node artifacts/vocabflow/scripts/check-dictionary-button.cjs`: kiểm tra nút tải bắt đầu trực tiếp, khóa nhấn trùng và xin phép lại khi lỗi.
- `node artifacts/vocabflow/scripts/check-dictionary-ui.cjs`: kiểm tra tìm ngay, chống kết quả cũ mở nhầm từ, nghĩa chọn để lưu, từ trùng/đóng băng và thứ tự tab.
- `node artifacts/vocabflow/scripts/check-dictionary-wasm.cjs`: dùng đúng SQLite WASM/MemoryVFS của Expo để tái hiện lỗi WAL nguồn, rồi kiểm tra nhập, backup, tìm kiếm và mở lại bản chuẩn hóa.
- `pnpm --filter @workspace/vocabflow run check:course`: kiểm tra khóa học có 25 bài, đúng 1.000 mục, đủ nghĩa và không trùng cặp từ-nghĩa.
- `pnpm --filter @workspace/vocabflow run check:course-storage`: kiểm tra lưu/khôi phục tiến độ, checklist và thêm đúng mục đã chọn vào SQLite.
- `node artifacts/vocabflow/scripts/check-sqlite-connection.cjs`: kiểm tra mở SQLite tuần tự giữa các kho, quyền sở hữu một tab trên web và phục hồi hàng đợi khi lỗi.
- App tải tệp tham chiếu trực tiếp từ nguồn GitHub công khai đã ghim commit, không dùng cookie hay phụ thuộc đăng nhập của máy chủ preview. Chỉ nạp sau xác nhận rõ ràng ở Tra Từ; mọi truy vấn, sổ cá nhân và tiến độ vẫn trên máy. API `/api/dictionary/asset` giữ bản mirror App Storage nhưng không phải đường tải mặc định của app.
- Workflow Canvas là scaffold có sẵn, không cần cho chức năng app.

## Cấu trúc

- `artifacts/vocabflow/app/`: các màn hình và điều hướng Expo Router.
- `artifacts/vocabflow/contexts/`: trạng thái dùng chung.
- `artifacts/vocabflow/data/`: kiểu dữ liệu và truy cập SQLite.
- `artifacts/vocabflow/components/`: giao diện dùng chung.
- `artifacts/vocabflow/constants/`: màu sắc.
- `artifacts/vocabflow/docs/kiem-tra-buoc-1.md`: kiểm tra trên Android.
- `artifacts/vocabflow/docs/kiem-tra-buoc-2.md`: quy tắc SRS và kiểm tra trên Android.
- `artifacts/vocabflow/docs/kiem-tra-on-tap.md`: tổng quan 6 cấp, phiên ôn và thanh đếm ngược.
- `artifacts/vocabflow/docs/kiem-tra-buoc-3.md`: đóng băng và bỏ đóng băng.
- `artifacts/vocabflow/docs/kiem-tra-tra-tu.md`: kiểm tra kho từ điển, thêm vào sổ và offline.

## Quy tắc SRS

- Theo lịch mới người dùng yêu cầu: học mới ngay trong ngày đầu, sau đó +1, +3, +7, +14, +30 ngày từ ngày học gốc. Không cộng dồn các khoảng cách giữa các lần ôn.
- Từ vừa lưu có hạn học ngay; ngày học gốc được chốt khi nộp câu ôn lần đầu, không phải ngày thêm nếu người dùng học trễ.
- Cấp là mốc đang chờ kiểm tra. Đúng: lên một cấp; đúng ở cấp 6: hoàn tất chu kỳ, vẫn giữ từ trong sổ.
- Sai chỉ lùi một cấp, thấp nhất cấp 1; giữ ngày học gốc và hẹn ngày mai. Quy tắc này thay cho giả định ban đầu “sai về cấp 1”.
- Nếu trả lời đúng muộn và mốc tiếp theo đã qua, hẹn ngày mai để không ôn nhiều cấp cùng một ngày.
- Sửa từ không đặt lại SRS. Dữ liệu Bước 1 được chuyển sang cấp 1 với ngày học lấy từ ngày tạo cũ, không xóa từ.
- Đổi lịch chỉ tính lại hạn ôn, giữ cấp, số lần trả lời, ngày học và trạng thái hoàn tất. Nếu đã trả lời hôm nay, hạn sớm nhất là ngày mai.

## Ôn bằng nhập từ

- Người dùng chọn trộn hai dạng: đọc nghĩa viết từ và điền từ vào câu; không còn lật thẻ/tự chấm đúng-sai.
- Luân phiên dạng dựa trên một độ lệch cố định trong phiên, không dựa riêng số lần ôn của từng từ (tránh các từ khác cấp vô tình cùng một dạng). Phiên một từ đổi dạng theo lịch sử trả lời.
- Chỉ dùng câu ví dụ đã lưu có chứa chính xác từ/cụm từ; che mọi lần xuất hiện. Không có câu phù hợp thì dùng nghĩa thật, không tự tạo câu hay tải dữ liệu.
- Gợi ý giảm ở cấp 1–3, không lộ trọn đáp án kể cả từ ngắn; cấp 4–6 không có gợi ý chữ cái. Nhập đầy đủ từ; chấm bỏ qua hoa/thường và khoảng trắng thừa, không bỏ qua lỗi chính tả.
- Mỗi từ chấm một lần ở Kiểm tra/chưa thuộc; Tiếp tục chỉ chuyển câu. Giữ ảnh chụp từ/câu đến khi chuyển, dù ghi SQLite làm từ rời hàng đợi.
- Ghi và tải lại là hai bước: tải lại có thể lỗi sau khi ghi thành công. Giữ kết quả đã ghi và chỉ thử tải lại, không chấm lại. Lỗi ghi giữ nguyên đáp án đã nộp khi thử lưu lại để tránh sửa kết quả sau khi xem đáp án.

## Đóng băng

- Từ đóng băng vẫn trong danh sách và tổng số từ; chỉ tắt ôn, không xóa hoặc chuyển sang kho lưu trữ khác. Chấm điểm cũng phải từ chối từ đóng băng.
- Bỏ đóng băng về cấp 6, giữ ngày học và số lần trả lời. Hạn là mốc ngày học +30, hoặc hôm nay nếu đã quá hạn; nếu đã trả lời hôm nay thì sớm nhất ngày mai.
- Lý do: cấp 6 dùng cùng mốc 30 ngày của lịch SRS đã chọn, không tính lại một chu kỳ 30 ngày từ ngày bỏ đóng băng và không tự hoàn tất từ.
- Mở danh sách riêng từ Cài đặt; có thể đóng/bỏ đóng băng từ màn xem/sửa từ. Trong Ôn tập, nút đóng băng dùng cùng khóa bận với chấm điểm để tránh thao tác trùng.

## Lưu trữ

SQLite cục bộ là nguồn dữ liệu cho từ và tiến độ; không thay bằng AsyncStorage hay cơ sở dữ liệu máy chủ. Migration có phiên bản, không xóa hoặc seed dữ liệu. Các thao tác được tuần tự hóa và dùng tham số SQL. Sửa từ không thay ngày tạo.

Kho tra cứu dùng SQLite riêng, có kiểm SHA-256 và kích thước trước khi nhập, chỉ đọc sau khi thêm chỉ mục tìm kiếm và dấu hoàn tất. Lần đầu cần mạng, sau đó mở lại kho đã nạp không cần API. Nếu nạp lỗi chỉ được xóa bộ nhớ đệm tham chiếu có tên riêng, tuyệt đối không xóa `vocabflow.db`. Bản mirror lớn lưu bền trong App Storage; bản tải để kiểm tra đặt trong `/generated-artifacts/`, bị loại khỏi Git và gói triển khai.

Nguồn kho Skypedia công bố CC BY-SA 4.0, có ghi chú OVDP GPLv2; kho upstream MinhQND có LICENSE MIT nhưng README dẫn CC BY-SA. Giữ đầy đủ thông báo nguồn trong app; chưa coi quyền tái phân phối thương mại là đã được xác minh. Dữ liệu tham chiếu không chỉnh nội dung; chỉ thêm chỉ mục và dấu khởi tạo cục bộ. Tệp nguồn để phân phối vẫn giữ nguyên bytes. Sau khi kiểm kích thước/SHA-256 của bản tải nguyên gốc, bản sao riêng dùng cho `deserialize` được chuẩn hóa hai byte định dạng nhật ký WAL sang rollback để không đòi tệp WAL phụ trong bộ nhớ; không sửa hàng dữ liệu hay tệp nguồn.

Đóng app không xóa dữ liệu. Gỡ app/xóa dữ liệu ứng dụng (hoặc xóa dữ liệu Expo Go) có thể làm mất dữ liệu; chưa có sao lưu hoặc đồng bộ.

Kiểm tra SQL tự động chạy trên SQLite của Node với adapter mô phỏng cầu nối Expo. Không thay thế kiểm tra thực tế Android/Expo Go.
