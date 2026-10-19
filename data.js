/*
 * ============================================================
 *  DỮ LIỆU TRÒ CHƠI — chỉ cần sửa file này
 * ============================================================
 *  - women:        tên 9 bạn nữ
 *  - questions:    câu hỏi cho các bạn nữ (mỗi lượt lấy ngẫu nhiên 1 câu
 *                  chưa dùng), mỗi câu 2 đáp án (thứ tự A/B tự xáo):
 *                  { q: câu hỏi, correct: đáp án đúng, wrong: đáp án sai,
 *                    note: giải thích thêm (tuỳ chọn) }
 *  - punishments:  9 thử thách cho nam { text, rarity }
 *                  rarity: "common" | "rare" | "epic" | "legendary"
 *                  text nên viết sao cho đọc trơn trong câu:
 *                  "Bạn <nam> sẽ <text> cho bạn nữ <nữ>"
 *                  Thêm `for: "Tên bạn nữ"` để giữ thử thách đó cho riêng bạn ấy:
 *                  gacha vẫn quay nhưng luôn dừng ở thử thách này, và người
 *                  khác sẽ không quay trúng.
 *                  Thêm `repeat: true` nếu thử thách được phép ra nhiều lần
 *                  (mặc định mỗi thử thách chỉ ra 1 lần).
 *                  Thêm `men: ["Tên nam"]` để gacha luôn dừng ở (các) bạn nam đó
 *                  khi ra thử thách này.
 *  - men:          danh sách 30 bạn nam
 *  - victimsByRarity: số bạn nam phải chịu phạt theo độ hiếm
 *                  (muốn riêng 1 thử thách khác số này thì thêm `victims: 4`
 *                   vào thử thách đó)
 *  - resultTemplate:     câu kết quả khi 1 người chịu phạt
 *  - resultTemplateMany: câu kết quả khi nhiều người chịu phạt
 *  - rescue:       VÒNG GIẢI CỨU cho các bạn nam chưa bị gọi tên
 *                  (mở ra khi cả 9 bạn nữ đã chơi xong)
 *                  · pushups:  số cái hít đất khi thua
 *                  · questions: câu đố tự luận { q, answer, note } — không có
 *                    đáp án chọn sẵn. Bấm "Xem đáp án" thì lật
 *                    đáp án + giải thích (note, xuống dòng bằng \n), rồi MC
 *                    chấm đúng / sai. Nhiều câu thì mỗi lần chơi lấy ngẫu nhiên 1.
 *                    (Vẫn hỗ trợ kiểu cũ có `options` 4 đáp án "không thể đúng".)
 *                  Thêm (tuỳ chọn):
 *                    code: đoạn code hiện thành khối riêng, tô màu cú pháp
 *                          (xuống dòng bằng \n)
 *                    correct: ["A", "B"] (mảng, bỏ `wrong`) → mọi đáp án đều đúng,
 *                          giữ nguyên thứ tự A/B
 *                    for:  tên bạn nữ được giữ sẵn câu này (VD "chị Thu (Tea lady)");
 *                          người khác sẽ không bị random trúng câu này
 *                  Trong q / correct / wrong / note, bọc chữ trong `dấu huyền`
 *                  để hiện thành code, VD: "Dùng `let` thay cho `var`".
 *  - en:           bản tiếng Anh (tuỳ chọn) — đặt trong từng câu hỏi / thử thách,
 *                  chỉ cần ghi các trường muốn dịch, ví dụ:
 *                  { q: "…", correct: "…", wrong: "…", en: { q: "…", correct: "…", wrong: "…" } }
 *                  { text: "…", rarity: "rare", en: { text: "…" } }
 *                  Thiếu `en` thì chế độ English hiện bản tiếng Việt.
 *                  Chữ giao diện (nút, tiêu đề…) nằm ở i18n.js.
 * ============================================================
 */
