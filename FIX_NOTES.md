# Fix notes — v2.2.7-patched

## A. generateOutfits.js — refund rate limit (lần 1)

1. Validate wardrobe (≥2 món) **trước** consume.
2. Acquire generation lock **trước** consume.
3. Consume trong `try`; `rateConsumed = true` sau consume thành công.
4. `rateConsumed = false` chỉ sau `batch.commit()` thành công.
5. `finally`: xóa lock + refund nếu `rateConsumed`.

## B. Các fix theo review (lần 2)

### B1. NotificationBell — polling
- **Sai:** `setInterval` mỗi tick `stopPoll()` + `startPoll()` → drift/leak.
- **Fix:** recursive `setTimeout` + cờ `cancelled` khi unmount.

### B2. Gift code premiumExpiry — timezone VN
- **Sai:** `expiry.setDate(+days)` theo clock UTC Netlify.
- **Fix:** hết hạn **23:59:59.999 Asia/Ho_Chi_Minh** sau `config.days` ngày.

### B3. transactions orderCode unique
- **Sai:** `addDoc` + query `orderCode` + `limit(1)` không deterministic nếu trùng.
- **Fix:** `docId = orderCode` (`setDoc`); sepayWebhook / cancel / MBQR onSnapshot đọc theo docId (fallback query cho doc cũ).

### B4. FeedbackButton success UX
- **Sai:** luôn `setSent(true)` dù Telegram fail và anonymous không ghi Firestore.
- **Fix:** success chỉ khi `persisted || notified`.

### B5. OfflineBanner
- Ẩn banner reconnect: 250ms → **1500ms**.

### B6. Onboarding localStorage
- Key theo `uid` (`onboarding_done_v1_${uid}`), vẫn đọc key cũ để không hiện lại.

### B7. ensureUserDoc (authService)
- Helper idempotent: tạo/bổ sung field thiếu (`isPremium`, `credits`, `createdAt`); không ghi đè premium/credits server-owned.
- `register` / `login` / `loginWithGoogle` đều gọi `ensureUserDoc`.

## C. AI Provider Chain — v2.2.8

- `geminiService.js`: model registry mở rộng; config tier = array mạnh→yếu; `callGeminiWithRetry` iterate + early-exit key invalid; thêm `enhance_clothing`.
- `aiProviderChain.js`: FREE/PREMIUM providers reorder; `callGemini25Flash/20Flash/25Pro`; user key thử 2.5-flash trước; Hạ Vy 3 tầng Gemini; `callGeminiRaw` default 2.0-flash.
- `analyzeClothing.js`: đọc `isPremium` từ Firestore; fallback OpenRouter Vision khi Gemini fail.
- `firestore.indexes.json`: thêm `outfits (userId, createdAt DESC)`.
- `package.json`: thêm `recharts`, version 2.2.8.
