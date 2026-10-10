# Euler Tour — Vẽ một nét

Minigame tìm **đường đi Euler**: chọn một đỉnh, rồi đi qua **tất cả** các con đường (cạnh) của đồ thị, mỗi con đường **đúng một lần**.

## Chạy dự án

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # kiểm tra kiểu + build production vào dist/
pnpm lint
```

## Tính năng

- **4 mức độ**: Dễ (5–7 đỉnh, 7–10 cạnh), Trung bình (8–10 đỉnh, 12–16 cạnh), Khó (11–13 đỉnh, 17–22 cạnh), Rất khó (14–17 đỉnh, 23–30 cạnh).
- **Đồ thị sinh ngẫu nhiên mỗi ván**: số đỉnh, số cạnh và hình dạng đều thay đổi. Đồ thị luôn liên thông, không có cạnh cắt nhau và có **đúng 2 đỉnh bậc lẻ**, nên luôn có lời giải.
- **Đồng hồ và giới hạn thời gian** chỉnh được cho từng mức (bật/tắt trong Cài đặt). Tự tạm dừng khi chuyển tab.
- Đi bằng cách chạm vào đỉnh kề, chạm vào con đường, hoặc **giữ và kéo** qua các đỉnh. Kéo ngược lại để hoàn tác.
- **Gợi ý thông minh**: chỉ ra đỉnh xuất phát hợp lệ, bước đi an toàn tiếp theo (quy tắc Fleury), hoặc bước nào đã đi sai.
- Hoàn tác, đi lại, tạm dừng (ẩn đồ thị), bỏ cuộc kèm **mô phỏng lời giải**.
- Đánh giá sao, kỷ lục thời gian theo từng mức, hiệu ứng âm thanh, giao diện sáng/tối, hỗ trợ điện thoại.

Phím tắt: `Z`/`Backspace` hoàn tác · `R` đi lại · `H` gợi ý · `P`/`Space` tạm dừng · `N` đồ thị mới.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `src/game/generator.ts` | Sinh đồ thị: rải điểm đều, chọn các cạnh không cắt nhau, giữ một cây khung để đảm bảo liên thông, rồi đảo các cạnh còn lại dọc theo đường đi giữa các đỉnh lẻ cho tới khi còn đúng 2 đỉnh bậc lẻ. |
| `src/game/euler.ts` | Thuật toán Hierholzer (lời giải), kiểm tra còn giải được không, gợi ý bước đi. |
| `src/game/state.ts` | Reducer trạng thái ván chơi và đồng hồ. |
| `src/game/storage.ts` | Cài đặt và kỷ lục (localStorage). |
| `src/components/` | Giao diện: trang chủ, bàn chơi SVG, HUD, các hộp thoại. |
