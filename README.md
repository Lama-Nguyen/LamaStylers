# Lama Stylers

> Tủ đồ thông minh AI — phân tích quần áo, phối outfit, tư vấn thời trang cùng Hạ Vy.

**Repo:** [github.com/lamepzaipro-spec/LamaStylers](https://github.com/lamepzaipro-spec/LamaStylers)  
**Stack:** React 18 + Vite · Netlify Functions · Firebase · Cloudinary · Gemini / OpenRouter

---

## Deploy Netlify (khuyến nghị — Import từ GitHub)

### 1. Đẩy code lên GitHub

Trên máy bạn (đã cài `git` + đăng nhập GitHub):

```bash
# Tạo repo trống trên GitHub: https://github.com/new
# Name: LamaStylers  ·  Public  ·  KHÔNG tick README

cd lama-stylers   # thư mục source đã giải nén
git init
git branch -M main
git add .
git commit -m "chore: initial commit LamaStylers v2.2.8"
git remote add origin https://github.com/lamepzaipro-spec/LamaStylers.git
git push -u origin main
```

### 2. Import site trên Netlify

1. Vào [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Chọn **GitHub** → authorize → chọn repo **LamaStylers**
3. Build settings (tự đọc từ `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. **Deploy site**

### 3. Environment variables (Netlify → Site configuration → Environment variables)

**Bắt buộc**

| Variable | Ghi chú |
|----------|---------|
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON private key (Project Settings → Service accounts) — **một dòng JSON** |
| `ALLOWED_ORIGINS` | `https://<tên-site>.netlify.app` (đúng domain sau deploy) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |

**Build-time (Vite) — đánh dấu Available in builds**

| Variable | Ghi chú |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_NETLIFY_API_BASE` | `https://<tên-site>.netlify.app/api` |

**Tuỳ chọn**

| Variable | Dùng cho |
|----------|----------|
| `GEMINI_PRO_API_KEY` | Premium Gemini 2.5 Pro |
| `OPENROUTER_API_KEY` | Fallback AI + vision |
| `XTROUTER_API_KEY` | Mistral fallback |
| `SEPAY_WEBHOOK_SECRET` | Thanh toán SePay |
| `CLEANUP_SECRET` | Cron cleanup |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Feedback |
| `SENTRY_DSN` | Error tracking |
| `FAL_API_KEY` | Remove background |
| `RESEND_API_KEY` | Email |

Sau khi set env → **Trigger deploy** lại (Deploys → Trigger deploy).

### 4. Firebase

1. Authentication: Email/Password + Google  
2. Firestore: region `asia-southeast1`  
3. Deploy rules + indexes:

```bash
npm i -g firebase-tools
firebase login
firebase use <project-id>
firebase deploy --only firestore
```

### 5. Kiểm tra sau deploy

```bash
curl https://<site>.netlify.app/.netlify/functions/health
# Kỳ vọng: {"status":"ok", ...}
```

App: đăng ký → upload đồ → tạo outfit → chat Hạ Vy.

---

## Local development

```bash
cp .env.local.example .env.local   # điền keys
npm install
npx netlify dev                    # http://localhost:8888
```

---

## Cấu trúc chính

```
netlify/functions/     # Serverless API
src/                   # React app
firestore.rules        # Security rules
firestore.indexes.json
netlify.toml           # Build + redirects /api → functions
cf-workers/            # Cleanup cron (Cloudflare, tuỳ chọn)
```

Chi tiết: [DEPLOY.md](DEPLOY.md) · [FIX_NOTES.md](FIX_NOTES.md)

---

## License

Xem [LICENSE](LICENSE).
