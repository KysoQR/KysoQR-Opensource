*[Đọc bằng tiếng Việt](README.vi.md)*

# KysoQR CE / Xsign-Opensource

PDF e-signing via QR code (CAS e-signing) and digital signature verification — open source, **a single, fully stateless Next.js application**.

## What is KysoQR Opensource?

KysoQR is a digital signing and signature verification application, aiming to be an **open-source, self-hostable, minimal-setup** tool — running in just a few commands.

Once deployed, a business's signing process looks like this:

- Sign up on **Cas ID** (download from the App Store or Google Play) to register a personal digital signature (currently free).
- Upload the document to the KysoQR app.
- Configure the signing session (signer and signature position) and click "Sign".
- Scan the QR code with Cas ID to complete the signing session.

## Why use this app to roll out digital signing for a business?

- **Roll out an internal signing system quickly and for free** — clone it, install dependencies, create `.env`, run one command and it works.

- **Verify most digitally-signed contracts in Vietnam** — uses the algorithm built into the app to check whether the signature on a contract was actually produced by the real private-key holder, not just by comparing a few self-reported fields.

- **Open source and transparent** — anyone can read and independently verify the verification logic, instead of trusting a black box.

- **Minimal infrastructure** — a signing/verification service that doesn't need to hold state server-side shouldn't force operators to stand up a whole DB + queue + cache stack just to run it.

## Architecture summary

Two independent flows in one repo, a fully stateless server (no file writes, no session held between requests):

- **Signing** (CAS-driven) — `POST /api/sign/request` sends the document + signature position to CAS → poll `GET /api/sign/status` → once complete, download the signed file via `GET /api/sign/download`. Signing-session state lives only in the browser's `localStorage`.
- **Verification** (document-driven) — `POST /api/verify/upload` performs real signature verification (signature + chain + trust anchor), fully independent of CAS/any database. `GET /api/verify/signing-round/[orgIdSigned]` is a convenience CAS lookup, not a replacement for verify-by-upload.
- CAS is abstracted behind a `CasProvider` interface, with one real implementation (`CasEsignProvider`) — it calls the CAS e-signing API directly; there is no mock mode.

## What does the signer need to do?

KysoQR **does not sign documents itself** — the actual signing (holding the private key, HSM) happens at CAS. KysoQR only creates the signing request and hands it to the signer via the **Cas ID** app. From the signer's perspective, the flow is:

1. The requester (using KysoQR) uploads the PDF, places the signature field(s), and clicks "Sign".
2. KysoQR displays a QR code containing the newly created signing request.
3. The signer opens the **Cas ID** app on their phone (installed from the App Store/Google Play — search "Cas ID"), then either:
   - **Scans the QR code** shown on screen, or
   - If the requester already supplied the signer's national ID number in step 1, the signer instead gets a **push notification** directly in the Cas ID app — no scanning needed.
4. Inside the Cas ID app, the signer reviews the document and **approves the signing request**.
5. Once approved, CAS finishes signing (via HSM). KysoQR automatically detects this (polling status every 4 seconds) and lets the requester download the signed file and see the verification code (`orgIdSigned`).

## Running the project

### 1. Local — personal machine, development/testing

```bash
git clone https://github.com/KysoQR/KysoQR-Opensource.git
cd KysoQR-Opensource
npm install
cp .env.example .env
npm run dev
```

No database, Redis, or any external service needed — open `http://localhost:3000` and it's ready. The **signature verification** flow works immediately, no credentials needed. The **signing** flow needs `CAS_ESIGN_BASE_URL`/`CAS_ESIGN_CLIENT_ID`/`CAS_ESIGN_API_KEY` filled in `.env` first (no default is ever hardcoded in source — see the ["Environment variables you'll need"](#environment-variables-youll-need) section below if you want to try it right away with a shared demo key). The trusted root CAs used for signature verification aren't configured via env — they're bundled in [`lib/trustStore/roots/`](lib/trustStore/roots/README.md).

### 2. Server — self-hosted on your own machine/VPS

Fundamentally still a single Node.js process, no DB/Redis needed — the only difference from Local is running the production build instead of the dev server:

```bash
npm install
cp .env.example .env   # fill in the 3 real CAS_ESIGN_* variables
npm run build
npm run start
```

Recommended: put it behind a reverse proxy (Nginx/Caddy) for TLS; make sure `.env` is never exposed (file permissions, not served statically); don't log PII.

Detailed step-by-step guide (installing Node, systemd service, Nginx + TLS, updating code): [`docs/DEPLOY.md`](docs/DEPLOY.md).

### 3. Cloud Worker — serverless/edge platforms

The architecture is designed for this model from the start: a fully stateless server, no file writes or in-process state, all configuration read from the platform's environment variables/secrets.

Works **today** on any serverless/container platform with a full Node.js runtime (e.g. Vercel serverless functions in Node runtime mode, AWS Lambda container images, Fly.io Machines, Railway...) — set environment variables via that platform's secrets manager; operations are otherwise identical to the "Server" section above.

**Verified working on Cloudflare Workers** (a pure edge/isolate runtime with no real filesystem) via the OpenNext Cloudflare adapter (`nodejs_compat`, which lets `node-forge`/`Buffer` run). One important difference to know: `lib/trustStore/` (which reads CA certificates) also uses a manifest generated at build time (`lib/trustStore/generated/*.generated.ts`, see [`lib/trustStore/roots/README.md`](lib/trustStore/roots/README.md)) because Cloudflare Workers has no real filesystem to read from at runtime the way a VPS does. Detailed guide: [`docs/DEPLOY_CLOUDFLARE.md`](docs/DEPLOY_CLOUDFLARE.md).

## Commands

| Task       | Command              |
| ---------- | --------------------- |
| Dev server | `npm run dev`       |
| Build      | `npm run build`     |
| Test       | `npm test`          |
| Lint       | `npm run lint`      |
| Format     | `npm run format`    |
| Type-check | `npm run typecheck` |

## Contributing / working rules

Fixed rules for contributing code (Definition of Done, when to enable Plan Mode, the mandatory Verification Loop after every code change): [`Rule/RULES.md`](Rule/RULES.md). Required reading before writing any code.

## License

Licensed under the **MIT License** — see [`LICENSE`](LICENSE).

## Status

The project is under active development — the signing flow is fully working; the signature-verification flow is still being built out incrementally (some routes/UI are still scaffolding, without complete business logic).

## Environment variables you'll need

```
NODE_ENV="production"
CAS_ESIGN_BASE_URL=https://production.bankhub.dev
CAS_ESIGN_CLIENT_ID=trial-vendor-47de-86e8-7342f311028c
CAS_ESIGN_API_KEY=a0e6d612-b34e-11f1-a10d-02cf4c5ff398
```

Note: these are shared **trial** keys meant for trying the app out right away. If you want to sign real documents daily or ship this as part of a production product, go to https://cas.so/ or call +84 961 580 977 to get your own key.
