export interface OfficeAppsCourseQuestion {
  term: string;
  prompt: string;
  choices: readonly string[];
}

export interface OfficeAppsCourseLesson {
  id: string;
  title: string;
  focus: string;
  topicId: string;
  topicTitle: string;
  questions: readonly OfficeAppsCourseQuestion[];
}

export interface OfficeAppsCourseEntry {
  definition: string;
  example: string;
  exampleTranslation: string;
  partOfSpeech: OfficeAppsPartOfSpeech;
}

export type OfficeAppsPartOfSpeech =
  | "Danh từ"
  | "Động từ"
  | "Tính từ"
  | "Cụm danh từ"
  | "Cụm động từ"
  | "Cụm giới từ";

type TermDefinition = readonly [term: string, definition: string];
type ExampleGroup = {
  example: string;
  exampleTranslation: string;
  terms: readonly TermDefinition[];
};
type Topic = {
  id: string;
  title: string;
  focus: string;
  groups: readonly ExampleGroup[];
};

export const OFFICE_APPS_COURSE_ID = "office-apps-vocabulary-v1";
export const OFFICE_APPS_COURSE_TITLE =
  "Tiếng Anh văn phòng: Excel, Word, PowerPoint";

const TOPICS: readonly Topic[] = [
  {
    id: "excel",
    title: "Microsoft Excel",
    focus: "Từ vựng bảng tính, công thức, định dạng và xử lý dữ liệu.",
    groups: [
      {
        example: "Create a workbook, add a worksheet, and organize figures in a spreadsheet.",
        exampleTranslation: "Tạo một sổ làm việc, thêm một trang tính và sắp xếp số liệu trong bảng tính.",
        terms: [
          ["spreadsheet", "bảng tính điện tử để sắp xếp và tính toán dữ liệu"],
          ["workbook", "tệp Excel có thể chứa nhiều trang tính"],
          ["worksheet", "trang tính gồm các hàng và cột trong một workbook"],
        ],
      },
      {
        example: "Select the active cell, check its cell reference, and highlight the cell range.",
        exampleTranslation: "Chọn ô hiện hoạt, kiểm tra địa chỉ ô và bôi chọn vùng ô.",
        terms: [
          ["active cell", "ô đang được chọn để nhập hoặc sửa dữ liệu"],
          ["cell reference", "địa chỉ xác định vị trí của một ô, như B2"],
          ["cell range", "vùng gồm một hoặc nhiều ô được chọn"],
        ],
      },
      {
        example: "Insert a row, adjust a column, and rename the sheet tab.",
        exampleTranslation: "Chèn một hàng, chỉnh độ rộng cột và đổi tên thẻ trang tính.",
        terms: [
          ["row", "hàng ô chạy ngang trong trang tính"],
          ["column", "cột ô chạy dọc trong trang tính"],
          ["sheet tab", "thẻ ở cuối cửa sổ dùng để chuyển trang tính"],
        ],
      },
      {
        example: "Use the ribbon to open the formula bar, then type B2 in the name box.",
        exampleTranslation: "Dùng dải lệnh để mở thanh công thức, rồi nhập B2 vào hộp tên.",
        terms: [
          ["ribbon", "dải lệnh chứa các thẻ và công cụ của Excel"],
          ["formula bar", "thanh hiển thị hoặc chỉnh nội dung của ô đang chọn"],
          ["name box", "hộp hiển thị địa chỉ ô hoặc tên vùng đang chọn"],
        ],
      },
      {
        example: "Show gridlines, freeze panes, and enter a formula.",
        exampleTranslation: "Hiện đường lưới, cố định khung và nhập một công thức.",
        terms: [
          ["gridlines", "đường lưới giúp nhìn rõ ranh giới các ô"],
          ["freeze panes", "cố định hàng hoặc cột để vẫn thấy khi cuộn"],
          ["formula", "biểu thức tính toán bắt đầu bằng dấu bằng"],
        ],
      },
      {
        example: "In a function, enter each argument and use the plus operator where needed.",
        exampleTranslation: "Trong một hàm, nhập từng đối số và dùng toán tử cộng khi cần.",
        terms: [
          ["function", "hàm có sẵn để thực hiện phép tính hoặc xử lý dữ liệu"],
          ["argument", "giá trị hoặc vùng dữ liệu được đưa vào hàm"],
          ["operator", "ký hiệu thực hiện phép tính hoặc phép so sánh"],
        ],
      },
      {
        example: "Use SUM, AVERAGE, or COUNT to summarize the selected values.",
        exampleTranslation: "Dùng SUM, AVERAGE hoặc COUNT để tổng hợp các giá trị đã chọn.",
        terms: [
          ["SUM", "hàm tính tổng các số"],
          ["AVERAGE", "hàm tính giá trị trung bình"],
          ["COUNT", "hàm đếm số ô chứa dữ liệu dạng số"],
        ],
      },
      {
        example: "An IF function can compare a relative reference with an absolute reference.",
        exampleTranslation: "Hàm IF có thể so sánh tham chiếu tương đối với tham chiếu tuyệt đối.",
        terms: [
          ["IF function", "hàm trả về kết quả tùy theo điều kiện đúng hay sai"],
          ["relative reference", "tham chiếu ô tự thay đổi khi sao chép công thức"],
          ["absolute reference", "tham chiếu ô được khóa, thường có dấu $"],
        ],
      },
      {
        example: "Use the fill handle to AutoFill a formula containing a mixed reference.",
        exampleTranslation: "Dùng nút kéo điền để tự điền công thức có tham chiếu hỗn hợp.",
        terms: [
          ["mixed reference", "tham chiếu khóa hàng hoặc cột nhưng không khóa cả hai"],
          ["fill handle", "nút kéo ở góc ô để sao chép hoặc điền dữ liệu"],
          ["AutoFill", "tính năng tự điền chuỗi hoặc công thức vào các ô"],
        ],
      },
      {
        example: "Create a named range, then choose a number format or currency format.",
        exampleTranslation: "Tạo một vùng có tên, rồi chọn định dạng số hoặc định dạng tiền tệ.",
        terms: [
          ["named range", "vùng ô được gán tên để dễ dùng trong công thức"],
          ["number format", "cách hiển thị số, ngày tháng hoặc giá trị trong ô"],
          ["currency format", "định dạng số tiền kèm ký hiệu tiền tệ"],
        ],
      },
      {
        example: "Set a percentage format, choose decimal places, and turn on text wrapping.",
        exampleTranslation: "Chọn định dạng phần trăm, đặt số chữ số thập phân và bật ngắt dòng trong ô.",
        terms: [
          ["percentage format", "định dạng hiển thị giá trị dưới dạng phần trăm"],
          ["decimal places", "số chữ số được hiển thị sau dấu thập phân"],
          ["text wrapping", "cách hiển thị nội dung dài thành nhiều dòng trong ô"],
        ],
      },
      {
        example: "Merge cells, adjust horizontal alignment, and increase the font size.",
        exampleTranslation: "Gộp các ô, chỉnh căn ngang và tăng cỡ chữ.",
        terms: [
          ["merge cells", "gộp nhiều ô liền kề thành một ô"],
          ["horizontal alignment", "cách căn nội dung sang trái, giữa hoặc phải"],
          ["font size", "kích thước chữ hiển thị trong ô"],
        ],
      },
      {
        example: "Set a fill color, choose a border style, and add conditional formatting.",
        exampleTranslation: "Chọn màu nền, kiểu đường viền và định dạng có điều kiện.",
        terms: [
          ["border style", "kiểu đường viền quanh ô hoặc vùng ô"],
          ["fill color", "màu nền bên trong ô"],
          ["conditional formatting", "định dạng tự đổi theo điều kiện của dữ liệu"],
        ],
      },
      {
        example: "Use data validation to create a drop-down list, then sort the options.",
        exampleTranslation: "Dùng xác thực dữ liệu để tạo danh sách thả xuống, rồi sắp xếp các lựa chọn.",
        terms: [
          ["data validation", "quy tắc giới hạn dữ liệu được nhập vào ô"],
          ["drop-down list", "danh sách lựa chọn mở ra khi bấm vào ô"],
          ["sort", "sắp xếp dữ liệu theo thứ tự hoặc tiêu chí"],
        ],
      },
      {
        example: "Filter the data, insert a row, and summarize results with a pivot table.",
        exampleTranslation: "Lọc dữ liệu, chèn một hàng và tổng hợp kết quả bằng bảng tổng hợp.",
        terms: [
          ["filter", "lọc để chỉ hiển thị các hàng thỏa điều kiện"],
          ["pivot table", "bảng tương tác dùng để nhóm và tổng hợp dữ liệu"],
          ["insert a row", "thêm một hàng mới vào trang tính"],
        ],
      },
      {
        example: "Add a chart, then label its chart axis and chart legend.",
        exampleTranslation: "Thêm biểu đồ, rồi ghi nhãn cho trục và chú giải biểu đồ.",
        terms: [
          ["chart", "biểu đồ thể hiện dữ liệu bằng hình ảnh"],
          ["chart axis", "trục ngang hoặc trục dọc trên biểu đồ"],
          ["chart legend", "chú giải cho biết màu hoặc ký hiệu đại diện cho dữ liệu nào"],
        ],
      },
      {
        example: "Import data, check the source data, and add a chart title.",
        exampleTranslation: "Nhập dữ liệu, kiểm tra dữ liệu nguồn và thêm tiêu đề biểu đồ.",
        terms: [
          ["chart title", "tiêu đề mô tả nội dung của biểu đồ"],
          ["source data", "dữ liệu gốc được dùng để tạo kết quả hoặc biểu đồ"],
          ["import data", "đưa dữ liệu từ tệp hoặc nguồn khác vào Excel"],
        ],
      },
      {
        example: "Export data to a CSV file before selecting Protect Sheet.",
        exampleTranslation: "Xuất dữ liệu thành tệp CSV trước khi chọn lệnh Protect Sheet.",
        terms: [
          ["export data", "đưa dữ liệu ra tệp hoặc định dạng khác"],
          ["CSV file", "tệp văn bản lưu dữ liệu theo hàng, các mục thường cách nhau bằng dấu phẩy"],
          ["protect sheet", "bảo vệ trang tính để hạn chế thay đổi ô hoặc cấu trúc"],
        ],
      },
      {
        example: "Unhide a hidden row or hidden column, then delete a column if needed.",
        exampleTranslation: "Hiện lại hàng hoặc cột đang ẩn, rồi xóa cột nếu cần.",
        terms: [
          ["hidden row", "hàng đã bị ẩn khỏi trang tính"],
          ["hidden column", "cột đã bị ẩn khỏi trang tính"],
          ["delete a column", "xóa một cột cùng dữ liệu trong cột đó"],
        ],
      },
      {
        example: "Undo the last change, redo it, and recalculate the workbook.",
        exampleTranslation: "Hoàn tác thay đổi gần nhất, làm lại thao tác đó và tính lại workbook.",
        terms: [
          ["recalculate", "tính lại công thức để cập nhật kết quả"],
          ["undo", "hoàn tác thao tác vừa thực hiện"],
          ["redo", "làm lại thao tác vừa được hoàn tác"],
        ],
      },
    ],
  },
  {
    id: "word",
    title: "Microsoft Word",
    focus: "Từ vựng soạn thảo, định dạng trang, rà soát và chia sẻ tài liệu.",
    groups: [
      {
        example: "Open the document, choose page layout, and set the page margin.",
        exampleTranslation: "Mở tài liệu, chọn bố trí trang và đặt lề trang.",
        terms: [
          ["document", "tài liệu được tạo và chỉnh sửa trong Word"],
          ["page layout", "cách sắp xếp nội dung và các thành phần trên trang"],
          ["page margin", "lề trống giữa nội dung và mép trang"],
        ],
      },
      {
        example: "Change page orientation for a section, then edit the header.",
        exampleTranslation: "Đổi hướng trang cho một phần, rồi chỉnh đầu trang.",
        terms: [
          ["page orientation", "hướng giấy dọc hoặc ngang"],
          ["section", "phần tài liệu có thể có thiết lập trang riêng"],
          ["header", "vùng nội dung lặp ở đầu các trang"],
        ],
      },
      {
        example: "Add a page number in the footer and format the opening paragraph.",
        exampleTranslation: "Thêm số trang ở chân trang và định dạng đoạn mở đầu.",
        terms: [
          ["footer", "vùng nội dung lặp ở cuối các trang"],
          ["page number", "số thứ tự hiển thị trên trang"],
          ["paragraph", "đoạn văn kết thúc khi người dùng xuống dòng bằng Enter"],
        ],
      },
      {
        example: "Adjust line spacing, a first-line indent, and a hanging indent.",
        exampleTranslation: "Chỉnh giãn dòng, thụt đầu dòng đầu tiên và thụt treo.",
        terms: [
          ["line spacing", "khoảng cách giữa các dòng văn bản"],
          ["first-line indent", "khoảng thụt chỉ áp dụng cho dòng đầu đoạn"],
          ["hanging indent", "kiểu thụt lề khiến dòng đầu nhô ra, các dòng sau thụt vào"],
        ],
      },
      {
        example: "Set a tab stop, add a page break, and insert a section break.",
        exampleTranslation: "Đặt điểm dừng tab, thêm ngắt trang và chèn ngắt phần.",
        terms: [
          ["tab stop", "vị trí con trỏ sẽ nhảy tới khi nhấn phím Tab"],
          ["page break", "ngắt trang để phần tiếp theo bắt đầu ở trang mới"],
          ["section break", "ngắt phần để áp dụng bố cục khác cho phần sau"],
        ],
      },
      {
        example: "Add a line break, increase character spacing, and make the title bold.",
        exampleTranslation: "Ngắt dòng, tăng khoảng cách ký tự và in đậm tiêu đề.",
        terms: [
          ["line break", "ngắt dòng mà không bắt đầu một đoạn mới"],
          ["character spacing", "khoảng cách giữa các ký tự"],
          ["bold", "định dạng chữ đậm để nhấn mạnh"],
        ],
      },
      {
        example: "Apply italic and underline, then use strikethrough for removed text.",
        exampleTranslation: "In nghiêng và gạch dưới, rồi gạch ngang phần văn bản đã bỏ.",
        terms: [
          ["italic", "định dạng chữ nghiêng"],
          ["underline", "định dạng có đường gạch dưới chữ"],
          ["strikethrough", "định dạng có đường kẻ ngang qua chữ"],
        ],
      },
      {
        example: "Set the font color and paragraph alignment, then apply text highlight.",
        exampleTranslation: "Chọn màu chữ và căn đoạn, rồi tô sáng văn bản.",
        terms: [
          ["text highlight", "màu nền đánh dấu một phần văn bản"],
          ["font color", "màu hiển thị của ký tự"],
          ["paragraph alignment", "cách căn đoạn sang trái, giữa, phải hoặc đều hai bên"],
        ],
      },
      {
        example: "Choose a bullet list, numbered list, or multilevel list for the outline.",
        exampleTranslation: "Chọn danh sách dấu đầu dòng, danh sách đánh số hoặc danh sách nhiều cấp cho dàn ý.",
        terms: [
          ["bullet list", "danh sách dùng ký hiệu ở đầu mỗi mục"],
          ["numbered list", "danh sách có số thứ tự ở đầu mỗi mục"],
          ["multilevel list", "danh sách có nhiều cấp thụt lề và đánh số"],
        ],
      },
      {
        example: "Apply a heading style and match it to the document theme.",
        exampleTranslation: "Áp dụng kiểu tiêu đề và đồng bộ với chủ đề tài liệu.",
        terms: [
          ["style", "tập hợp định dạng có sẵn cho văn bản"],
          ["heading", "tiêu đề dùng để chia cấu trúc tài liệu"],
          ["document theme", "bộ màu và phông chữ thống nhất cho tài liệu"],
        ],
      },
      {
        example: "Start from a document template, add a page border, and format text in columns.",
        exampleTranslation: "Bắt đầu từ mẫu tài liệu, thêm viền trang và chia văn bản thành cột.",
        terms: [
          ["document template", "tệp mẫu có sẵn bố cục và định dạng tài liệu"],
          ["page border", "đường viền bao quanh trang"],
          ["columns", "các cột dọc dùng để chia nội dung trang"],
        ],
      },
      {
        example: "Insert a table and generate a table of contents and index.",
        exampleTranslation: "Chèn bảng, rồi tạo mục lục và chỉ mục tra cứu.",
        terms: [
          ["table of contents", "mục lục liệt kê tiêu đề và số trang"],
          ["index", "chỉ mục tra cứu các thuật ngữ và vị trí xuất hiện"],
          ["table", "bảng gồm các hàng và cột trong tài liệu"],
        ],
      },
      {
        example: "Format a table row and table column, then apply cell shading.",
        exampleTranslation: "Định dạng hàng và cột của bảng, rồi tô nền ô.",
        terms: [
          ["table row", "hàng ngang gồm các ô trong bảng"],
          ["table column", "cột dọc gồm các ô trong bảng"],
          ["cell shading", "màu nền bên trong một hoặc nhiều ô của bảng"],
        ],
      },
      {
        example: "Set a table border, add a caption, and link to a source with a hyperlink.",
        exampleTranslation: "Đặt đường viền bảng, thêm chú thích và liên kết tới nguồn bằng siêu liên kết.",
        terms: [
          ["table border", "đường viền quanh hoặc bên trong bảng"],
          ["caption", "chú thích đặt cho hình, bảng hoặc đối tượng"],
          ["hyperlink", "liên kết mở trang web, tệp hoặc vị trí khác"],
        ],
      },
      {
        example: "Add a bookmark, cite it with a cross-reference, and insert a footnote.",
        exampleTranslation: "Đánh dấu một vị trí, dẫn chiếu tới đó và chèn chú thích cuối trang.",
        terms: [
          ["bookmark", "dấu lưu vị trí để quay lại nhanh trong tài liệu"],
          ["cross-reference", "dẫn chiếu tới tiêu đề, hình, bảng hoặc vị trí khác"],
          ["footnote", "ghi chú giải thích ở cuối trang"],
        ],
      },
      {
        example: "Use find and replace to update a term, then add an endnote.",
        exampleTranslation: "Dùng tìm và thay thế để cập nhật một từ, rồi thêm chú thích cuối tài liệu.",
        terms: [
          ["endnote", "ghi chú giải thích đặt ở cuối tài liệu hoặc chương"],
          ["find", "tìm từ hoặc cụm từ trong tài liệu"],
          ["replace", "thay từ hoặc cụm từ đã tìm bằng nội dung khác"],
        ],
      },
      {
        example: "Open the navigation pane, run spell check, and review grammar check suggestions.",
        exampleTranslation: "Mở ngăn dẫn hướng, kiểm tra chính tả và xem gợi ý ngữ pháp.",
        terms: [
          ["navigation pane", "ngăn dùng để tìm và chuyển nhanh giữa các phần"],
          ["spell check", "tính năng dò lỗi chính tả"],
          ["grammar check", "tính năng gợi ý sửa ngữ pháp"],
        ],
      },
      {
        example: "Check the word count, add a comment, and turn on track changes.",
        exampleTranslation: "Kiểm tra số từ, thêm nhận xét và bật theo dõi thay đổi.",
        terms: [
          ["word count", "tổng số từ trong tài liệu hoặc phần được chọn"],
          ["comment", "nhận xét gắn với một đoạn hoặc vị trí trong tài liệu"],
          ["track changes", "chế độ ghi lại các chỉnh sửa của người dùng"],
        ],
      },
      {
        example: "Review revision markup, accept changes you need, and reject changes you do not.",
        exampleTranslation: "Xem dấu sửa đổi, chấp nhận thay đổi cần giữ và từ chối thay đổi không dùng.",
        terms: [
          ["revision markup", "ký hiệu hiển thị nội dung đã thêm, xóa hoặc sửa"],
          ["accept changes", "chấp nhận các chỉnh sửa đang được theo dõi"],
          ["reject changes", "từ chối chỉnh sửa và khôi phục nội dung trước đó"],
        ],
      },
      {
        example: "Use mail merge with a recipient list to create each label.",
        exampleTranslation: "Dùng trộn thư với danh sách người nhận để tạo từng nhãn.",
        terms: [
          ["mail merge", "trộn mẫu tài liệu với dữ liệu để tạo nhiều bản riêng"],
          ["recipient list", "danh sách người nhận dùng trong trộn thư"],
          ["label", "nhãn địa chỉ hoặc nhãn thông tin được dàn trang để in"],
        ],
      },
    ],
  },
  {
    id: "powerpoint",
    title: "Microsoft PowerPoint",
    focus: "Từ vựng tạo trang chiếu, trình bày, hoạt ảnh và xuất bài thuyết trình.",
    groups: [
      {
        example: "Create a presentation, add a slide, and save the slide deck.",
        exampleTranslation: "Tạo một bài thuyết trình, thêm trang chiếu và lưu bộ trang chiếu.",
        terms: [
          ["presentation", "bài thuyết trình gồm các trang chiếu"],
          ["slide", "trang chiếu riêng lẻ trong bài thuyết trình"],
          ["slide deck", "toàn bộ bộ trang chiếu của một bài thuyết trình"],
        ],
      },
      {
        example: "Choose a presentation template, apply a slide theme, and select a slide layout.",
        exampleTranslation: "Chọn mẫu bài thuyết trình, áp dụng chủ đề trang chiếu và chọn bố cục.",
        terms: [
          ["slide layout", "cách sắp xếp các vùng nội dung trên một trang chiếu"],
          ["slide theme", "bộ màu, phông và hiệu ứng thống nhất cho trang chiếu"],
          ["presentation template", "tệp mẫu có sẵn thiết kế cho bài thuyết trình"],
        ],
      },
      {
        example: "Add a title slide, create a slide section, and fill a content placeholder.",
        exampleTranslation: "Thêm trang tiêu đề, tạo một phần trang chiếu và điền vùng giữ chỗ nội dung.",
        terms: [
          ["title slide", "trang chiếu mở đầu thường có tên bài và người trình bày"],
          ["slide section", "nhóm trang chiếu được gom theo một phần"],
          ["content placeholder", "vùng giữ chỗ để nhập văn bản hoặc chèn nội dung"],
        ],
      },
      {
        example: "Insert a text box and shape, then arrange each slide object.",
        exampleTranslation: "Chèn hộp văn bản và hình khối, rồi sắp xếp từng đối tượng trên trang chiếu.",
        terms: [
          ["text box", "hộp dùng để nhập và đặt văn bản tự do"],
          ["shape", "hình khối như mũi tên, hình tròn hoặc hình chữ nhật"],
          ["slide object", "thành phần có thể chọn và chỉnh sửa trên trang chiếu"],
        ],
      },
      {
        example: "Insert a picture, presentation chart, and slide table.",
        exampleTranslation: "Chèn ảnh, biểu đồ thuyết trình và bảng trên trang chiếu.",
        terms: [
          ["picture", "ảnh được chèn vào trang chiếu"],
          ["presentation chart", "biểu đồ dùng để trình bày dữ liệu trên trang chiếu"],
          ["slide table", "bảng gồm hàng và cột được chèn vào trang chiếu"],
        ],
      },
      {
        example: "Add a SmartArt graphic, write speaker notes, and print the notes page.",
        exampleTranslation: "Thêm đồ họa SmartArt, viết ghi chú người thuyết trình và in trang ghi chú.",
        terms: [
          ["SmartArt graphic", "sơ đồ trực quan dùng để trình bày quy trình hoặc quan hệ"],
          ["speaker notes", "ghi chú riêng hỗ trợ người thuyết trình"],
          ["notes page", "trang in gồm một trang chiếu và phần ghi chú"],
        ],
      },
      {
        example: "Use the slide master to edit a master layout and set theme colors.",
        exampleTranslation: "Dùng trang chiếu cái để chỉnh bố cục cái và đặt màu chủ đề.",
        terms: [
          ["slide master", "trang chiếu điều khiển thiết kế chung của bài thuyết trình"],
          ["master layout", "bố cục mẫu được quản lý bởi slide master"],
          ["theme colors", "bảng màu được dùng thống nhất trong chủ đề"],
        ],
      },
      {
        example: "Choose widescreen format for the slide size, then choose Duplicate Slide.",
        exampleTranslation: "Đặt kích thước trang chiếu dạng màn hình rộng, rồi nhân đôi trang chiếu.",
        terms: [
          ["slide size", "kích thước và tỷ lệ khung hình của trang chiếu"],
          ["widescreen format", "tỷ lệ trang chiếu rộng thường dùng cho màn hình hiện đại"],
          ["duplicate slide", "tạo bản sao của trang chiếu đang chọn"],
        ],
      },
      {
        example: "Change the slide order, group objects, and ungroup objects to edit them.",
        exampleTranslation: "Đổi thứ tự trang chiếu, nhóm đối tượng rồi bỏ nhóm để chỉnh sửa.",
        terms: [
          ["slide order", "thứ tự các trang chiếu trong bài thuyết trình"],
          ["group objects", "gom nhiều đối tượng để di chuyển hoặc định dạng cùng nhau"],
          ["ungroup objects", "tách nhóm để chỉnh từng đối tượng riêng"],
        ],
      },
      {
        example: "Align objects, distribute objects evenly, and crop the picture.",
        exampleTranslation: "Căn các đối tượng, phân bố đều chúng và cắt ảnh.",
        terms: [
          ["align objects", "căn các đối tượng theo cạnh hoặc tâm"],
          ["distribute objects", "chia đều khoảng cách giữa các đối tượng"],
          ["crop", "cắt bỏ phần rìa không cần thiết của ảnh"],
        ],
      },
      {
        example: "Compress pictures, add a slide transition, and apply an animation.",
        exampleTranslation: "Nén ảnh, thêm hiệu ứng chuyển trang và áp dụng hoạt ảnh.",
        terms: [
          ["compress pictures", "giảm dung lượng ảnh trong bài thuyết trình"],
          ["slide transition", "hiệu ứng khi chuyển từ trang chiếu này sang trang khác"],
          ["animation", "hiệu ứng chuyển động áp dụng cho đối tượng trên trang chiếu"],
        ],
      },
      {
        example: "Use an entrance effect, an emphasis effect, and an exit effect.",
        exampleTranslation: "Dùng hiệu ứng xuất hiện, hiệu ứng nhấn mạnh và hiệu ứng biến mất.",
        terms: [
          ["entrance effect", "hoạt ảnh làm đối tượng xuất hiện"],
          ["exit effect", "hoạt ảnh làm đối tượng biến mất"],
          ["emphasis effect", "hoạt ảnh làm nổi bật đối tượng đang hiển thị"],
        ],
      },
      {
        example: "Set animation timing and duration for a shape's motion path.",
        exampleTranslation: "Đặt thời điểm và thời lượng hoạt ảnh cho đường di chuyển của hình khối.",
        terms: [
          ["motion path", "đường đi mà đối tượng chuyển động theo"],
          ["animation timing", "thiết lập thời điểm bắt đầu và trình tự hoạt ảnh"],
          ["duration", "thời lượng để hiệu ứng hoàn tất"],
        ],
      },
      {
        example: "Set a delay, choose a trigger, and start on click.",
        exampleTranslation: "Đặt độ trễ, chọn điều kiện kích hoạt và bắt đầu khi bấm chuột.",
        terms: [
          ["delay", "thời gian chờ trước khi hiệu ứng bắt đầu"],
          ["trigger", "điều kiện hoặc thao tác làm hoạt ảnh bắt đầu"],
          ["start on click", "tùy chọn bắt đầu hiệu ứng khi người trình bày bấm"],
        ],
      },
      {
        example: "Play the next effect after previous or with previous during the slideshow.",
        exampleTranslation: "Chạy hiệu ứng tiếp theo sau hiệu ứng trước hoặc cùng lúc trong khi trình chiếu.",
        terms: [
          ["after previous", "tùy chọn chạy hiệu ứng sau khi hiệu ứng trước kết thúc"],
          ["with previous", "tùy chọn chạy hiệu ứng đồng thời với hiệu ứng trước"],
          ["slideshow", "chế độ trình chiếu lần lượt các trang chiếu"],
        ],
      },
      {
        example: "Open presenter view, rehearse timings, and record narration.",
        exampleTranslation: "Mở chế độ người thuyết trình, tập thời gian và ghi lời thuyết minh.",
        terms: [
          ["presenter view", "chế độ hiển thị ghi chú và điều khiển cho người trình bày"],
          ["rehearse timings", "tập và ghi thời lượng cho từng trang chiếu"],
          ["record narration", "ghi âm lời thuyết minh đi kèm bài thuyết trình"],
        ],
      },
      {
        example: "Add closed captions, print a handout, and review outline view.",
        exampleTranslation: "Thêm phụ đề, in bản phát tay và xem dạng dàn ý.",
        terms: [
          ["closed captions", "phụ đề hiển thị lời nói hoặc âm thanh trong video"],
          ["handout", "bản in gồm các trang chiếu phát cho người tham dự"],
          ["outline view", "chế độ xem nội dung văn bản theo dạng dàn ý"],
        ],
      },
      {
        example: "Use reading view, choose Hide Slide, or switch to kiosk mode.",
        exampleTranslation: "Dùng chế độ đọc, ẩn một trang chiếu hoặc chuyển sang chế độ ki-ốt.",
        terms: [
          ["reading view", "chế độ xem bài thuyết trình trong cửa sổ ứng dụng"],
          ["hide slide", "ẩn trang chiếu để không phát trong trình chiếu"],
          ["kiosk mode", "chế độ trình chiếu tự chạy hoặc điều khiển giới hạn"],
        ],
      },
      {
        example: "Embed video and embed audio, then set the slideshow to loop continuously.",
        exampleTranslation: "Nhúng video và âm thanh, rồi đặt trình chiếu lặp liên tục.",
        terms: [
          ["loop continuously", "tùy chọn phát lại bài trình chiếu từ đầu sau khi kết thúc"],
          ["embed video", "nhúng video vào tệp bài thuyết trình"],
          ["embed audio", "nhúng âm thanh vào tệp bài thuyết trình"],
        ],
      },
      {
        example: "Add a slide hyperlink, export as video, or export as PDF.",
        exampleTranslation: "Thêm siêu liên kết trên trang chiếu, xuất thành video hoặc xuất thành PDF.",
        terms: [
          ["slide hyperlink", "liên kết trên trang chiếu mở trang, tệp hoặc vị trí khác"],
          ["export as video", "xuất bài thuyết trình thành tệp video"],
          ["export as PDF", "xuất bài thuyết trình thành tệp PDF"],
        ],
      },
    ],
  },
];

