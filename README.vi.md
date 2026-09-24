*[Read this in English](README.md)*

# KysoQR CE / Xsign-Opensource

Ký số tài liệu PDF qua mã QR (CAS e-signing) và xác minh chữ ký số điện tử — mã nguồn mở, **một ứng dụng Next.js duy nhất, hoàn toàn stateless**.


## KysoQR Opensource là gì?

KysoQR là một ứng dụng ký số và xác minh chữ ký, hướng tới trở thành một công cụ **mã nguồn mở, tự host được, triển khai tối giản** không cần setup và chạy trong vài lệnh. 

Sau khi triển khai dự án, quy trình ký số của doanh nghiệp diễn ra như sau:

- Lên CAS ID (tải từ App Store hoặc CHPlay) đăng ký chữ ký số cho cá nhân (hiện tại đang miễn phí)
- Up tài liệu lên ứng dụng KysoQR
- Cấu hình phiên ký (người ký và vị trí ký) và nhấn "ký"
- Quét QR trên CAS ID để hoàn thành phiên ký

## Tại nào nên sử dụng ứng dụng này để triển khai ký số cho doanh nghiệp?
 
- **Triển khai hệ thống ký số cho nội bộ nhanh chóng và miễn phí** - clone về, cài dependency, tạo `.env`, chạy một lệnh là dùng được ngay.

- **Xác minh hầu hết các hợp đồng có chữ ký số ở Việt Nam** — dùng thuật toán có sẵn trong ứng dụng để kiểm tra chữ ký có trong hợp đồng có phải do đúng chủ private key tạo ra, không phải chỉ so sánh vài trường dữ liệu tự khai.

- **Mã nguồn mở, minh bạch** — ai cũng đọc được và tự kiểm chứng được logic xác minh, không phải tin vào một hộp đen.

- **Tối giản hạ tầng** — một dịch vụ ký số/xác minh không cần giữ trạng thái ở server thì không nên bắt người vận hành phải dựng cả một cụm hạ tầng (DB + queue + cache) chỉ để chạy nó.


## Kiến trúc tóm tắt

Hai luồng độc lập, cùng một repo, server hoàn toàn stateless (không ghi file, không giữ session giữa các request):

- **Ký số** (CAS-driven) — `POST /api/sign/request` gửi tài liệu + vị trí chữ ký sang CAS → poll `GET /api/sign/status` → khi hoàn tất, tải bản đã ký về qua `GET /api/sign/download`. Trạng thái phiên ký chỉ tồn tại ở `localStorage` của trình duyệt.
- **Xác minh** (document-driven) — `POST /api/verify/upload` xác minh chữ ký số thật (chữ ký + chain + trust anchor), độc lập hoàn toàn với CAS/database. `GET /api/verify/signing-round/[orgIdSigned]` là tra cứu nhanh qua CAS cho tiện, không thay thế cho verify-by-upload.
- CAS được trừu tượng hoá qua một interface `CasProvider`, hiện có 1 implementation thật (`CasEsignProvider`) — gọi thẳng API CAS e-signing, không có chế độ giả lập.

## Cách chạy dự án

### 1. Local — máy cá nhân, phát triển/thử nghiệm

```bash
git clone https://github.com/KysoQR/KysoQR-Opensource.git
cd KysoQR-Opensource
npm install
cp .env.example .env
npm run dev
```

