# RULES.md

Quy tắc **cố định** — bắt buộc tuân thủ mỗi khi hiện thực code trong repo này, không phụ thuộc đang làm feature nào. Khác với `Plan/` (kế hoạch thay đổi code, sẽ đổi theo từng feature), nội dung ở đây không đổi trừ khi chính bạn (chủ dự án) sửa lại.

## Lệnh

| Việc       | Lệnh                                  |
| ---------- | ------------------------------------- |
| Dev server | `npm run dev`                         |
| Build      | `npm run build`                       |
| Test       | `npm test` (Vitest)                   |
| Lint       | `npm run lint` (ESLint `--fix`)       |
| Format     | `npm run format` (Prettier `--write`) |
| Type-check | `npm run typecheck` (`tsc --noEmit`)  |

## Git branch

`feature/<slug>` · `fix/<slug>` · `chore/<slug>` · `docs/<slug>` · `refactor/<slug>` — slug tiếng Anh, kebab-case, mô tả đúng việc đang làm. Không commit thẳng vào `main`.

## Definition of Done — 1 feature chỉ coi là xong khi đủ cả 5 điều dưới, thiếu 1 điều = chưa xong

1. Code khớp đúng acceptance criteria trong plan tương ứng ở `Plan/`.
2. `npm test` pass toàn bộ — không skip/xoá test để né lỗi.
3. `npm run lint` và `npm run typecheck` sạch — không lỗi, không warning mới phát sinh.
4. Đã tự tay chạy `npm run dev` và thử thật luồng UI ↔ API liên quan (không chỉ dựa vào unit test) — vì đây là 1 app gộp cả FE/BE, unit test không thay thế được việc bấm thử trên trình duyệt.
5. Không hardcode secret/API key, không đặt default value cho endpoint/key nội bộ nào trong source (CAS credential, v.v. — bắt buộc qua env, thiếu thì fail rõ ràng). Ngoại lệ có chủ đích: Root CA certificate trong `lib/trustStore/roots/` — đây là dữ liệu công khai (không phải secret), cố ý bundle trong repo thay vì qua env (xem README ở đó), không tính là vi phạm quy tắc này.

## Quy tắc chia nhỏ việc & Plan Mode

- Không giao/nhận 1 yêu cầu quá lớn (nhiều feature cùng lúc, đổi nhiều tầng kiến trúc cùng lúc) — chia thành từng việc nhỏ, làm xong 1 mới sang việc kế.
- Việc chạm **từ 3 file trở lên**: bắt buộc bật Plan Mode trước (Shift+Tab x2) — trình bày kế hoạch từng bước, chờ duyệt xong mới bắt đầu viết/sửa code.

## Verification Loop — bắt buộc sau MỖI lần sửa code

Chạy theo thứ tự, lặp lại từ đầu mỗi khi có lỗi ở bất kỳ bước nào, cho tới khi cả 4 bước đều sạch — **không được báo "hoàn thành"/đưa cho người dùng kiểm tra thủ công khi còn bất kỳ lỗi nào**:

1. `npm test` → `npm run lint` → `npm run typecheck` — sạch cả 3.
2. **Kiểm tra runtime thật** (không chỉ test/lint/typecheck — nhiều lỗi như hydration mismatch, lỗi console phía client chỉ lộ ra lúc chạy thật):
   - Đảm bảo `npm run dev` đang chạy sạch (nếu vừa sửa nhiều/nhanh, khởi động lại hẳn server — HMR đôi khi giữ state cũ gây lỗi giả).
   - `curl` từng route thật đã đổi, kiểm tra HTTP 200 và **soi HTML trả về** để phát hiện dấu hiệu lỗi rõ ràng qua công cụ dòng lệnh: key i18n chưa dịch còn sót lại dạng thô (ví dụ `home.ctaTryFree` thay vì bản dịch thật), thông báo lỗi/stacktrace lộ trong HTML.
   - Đọc log server (`npm run dev`) xem có exception/warning mới phát sinh sau khi sửa không.
   - Nếu có lỗi (kể cả chỉ thấy qua ảnh chụp màn hình người dùng gửi): sửa rồi lặp lại từ bước 1.
   - **Giới hạn đã biết**: một số lỗi (vd tương tác kéo/thả bằng chuột thật, lỗi chỉ hiện trong console trình duyệt) không kiểm tra được chỉ bằng `curl`/log — sau khi đã làm sạch mọi thứ kiểm tra được, vẫn cần người dùng tự kiểm tra thủ công trên trình duyệt thật trước khi coi là xong hẳn.
