# Thư mục meme

Bỏ file `.gif` / `.webp` / `.png` / `.jpg` vào đây, rồi khai báo trong `data.js` → `memes`:

```js
memes: {
  cry:    ["memes/cry-1.gif", "memes/cry-2.gif"],   // popup kết quả, mỗi anh 1 meme
  bonus:  ["memes/bonus-1.gif"],                    // kèm hiệu ứng ×2 ×3 ×5
  rescue: ["memes/pushup-1.gif"]                    // màn hít đất vòng giải cứu
}
```

- Có thể dán link GIF trực tiếp thay cho file (Giphy/Tenor: chuột phải vào GIF → Copy image address). Link thì cần mạng lúc chiếu, file trong thư mục này thì không.
- File lỗi / không tồn tại sẽ tự thay bằng hoạt hoạ khóc có sẵn.
- Nên dùng ảnh ngang hoặc vuông, dưới ~3MB mỗi file để chạy mượt.
