# Deploy — Lama Stylers (Free Tier)

Kiến trúc: **Netlify Free + Firebase Spark + Cloudinary Free + Gemini AI Studio**
Không yêu cầu thẻ tín dụng ở bất kỳ bước nào.

---

## Bước 1 — Firebase Project (5 phút)

1. [console.firebase.google.com](https://console.firebase.google.com) → Add project
2. Bật **Authentication** → Sign-in method → Email/Password + Google
3. Bật **Firestore Database** → Create database → region `asia-southeast1`
4. **KHÔNG bật**: Cloud Functions, Storage (dùng Cloudinary thay thế)
5. **KHÔNG cần Blaze plan** — Spark (free) là đủ

User document `users/{uid}` được tạo tự động từ client sau khi đăng ký,
không cần Cloud Function hay trigger.

---

## Bước 2 — Firebase Config (2 phút)

Project Settings → Your apps → Web (`</>`) → Register → copy `firebaseConfig`

---

## Bước 3 — Cloudinary (3 phút)

1. Đăng ký tại [cloudinary.com](https://cloudinary.com) (không cần thẻ)
2. Dashboard → lấy **Cloud Name**, **API Key**, **API Secret**
3. Free tier: 25 GB storage + 25 GB bandwidth/tháng

---

## Bước 4 — Gemini API Key (2 phút)

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key
2. Không cần thanh toán — Free tier: 15 req/phút, 1500 req/ngày

---

## Bước 5 — Netlify Site (3 phút)

1. [app.netlify.com](https://app.netlify.com) → Add new site → Import from GitHub
2. Branch: `main` — `netlify.toml` tự động cấu hình build + functions
3. Build command: `npm run build` | Publish: `dist` | Functions: `netlify/functions`

---

## Bước 6 — Environment Variables trên Netlify (10 phút)

**Site settings → Environment variables → Add variable**

### Bắt buộc
| Variable | Lấy từ đâu |
|----------|------------|
| `GEMINI_API_KEY` | AI Studio → API Keys |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service accounts → Generate new private key → copy toàn bộ JSON |
| `ALLOWED_ORIGINS` | `https://<ten-site>.netlify.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard |

### Tùy chọn
| Variable | Dùng cho |
|----------|----------|
| `OPENROUTER_API_KEY` | AI fallback cho generateOutfits |
| `XTROUTER_API_KEY` | Mistral fallback |
| `SEPAY_WEBHOOK_SECRET` | Webhook payment xác thực HMAC |
| `FAL_API_KEY` | Tính năng remove background (Premium) |
| `CLEANUP_SECRET` | Cloudflare Workers Cron — xem Bước 7 |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Thông báo Telegram |
| `SENTRY_DSN_SERVER` | Error monitoring |
| `FIREBASE_STORAGE_BUCKET` | Bucket Cloud Storage backend (khác `VITE_FIREBASE_STORAGE_BUCKET` ở build-time) |
| `RESEND_API_KEY` + `EMAIL_FROM` | Gửi email (sendOutfitCreatedEmail) — thiếu thì function này fail runtime, không ảnh hưởng các tính năng khác |
| `GIFT_CODES_JSON` | Danh sách mã quà tặng hợp lệ (JSON) cho redeemGiftCode |
| `GIFT_CODES_ALLOW_DEV` | Bật mã dev/test cho redeemGiftCode — để trống/`false` ở production |

### Build-time (VITE_) — phải set ở "Build environment variables", không phải Functions
| Variable | Dùng cho |
|----------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Project Settings → General → SDK config |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Console → Project Settings → General → SDK config (Analytics) |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Console → Project Settings → Cloud Messaging → Web Push certificates (thông báo push) |
| `VITE_RECAPTCHA_SITE_KEY` | Firebase App Check / reCAPTCHA |
| `VITE_NETLIFY_API_BASE` | Base URL gọi Netlify Functions từ frontend (thường để trống nếu cùng domain) |
| `VITE_SENTRY_DSN_FRONTEND` | Error monitoring phía client |
| `VITE_ADSENSE_PUBLISHER_ID` | Google AdSense publisher ID (`ca-pub-XXXX`) |
| `VITE_ADSENSE_REWARDED_SLOT` | ID ad unit loại "Rewarded" |
| `VITE_ADSENSE_TEST_MODE` | `true` khi staging, `false` khi production |

---

## Bước 7 — Cloudflare Workers Cron (5 phút, tùy chọn)

Thay thế Netlify Scheduled Functions (Pro-only).
Dọn dẹp Firestore hàng đêm: rate_limits, havy_quota, processed_webhooks, transactions.

```bash
# 1. Tạo secret ngẫu nhiên (lưu lại để dùng ở bước sau)
openssl rand -hex 16

# 2. Set CLEANUP_SECRET trên Netlify (cùng giá trị vừa tạo)
# Netlify Dashboard → Environment variables → CLEANUP_SECRET

# 3. Deploy CF Worker
cd cf-workers
npm install -g wrangler
wrangler login
wrangler secret put CLEANUP_SECRET     # nhập giá trị từ bước 1

# Sửa NETLIFY_SITE_URL trong wrangler.toml trước khi deploy
wrangler deploy

# Kiểm tra log
wrangler tail
```

---

## Bước 8 — `.env.local` cho local dev

```bash
cp .env.local.example .env.local
# Điền các giá trị từ các bước trên
npm run dev
# Truy cập http://localhost:8888 (netlify dev) để test functions
```

---

## Kiểm tra sau deploy

```bash
# Health check — phải trả { status: "ok" }
curl https://<site>.netlify.app/api/health

# Test generateOutfits — phải có outfits[] trong response (KHÔNG có jobId)
# Log vào app → thêm ≥2 món đồ → bấm "Tạo outfit"
```

---

## Giới hạn Free Tier

| Dịch vụ | Giới hạn |
|---------|----------|
| Netlify Functions | 125k invocations/tháng, timeout 10s |
| Firebase Firestore | 50k reads, 20k writes/ngày |
| Cloudinary | 25 GB storage, 25 GB bandwidth/tháng |
| Gemini API | 15 req/phút, 1500 req/ngày |


---

## ✅ Checklist Bắt Buộc Trước Khi Public

### 1. Deploy Firestore Security Rules
```bash
# Cài Firebase CLI (nếu chưa có)
npm install -g firebase-tools
firebase login

# Init project (chỉ lần đầu)
firebase init firestore
# → chọn project hiện tại, dùng file firestore.rules đã có

# Deploy rules
firebase deploy --only firestore:rules

# Verify trên Console: Firestore → Rules → Rules Playground
# Thử: đọc users/{uid-khác} → phải bị DENIED
# Thử: ghi isPremium=true vào users/{uid} → phải bị DENIED
```

### 2. Kiểm tra SePay Webhook
```bash
# Test HMAC (thay YOUR_SECRET bằng SEPAY_WEBHOOK_SECRET thật)
curl -X POST https://<site>.netlify.app/.netlify/functions/sepayWebhook \
  -H "Content-Type: application/json" \
  -H "x-sepay-signature: invalid_sig" \
  -d '{"content":"test"}' 
# Expected: 401 Invalid signature ✓

# Idempotency test: gửi cùng orderCode 2 lần
# Expected lần 2: 200 { reason: "already_processed" } ✓
```

### 3. ALLOWED_ORIGINS (production domain chính xác)
```bash
# Netlify Dashboard → Environment variables
ALLOWED_ORIGINS=https://lama-stylers.netlify.app  # ← đổi thành domain thật

# Sau khi set: redeploy bắt buộc
netlify deploy --prod
```

### 4. Health Check + Monitoring
```bash
# Kiểm tra health
curl https://<site>.netlify.app/.netlify/functions/health
# Expected: { "status": "ok", ... }

# Nếu status = "degraded" → Telegram bot sẽ tự alert
# Cần set: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID trong Netlify env vars
# Cần set: SENTRY_DSN_SERVER trong Netlify env vars
```

### 5. Privacy Policy + Terms
- Truy cập /privacy-policy và /terms-of-service → phải render đúng
- TODO: đổi `email: 'support@lamastyle.app'` thành email thật trong:
  - `src/pages/PrivacyPolicyPage.jsx` (OWNER.email)
  - `src/pages/TermsOfServicePage.jsx` (OWNER.email)
- TODO: thêm địa chỉ thật nếu muốn đăng ký dịch vụ (line `address`)