Không cần cài database, Redis, hay bất kỳ service ngoài nào — mở `http://localhost:3000` là chạy được ngay. Luồng **xác minh chữ ký** hoạt động ngay lập tức, không cần credential nào. Luồng **ký** cần điền `CAS_ESIGN_BASE_URL`/`CAS_ESIGN_CLIENT_ID`/`CAS_ESIGN_API_KEY` vào `.env` trước (không có default nào được hardcode sẵn trong source — xem mục ["Env người dùng cần"](#env-người-dùng-cần) phía dưới nếu muốn dùng thử ngay bằng key demo dùng chung). Root CA tin cậy dùng để xác minh chữ ký không cấu hình qua env — đã bundle sẵn trong [`lib/trustStore/roots/`](lib/trustStore/roots/README.md).

### 2. Server — tự host trên máy chủ/VPS riêng

Về bản chất vẫn là một tiến trình Node.js duy nhất, không cần DB/Redis — chỉ khác Local ở chỗ chạy bản build production thay vì dev server:

```bash
npm install
cp .env.example .env   # điền 3 biến CAS_ESIGN_* thật
npm run build
npm run start
```

Khuyến nghị: đặt sau reverse proxy (Nginx/Caddy) để có TLS; đảm bảo `.env` không lộ ra ngoài (quyền file, không phục vụ tĩnh); không log PII.

Hướng dẫn chi tiết từng bước (cài Node, systemd service, Nginx + TLS, cập nhật code): [`docs/DEPLOY.md`](docs/DEPLOY.md).

### 3. Cloud Worker — nền tảng serverless/edge

Kiến trúc được thiết kế sẵn cho mô hình này: server hoàn toàn stateless, không ghi file hay giữ trạng thái trong tiến trình, mọi cấu hình đọc qua biến môi trường/secrets của nền tảng.

Đã dùng được **ngay hôm nay** trên các nền tảng serverless/container có Node.js runtime đầy đủ (ví dụ: Vercel serverless functions ở chế độ Node runtime, AWS Lambda container image, Fly.io Machines, Railway...) — set biến môi trường qua secrets manager của nền tảng đó, cách vận hành giống hệt mục "Server" ở trên.

**Đã verify chạy được trên Cloudflare Workers** (runtime edge/isolate thuần, không có filesystem thật) qua OpenNext Cloudflare adapter (`nodejs_compat`, cho phép `node-forge`/`Buffer` chạy được). Có 1 điểm khác biệt quan trọng cần biết: `lib/trustStore/` (đọc chứng thư CA) dùng thêm 1 manifest sinh sẵn lúc build (`lib/trustStore/generated/*.generated.ts`, xem [`lib/trustStore/roots/README.md`](lib/trustStore/roots/README.md)) vì Cloudflare Workers không có filesystem thật để đọc file lúc runtime như VPS. Hướng dẫn chi tiết: [`docs/DEPLOY_CLOUDFLARE.md`](docs/DEPLOY_CLOUDFLARE.md).

## Lệnh

| Việc       | Lệnh                |
| ---------- | ------------------- |
| Dev server | `npm run dev`       |
| Build      | `npm run build`     |
| Test       | `npm test`          |
| Lint       | `npm run lint`      |
| Format     | `npm run format`    |
| Type-check | `npm run typecheck` |

## Đóng góp / quy tắc làm việc

Quy tắc cố định khi đóng góp code (Definition of Done, khi nào bật Plan Mode, Verification Loop bắt buộc sau mỗi lần sửa code): [`Rule/RULES.md`](Rule/RULES.md). Bắt buộc đọc trước khi code.

## License

Phát hành theo giấy phép **MIT** — xem [`LICENSE`](LICENSE).

## Trạng thái

Dự án đang trong giai đoạn hiện thực — luồng ký số đã chạy được đầy đủ; luồng xác minh chữ ký số đang được hiện thực dần (một số route/UI vẫn ở dạng khung, chưa hoàn thiện business logic).

## Env người dùng cần

```
NODE_ENV="production"
CAS_ESIGN_BASE_URL=https://production.bankhub.dev
CAS_ESIGN_CLIENT_ID=trial-vendor-47de-86e8-7342f311028c
CAS_ESIGN_API_KEY=a0e6d612-b34e-11f1-a10d-02cf4c5ff398
```

Lưu ý: đây là các key **trial** dùng chung để bạn dùng thử ngay. Nếu muốn sử dụng để ký thật hằng ngày hoặc đóng gói thành sản phẩm production, cần truy cập trang https://cas.so/ hoặc liên hệ sđt 0961580977 để được cấp key riêng.