const allTerms = TOPICS.flatMap((topic) =>
  topic.groups.flatMap((group) => group.terms.map(([term]) => term)),
);

// Classify Office terms by their grammatical role in the example sentence;
// multiword terms are labeled by phrase function rather than by their headword alone.
const OFFICE_TERM_PARTS: readonly {
  partOfSpeech: OfficeAppsPartOfSpeech;
  terms: string;
}[] = [
  {
    partOfSpeech: "Danh từ",
    terms: `spreadsheet|workbook|worksheet|row|column|ribbon|gridlines|formula|function|argument|operator|SUM|AVERAGE|COUNT|chart|document|section|header|footer|paragraph|italic|underline|strikethrough|style|heading|columns|index|table|caption|hyperlink|bookmark|cross-reference|footnote|endnote|find|replace|comment|label|presentation|slide|shape|picture|animation|duration|delay|trigger|slideshow|handout`,
  },
  {
    partOfSpeech: "Động từ",
    terms: `AutoFill|sort|filter|undo|redo|recalculate|crop`,
  },
  {
    partOfSpeech: "Tính từ",
    terms: `bold`,
  },
  {
    partOfSpeech: "Cụm danh từ",
    terms: `active cell|cell reference|cell range|sheet tab|formula bar|name box|IF function|relative reference|absolute reference|mixed reference|fill handle|named range|number format|currency format|percentage format|decimal places|text wrapping|horizontal alignment|font size|fill color|border style|conditional formatting|data validation|drop-down list|pivot table|chart axis|chart legend|source data|chart title|CSV file|protect sheet|hidden row|hidden column|page layout|page margin|page orientation|page number|line spacing|first-line indent|hanging indent|tab stop|page break|section break|line break|character spacing|text highlight|font color|paragraph alignment|bullet list|numbered list|multilevel list|document theme|document template|page border|table of contents|table row|table column|cell shading|table border|navigation pane|spell check|grammar check|word count|track changes|revision markup|mail merge|recipient list|slide deck|slide layout|slide theme|presentation template|title slide|slide section|content placeholder|text box|slide object|presentation chart|slide table|SmartArt graphic|speaker notes|notes page|slide master|master layout|theme colors|slide size|widescreen format|duplicate slide|slide order|slide transition|entrance effect|emphasis effect|exit effect|motion path|animation timing|presenter view|closed captions|outline view|reading view|hide slide|kiosk mode|slide hyperlink`,
  },
  {
    partOfSpeech: "Cụm động từ",
    terms: `freeze panes|merge cells|insert a row|import data|export data|delete a column|accept changes|reject changes|group objects|ungroup objects|align objects|distribute objects|compress pictures|start on click|rehearse timings|record narration|loop continuously|embed video|embed audio|export as video|export as PDF`,
  },
  {
    partOfSpeech: "Cụm giới từ",
    terms: `after previous|with previous`,
  },
];
const officePartOfSpeechByTerm: Record<string, OfficeAppsPartOfSpeech> = {};
for (const group of OFFICE_TERM_PARTS) {
  for (const term of group.terms.split("|")) {
    if (officePartOfSpeechByTerm[term]) {
      throw new Error(`Từ có nhiều nhãn từ loại trong khóa học: ${term}`);
    }
    officePartOfSpeechByTerm[term] = group.partOfSpeech;
  }
}
const courseTermSet = new Set(allTerms);
const unclassifiedOfficeTerms = allTerms.filter(
  (term) => !officePartOfSpeechByTerm[term],
);
const unknownOfficePartTerms = Object.keys(officePartOfSpeechByTerm).filter(
  (term) => !courseTermSet.has(term),
);
if (unclassifiedOfficeTerms.length || unknownOfficePartTerms.length) {
  throw new Error(
    `Phân loại từ loại Office chưa khớp: thiếu ${unclassifiedOfficeTerms.join(", ") || "không có"}; thừa ${unknownOfficePartTerms.join(", ") || "không có"}.`,
  );
}

