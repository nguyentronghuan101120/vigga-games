# Vigga Mini-Games — Monorepo Architecture & Decisions

Tài liệu này tổng hợp toàn bộ các quyết định kỹ thuật, kiến trúc hệ thống và lộ trình triển khai các mini-game độc lập, kết nối với trang trung tâm **Game Hub** ([vigga.netlify.app](https://vigga.netlify.app/)).

---

## 1. Mục tiêu & Định hướng dự án

* **Mục tiêu:** Xây dựng một tập hợp các mini-game giải đố, cờ và arcade trí tuệ. Mỗi game là **1 liên kết web (link) độc lập**.
* **Trang chủ trung tâm (Hub):** [vigga.netlify.app](https://vigga.netlify.app/) (đã có sẵn danh mục game, mỗi game con sẽ được gán vào thuộc tính `url` tương ứng trong `games.js`).
* **Trải nghiệm người chơi:** Tải ngay lập tức (< 0.5s), mượt mà trên cả Mobile và Desktop, giao diện đẹp mắt, tinh tế.

---

## 2. Quyết định Kỹ thuật (Technical Decisions)

### 2.1. Nền tảng Deploy: **Vercel (Mono-deployment)**
* **Mô hình triển khai:** Toàn bộ repository được deploy lên 1 project Vercel duy nhất (`vigga-games.vercel.app`).
* **Lợi ích:** 
  * Tái sử dụng trực tiếp các module dùng chung `/shared/` (shell.css, audio.js, navigation.js) mà không cần build tool hay copy code.
  * Mỗi game có đường dẫn web tĩnh độc lập:
    * Portal chính: `https://vigga-games.vercel.app/`
    * Game Caro: `https://vigga-games.vercel.app/games/caro/`
    * Các game kế tiếp: `/games/2048/`, `/games/tetris/`, v.v.
* **Cập nhật vào Hub:** Gán trực tiếp link tương ứng vào `games.js` của `vigga.netlify.app`.

### 2.2. Công nghệ Cốt lõi: **HTML5 + CSS3 + Vanilla JavaScript**
* **Tiêu chuẩn:** Không sử dụng các framework nặng (như React/Next.js/Vue) để tránh overhead và lỗi phiên bản build.
* **Xử lý đồ họa:**
  * **DOM Grid (CSS Grid + Flexbox):** Dành cho các game bàn cờ ô lưới tĩnh (Caro, Wordle, Sudoku, Queens).
  * **HTML5 Canvas 2D:** Dành cho các game có chuyển động vật lý/thời gian thực (Tetris, Block Blast, Water Sort).
* **Âm thanh:** Web Audio API (tạo tiếng click/bíp mềm mại không cần nạp file mp3 nặng).

### 2.3. Phong cách Đồ họa: **Clean Flat / Minimalist**
* Tham chiếu thiết kế từ: **Wordle (NYT)**, **2048**, và **LinkedIn Games** (Queens, Tango, Pinpoint).
* Bảng màu: Dịu mắt (soft pastel), tương phản chuẩn công thái học, bo góc viền mềm mại, icon phẳng.
* Thanh điều hướng trên mỗi game:
  * Nút `Quay lại Hub` (dẫn về `https://vigga.netlify.app/`).
  * Nút `Chơi lại (Restart)`.
  * Nút `Bật/Tắt âm thanh (Mute/Unmute)`.

---

## 3. Cấu trúc Thư mục (Monorepo Layout)

```text
vigga-games/
├── README.md                # Tài liệu lưu trữ quyết định dự án
├── .gitignore               # Cấu hình bỏ qua file rác
├── shared/                  # Tài nguyên dùng chung
│   ├── css/
│   │   └── shell.css        # Giao diện thanh Header, nút Back Hub, bảng màu chuẩn
│   └── js/
│       ├── audio.js         # Bộ phát âm thanh Web Audio API siêu nhẹ
│       └── navigation.js    # Logic điều hướng và quay về Hub
└── games/
    ├── caro/                # Game 1: Caro 5 ô thẳng hàng (DOM Grid + AI Bot)
    │   ├── index.html
    │   ├── style.css
    │   └── game.js
    ├── 2048/                # Game 2: 2048 Classic (Dự kiến)
    ├── mini-sudoku/         # Game 3: Mini Sudoku 6x6 (Dự kiến)
    ├── block-blast/         # Game 4: Block Blast (Dự kiến)
    ├── tetris/              # Game 5: Tetris xếp gạch (Dự kiến)
    └── water-sort/          # Game 6: Water Sort rót nước (Dự kiến)
```

---

## 4. Đặc tả Game 1: Caro (Gomoku)

* **Kích thước bàn cờ:** 15x15 ô, có đánh dấu các điểm sao chuẩn (Tengen & Star points).
* **Luật chơi:** Luật tự do (Gomoku) — Cứ đủ 5 ô thẳng hàng (ngang, dọc, chéo) là thắng ngay.
* **Lượt đi:** Người chơi (X) luôn đi trước mặc định.
* **Chế độ chơi:**
  1. `Người vs Người (PvP)`: Luân phiên đi nước trên cùng thiết bị.
  2. `Người vs Máy (AI Bot)`: 3 mức độ lựa chọn (**Dễ**, **Vừa**, **Khó**) với thuật toán đánh giá thế cờ công/thủ thông minh.
* **Tính năng:**
  * **Đi lại (Undo):** Cho phép hoàn tác nước đi.
  * **Pan & Zoom:** Hỗ trợ vuốt kéo, phóng to thu nhỏ bằng 2 ngón tay hoặc nút điều khiển trên mobile.
  * **Âm thanh:** Tự tổng hợp âm thanh nước đi, chiến thắng, undo bằng Web Audio API.

---

## 5. Hướng dẫn Deploy lên Vercel

1. **Khởi tạo Git và Commit (tại thư mục gốc `vigga-games`):**
   ```bash
   cd ~/Desktop/vigga-games
   git init
   git add .
   git commit -m "feat: init vigga-games with shared shell and caro game"
   ```

2. **Deploy lên Vercel:**
   ```bash
   make deploy
   ```
   * Hoặc: `npx vercel --prod`
   * Link trực tiếp game Caro: `https://<ten-project>.vercel.app/games/caro/`

3. **Cập nhật link vào Hub:**
   * Mở file `games.js` của `vigga.netlify.app`, cập nhật link `https://vigga-games.vercel.app/games/caro/` vào mục Game Caro.