window.GAME_DATA = {
  companyName: "mgm",

  women: [
    "Tiên", "Bích Thư", "Linh Thư", "Trang", "Duyên",
    "Như", "Hằng", "chị Thu (Tea lady)", "chị Trang (Tea lady)"
  ],

  questions: [
    {
      for: "chị Thu (Tea lady)",
      q: "Nữ thi sĩ nào được mệnh danh là “Bà chúa thơ Nôm”?",
      correct: "Hồ Xuân Hương",
      wrong: "Đoàn Thị Điểm",
      en: {"q": "Which poet is known as the “Queen of Nôm poetry”?", "correct": "Hồ Xuân Hương", "wrong": "Đoàn Thị Điểm"}
    },
    {
      for: "chị Trang (Tea lady)",
      q: "Ngày Quốc tế Phụ nữ là ngày nào?",
      correct: "Ngày 8/3",
      wrong: "Ngày 1/6",
      note: "1/6 là Ngày Quốc tế Thiếu nhi.",
      en: {"q": "When is International Women's Day?", "correct": "March 8", "wrong": "June 1", "note": "June 1 is International Children's Day."}
    },

    // ---------- Câu hỏi IT ----------
    {
      q: "Phím tắt Ctrl + Z dùng để làm gì?",
      correct: "Hoàn tác (Undo)",
      wrong: "Lưu file (Save)",
      en: {"q": "What does the Ctrl + Z shortcut do?", "correct": "Undo", "wrong": "Save file"}
    },
    {
      q: "1 byte bằng bao nhiêu bit?",
      correct: "8 bit",
      wrong: "10 bit",
      en: {"q": "How many bits are in 1 byte?", "correct": "8 bits", "wrong": "10 bits"}
    },
    {
      q: "Khi vào web gặp lỗi “404”, nghĩa là gì?",
      correct: "Không tìm thấy trang",
      wrong: "Máy chủ đang quá tải",
      note: "Máy chủ quá tải thường là lỗi 503.",
      en: {"q": "What does a “404” error on a website mean?", "correct": "Page not found", "wrong": "Server overloaded", "note": "An overloaded server usually returns 503."}
    },

    // ---------- Frontend / JavaScript ----------
    {
      q: "Đoạn code JavaScript sau in ra gì?",
      code: "for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}",
      correct: "`3 3 3`",
      wrong: "`0 1 2`",
      note: "`var` dùng chung 1 biến cho cả vòng lặp. Đổi sang `let` sẽ in ra `0 1 2`.",
      en: { q: "What does this JavaScript code print?", note: "`var` shares one variable across the whole loop. Switch to `let` and it prints `0 1 2`." }
    },
    {
      q: "Trong JavaScript, biểu thức sau trả về gì?",
      code: "typeof NaN",
      correct: "`\"number\"`",
      wrong: "`\"undefined\"`",
      note: "`NaN` (Not a Number) lại có kiểu là `number` 🙂",
      en: { q: "In JavaScript, what does this expression return?", note: "`NaN` (Not a Number) is actually of type `number` 🙂" }
    },
    {
      q: "Trong JavaScript, biểu thức sau bằng bao nhiêu?",
      code: "\"5\" + 3",
      correct: "`\"53\"`",
      wrong: "`8`",
      note: "Dấu `+` gặp chuỗi sẽ nối chuỗi. Còn `\"5\" - 3` thì lại ra `2`.",
      en: { q: "In JavaScript, what does this expression evaluate to?", note: "`+` with a string concatenates. But `\"5\" - 3` gives `2`." }
    },
    {
      q: "Trong JavaScript, biểu thức sau trả về gì?",
      code: "typeof []",
      correct: "`\"object\"`",
      wrong: "`\"array\"`",
      note: "Mảng cũng là object. Muốn kiểm tra mảng thì dùng `Array.isArray()`.",
      en: { q: "In JavaScript, what does this expression return?", note: "Arrays are objects too. Use `Array.isArray()` to check for an array." }
    },
    {
      q: "Method nào thêm phần tử vào CUỐI mảng?",
      code: "const arr = [1, 2];\narr.???(3); // → [1, 2, 3]",
      correct: "`push()`",
      wrong: "`unshift()`",
      note: "`unshift()` thêm vào ĐẦU mảng.",
      en: { q: "Which method adds an element to the END of an array?", note: "`unshift()` adds to the START." }
    },

    // ---------- Backend ----------
    {
      q: "Trong ACID của database, chữ “I” là viết tắt của gì?",
      correct: "Isolation",
      wrong: "Integrity",
      note: "Atomicity – Consistency – Isolation – Durability.",
      en: {"q": "In database ACID, what does the “I” stand for?", "correct": "Isolation", "wrong": "Integrity", "note": "Atomicity – Consistency – Isolation – Durability."}
    },

    // ---------- Câu riêng cho Trang (2 đáp án đều đúng) ----------
    {
      for: "Trang",
      q: "Fun Wednesday ngày mai, cả office sẽ ăn gì?",
      correct: ["Ăn trái cây", "Ăn gì cũng được"],
      note: "Chọn gì cũng đúng! Cảm ơn Trang – back office của HCM – đã luôn chăm lo cho mọi hoạt động của office 💐",
      en: {
        q: "Fun Wednesday is tomorrow. What will the whole office eat?",
        correct: ["Fruit", "Anything is fine"],
        note: "Every answer is correct! Thank you, Trang, our HCM back office, for always taking care of everything in the office 💐"
      }
    },

    // ---------- Câu riêng cho Linh Thư (QC tester) ----------
    {
      for: "Linh Thư",
      q: "Khi thực hiện E2E testing với Cypress, thời gian chờ mặc định của `cy.get()` trước khi báo lỗi là bao lâu?",
      correct: "4 giây",
      wrong: "10 giây",
      note: "Mặc định `defaultCommandTimeout` của Cypress là `4000` ms. Muốn chờ lâu hơn thì truyền `{ timeout: 10000 }` vào `cy.get()`.",
      en: {
        q: "In Cypress E2E testing, how long does `cy.get()` wait by default before failing?",
        correct: "4 seconds",
        wrong: "10 seconds",
        note: "Cypress's default `defaultCommandTimeout` is `4000` ms. To wait longer, pass `{ timeout: 10000 }` to `cy.get()`."
      }
    }
  ],

  punishments: [
    { text: "mua một ly trà sữa full topping",                                        rarity: "common", repeat: true, en: { text: "buy a bubble tea with all the toppings" } },
    { text: "viết thiệp tay chúc mừng",                                              rarity: "common", en: { text: "write a handmade greeting card" } },
    { text: "tặng 1 món quà nhỏ dễ thương (tự suy nghĩ)",                             rarity: "common", for: "chị Thu (Tea lady)", en: { text: "give a cute little gift (your own idea)" } },
    { text: "tặng một bó hoa thật xinh",                                              rarity: "rare", for: "chị Trang (Tea lady)", en: { text: "give a lovely bouquet of flowers" } },
    { text: "mời một bữa trưa thật xịn",                                              rarity: "rare", en: { text: "buy a fancy lunch" } },
    { text: "quay một video chúc mừng tập thể, đăng lên group F&B",                   rarity: "epic", en: { text: "film a group greeting video and post it in the F&B group" } },
    { text: "tặng 1 cái bánh giò",                                                   rarity: "common", men: ["Trình"], en: { text: "give a bánh giò (Vietnamese pyramid rice dumpling)" } }
  ],

  men: [
    // tầng 3
    "Đạt", "Tín", "Lực", "Dũng TMT", "Nhựt", "Toàn", "Hồ", "Bảo", "Định",
    // tầng 4
    "Tú", "Sơn Nguyễn", "Trình", "Hiếu", "Cường", "Quốc", "Thắng", "Linh", "Tuấn Lê", "Nam", "Tuấn Nguyễn", "Việt", "Giang", "Khoa", "Nhân",
    // tầng 5
    "Lịch", "Văn", "Matthew", "Sơn Trần", "Dũng Audi", "Huy", "Nhật"
  ],

  victimsByRarity: {
    common: 1,
    rare: 3,
    epic: 5,
  },

  resultTemplate: "Bạn {man} sẽ {punishment} cho bạn {woman}",
  resultTemplateMany: "Các bạn {man} sẽ cùng nhau {punishment} cho bạn {woman}",

  // Bản tiếng Anh của 2 câu kết quả ở trên
  en: {
    resultTemplate: "{man} will {punishment} for {woman}",
    resultTemplateMany: "{man} will team up to {punishment} for {woman}"
  },

  rescue: {
    pushups: 5,
    questions: [
      {
        q: "Trong một gia đình, mỗi người con trai có số chị em gái bằng số anh em trai. Còn mỗi người con gái thì có số anh em trai gấp đôi số chị em gái. Hỏi nhà đó có mấy con trai, mấy con gái?",
        answer: "4 con trai và 3 con gái",
        note: "Nhìn từ một bạn trai: bạn ấy thấy 3 anh em trai khác (trừ mình ra) và 3 chị em gái. Bằng nhau, đúng.\nNhìn từ một bạn gái: bạn ấy thấy 4 anh em trai và 2 chị em gái khác (trừ mình ra). 4 gấp đôi 2, đúng.\nMẹo khó của câu này là phải nhớ trừ chính mình ra khi đếm, anh em hay quên chỗ này nên tính mãi không ra.",
        en: {
          q: "In a family, each son has as many sisters as brothers. Each daughter has twice as many brothers as sisters. How many sons and daughters are there?",
          answer: "4 sons and 3 daughters",
          note: "From a son's view: he sees 3 other brothers (not counting himself) and 3 sisters. Equal, correct.\nFrom a daughter's view: she sees 4 brothers and 2 other sisters (not counting herself). 4 is twice 2, correct.\nThe trick is remembering to leave yourself out when counting. That's exactly where the guys get stuck."
        }
      }
      // {
      //   q: "Một người đàn ông sống ở tầng 10 của chung cư. Sáng nào ông cũng đi thang máy xuống tầng 1 để đi làm. Chiều về, ông đi thang máy lên tầng 7 rồi leo bộ lên tầng 10. Nhưng những hôm trời mưa thì ông lại đi thang máy thẳng lên tầng 10. Tại sao?",
      //   answer: "Ông ấy thấp, chỉ với tới nút tầng 7 trong thang máy",
      //   note: "Những hôm trời mưa, ông mang theo cây dù nên dùng dù để bấm được nút tầng 10.\nAnh em hay đoán kiểu tập thể dục, thang máy hỏng, né hàng xóm... mà quên mất chi tiết quan trọng nhất là cây dù.\nGợi ý nếu bí quá: trời mưa thì ông mang theo cái gì?",
      //   en: {
      //     q: "A man lives on the 10th floor of an apartment building. Every morning he takes the elevator down to the 1st floor to go to work. In the evening, he takes the elevator up to the 7th floor and then walks up the stairs to the 10th. But on rainy days, he takes the elevator straight to the 10th floor. Why?",
      //     answer: "He is short and can only reach the 7th floor button",
      //     note: "On rainy days he carries an umbrella, so he uses it to press the 10th floor button.\nThe guys usually guess exercise, a broken elevator, or avoiding neighbors, and miss the key detail: the umbrella.\nHint if they get stuck: what does he carry on rainy days?"
      //   }
      // }
    ]
  },

  /*
   * MEME / GIF (tuỳ chọn)
   *  - Bỏ file .gif/.webp/.png vào thư mục memes/ rồi ghi đường dẫn vào đây,
   *    hoặc dán link ảnh GIF trực tiếp (Giphy/Tenor: chuột phải → Copy image address).
   *  - Mỗi lần hiện sẽ lấy ngẫu nhiên. Danh sách rỗng → dùng hoạt hoạ có sẵn.
   *  - cry:    hiện cho từng anh bị phạt ở popup kết quả
   *  - bonus:  hiện kèm hiệu ứng ×2 ×3 ×5
   *  - rescue: hiện ở màn hít đất của vòng giải cứu
   */
  memes: {
    cry: [
      // "memes/cry-1.gif",
    ],
    bonus: [
      // "memes/bonus-1.gif",
    ],
    rescue: [
      // "memes/pushup-1.gif",
    ]
  }
};
