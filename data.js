/*
 * ============================================================
 *  DỮ LIỆU TRÒ CHƠI — chỉ cần sửa file này
 * ============================================================
 *  - women:        tên 9 bạn nữ
 *  - questions:    9 câu hỏi { q: câu hỏi, a: đáp án }
 *  - punishments:  9 thử thách cho nam { text, rarity }
 *                  rarity: "common" | "rare" | "epic" | "legendary"
 *                  text nên viết sao cho đọc trơn trong câu:
 *                  "Bạn <nam> sẽ <text> cho bạn nữ <nữ>"
 *  - men:          danh sách 30 bạn nam
 *  - resultTemplate: câu hiển thị kết quả
 * ============================================================
 */
window.GAME_DATA = {
  companyName: "Công ty mình",

  women: [
    "Lan", "Hoa", "Mai", "Hương", "Thảo",
    "Linh", "Ngọc", "Trang", "Vy"
  ],

  questions: [
    {
      q: "Ngày 20/10 được chọn làm Ngày Phụ nữ Việt Nam để kỷ niệm sự kiện nào?",
      a: "Ngày thành lập Hội Liên hiệp Phụ nữ Việt Nam (20/10/1930), tiền thân là Hội Phụ nữ phản đế Việt Nam."
    },
    {
      q: "Câu nói “Tôi muốn cưỡi cơn gió mạnh, đạp luồng sóng dữ, chém cá kình ở Biển Đông…” là của ai?",
      a: "Bà Triệu (Triệu Thị Trinh)."
    },
    {
      q: "Ai là nữ tướng đầu tiên của Quân đội nhân dân Việt Nam?",
      a: "Bà Nguyễn Thị Định (thường gọi là “Bà Ba Định”)."
    },
    {
      q: "Nữ thi sĩ nào được mệnh danh là “Bà chúa thơ Nôm”?",
      a: "Hồ Xuân Hương."
    },
    {
      q: "Vị nữ hoàng duy nhất trong lịch sử phong kiến Việt Nam là ai?",
      a: "Lý Chiêu Hoàng."
    },
    {
      q: "Khởi nghĩa Hai Bà Trưng nổ ra vào năm nào?",
      a: "Năm 40 (sau Công nguyên)."
    },
    {
      q: "Ngày Quốc tế Phụ nữ là ngày nào?",
      a: "Ngày 8/3."
    },
    {
      q: "Bài hát “Bông hồng cài áo” là sáng tác của nhạc sĩ nào?",
      a: "Nhạc sĩ Phạm Thế Mỹ (phổ từ tùy bút của Thiền sư Thích Nhất Hạnh)."
    },
    {
      q: "Tám chữ vàng Bác Hồ tặng phụ nữ Việt Nam là gì?",
      a: "“Anh hùng – Bất khuất – Trung hậu – Đảm đang”."
    }
  ],

  punishments: [
    { text: "mua một ly trà sữa full topping",            rarity: "common" },
    { text: "pha cà phê buổi sáng suốt một tuần",          rarity: "common" },
    { text: "đấm lưng, bóp vai 5 phút",                   rarity: "common" },
    { text: "hát tặng một bài tình ca",                   rarity: "rare" },
    { text: "nhảy tặng một điệu TikTok",                  rarity: "rare" },
    { text: "làm trợ lý riêng xách đồ, rót nước cả ngày", rarity: "rare" },
    { text: "viết thiệp tay và đọc to lời chúc trước cả phòng", rarity: "epic" },
    { text: "tặng một bó hoa thật xinh",                  rarity: "epic" },
    { text: "khao một bữa trưa thật xịn",                 rarity: "legendary" }
  ],

  men: [
    "Minh", "Hùng", "Tuấn", "Dũng", "Nam", "Huy",
    "Khoa", "Long", "Phúc", "Quân", "Sơn", "Thắng",
    "Trung", "Việt", "Đức", "Hiếu", "Bảo", "Khánh",
    "Lâm", "Nghĩa", "Phong", "Tài", "Thành", "Toàn",
    "Vinh", "An", "Cường", "Đạt", "Hải", "Kiên"
  ],

  resultTemplate: "Bạn {man} sẽ {punishment} cho bạn nữ {woman}"
};