export const OFFICE_APPS_COURSE_WORD_COUNT = allTerms.length;
export const OFFICE_APPS_COURSE_TOPIC_COUNT = TOPICS.length;

const entries: Record<string, OfficeAppsCourseEntry> = {};
for (const topic of TOPICS) {
  for (const group of topic.groups) {
    for (const [term, definition] of group.terms) {
      if (entries[term]) {
        throw new Error(`Từ bị lặp trong khóa học: ${term}`);
      }
      entries[term] = {
        definition,
        example: group.example,
        exampleTranslation: group.exampleTranslation,
        partOfSpeech: officePartOfSpeechByTerm[term],
      };
    }
  }
}

export const OFFICE_APPS_COURSE_ENTRIES: Readonly<
  Record<string, OfficeAppsCourseEntry>
> = entries;

export const OFFICE_APPS_COURSE_TOPICS = TOPICS.map((topic) => ({
  id: topic.id,
  title: topic.title,
  terms: topic.groups.flatMap((group) => group.terms.map(([term]) => term)),
}));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankTerm(example: string, term: string): string {
  return example.replace(
    new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"),
    "_____",
  );
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function choicesFor(term: string, topicTerms: readonly string[]): string[] {
  const pool = topicTerms.filter((candidate) => candidate !== term);
  const start = stableHash(term) % pool.length;
  const choices = [term];
  for (let offset = 0; offset < pool.length && choices.length < 4; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  return choices;
}

function buildLessons(): OfficeAppsCourseLesson[] {
  const lessons: OfficeAppsCourseLesson[] = [];
  for (const topic of TOPICS) {
    const topicTerms = topic.groups.flatMap((group) =>
      group.terms.map(([term]) => term),
    );
    const lessonSize = 12;
    for (let offset = 0; offset < topicTerms.length; offset += lessonSize) {
      const terms = topicTerms.slice(offset, offset + lessonSize);
      const lessonNumber = Math.floor(offset / lessonSize) + 1;
      lessons.push({
        id: `${OFFICE_APPS_COURSE_ID}-${topic.id}-lesson-${lessonNumber}`,
        title: `${topic.title} · Bài ${lessonNumber}`,
        focus: topic.focus,
        topicId: topic.id,
        topicTitle: topic.title,
        questions: terms.map((term) => {
          const entry = OFFICE_APPS_COURSE_ENTRIES[term];
          return {
            term,
            prompt: blankTerm(entry.example, term),
            choices: choicesFor(term, topicTerms),
          };
        }),
      });
    }
  }
  return lessons;
}

export const OFFICE_APPS_COURSE_LESSONS = buildLessons();
