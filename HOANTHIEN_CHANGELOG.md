# Hoàn thiện theo DEAD_CODE_AUDIT.md + FEATURE_POTENTIAL_AUDIT.md

## Feature (FEATURE_POTENTIAL_AUDIT.md — 5/5 ưu tiên)

**#4 — HaVy fallback chain**
- `netlify/functions/lib/aiProviderChain.js`: `runHavyProviderChain` giờ nhận thêm
  `userApiKey` — thử BYOK (gemini-2.5-flash → gemini-1.5-flash) trước, rồi mới rơi
  xuống chain server (Gemini 2.5→2.0→1.5-flash → OpenRouter Nemotron/Llama).
- `netlify/functions/havySuggestOutfit.js`: đổi từ gọi thẳng `callGeminiWithRetry`
  sang `runHavyProviderChain`. Bonus: giờ có content-safety pre-check (trước đây
  outfit generation có, Havy chat không).

**#3 — Negative filtering**
- `src/services/ragService.js`: `retrieveRelevantItems` giờ gọi
  `applyNegativeFiltering`/`extractNegativeKeywords` trước khi sort. "Không thích
  màu đen" → món đen bị trừ điểm, đẩy xuống dưới, kể cả khi không có tín hiệu
  dương nào khác (fix edge case fallback).

**#1 — Body measurements**
- Tạo `netlify/functions/lib/outfit/bodyMeasurementsSummary.js` — format 10 field
  `users/{uid}.bodyMeasurements` (height/weight/chest/waist/hips/shoulder/inseam/
  neck/thigh/sleeve) thành text tiếng Việt.
- `netlify/functions/generateOutfits.js`: đọc `bodyMeasurements` trong
  `readUserContext`, build `bodyInfo`, truyền vào `generateOutfitsWithAI`.
  (`buildPrompt` trong aiProviderChain.js đã có sẵn chỗ nhận `bodyInfo` và
  instruction "PHẢI điều chỉnh theo cm" — chỉ là chưa ai từng truyền dữ liệu
  thật vào, luôn nhận `undefined` → literal "Không có số đo".)
- Xoá `filterByMeasurements` trong `ragService.js` — dead code tham chiếu field
  `size` không tồn tại trong schema thật (không phải cùng khái niệm với
  bodyMeasurements cm).

**#6 — Analytics funnel** (đủ 5 sự kiện + 1 bonus)
- `src/services/authService.js`: `register()` → `trackSignup('email')`,
  `login()` → `trackLogin('email')`, `loginWithGoogle()` → phân biệt
  signup/login qua `getAdditionalUserInfo(cred)?.isNewUser`.
- `src/pages/OutfitsPage.jsx`: sau generate outfit thành công →
  `trackGenerateOutfit(isPremium)`.
- `src/components/payment/MBQRPayment.jsx`: khi SePay webhook confirm
  (`txn.status === 'completed'`) → `trackUpgradePremium()`.
- `src/components/settings/GiftCodeInput.jsx` (bonus, ngoài audit): redeem gift
  code thành công cũng → `trackUpgradePremium()` — mọi gift code đều set
  `isPremium: true` (khác nhau ở thời hạn), nên đây là nguồn conversion hợp lệ.
- `src/components/feedback/FeedbackButton.jsx`: feedback gửi thành công (persisted
  hoặc notified) → `trackFeedbackSent()`.

## Bug tìm thêm ngoài 2 audit (phát hiện trong lúc implement #3/#4)

**HaVy chưa từng thấy tủ đồ thật của user**
- Client (`HaVyCompanion.jsx`) build `wardrobeContext` qua RAG (retrieveRelevantItems
  + serializeForPrompt) và gửi lên server, nhưng `havySuggestOutfit.js` chưa từng
  destructure/dùng field này — AI luôn trả lời mà không biết user có gì trong tủ đồ.
  Đây là lý do fix #3 (negative filtering) trước đó sẽ vô nghĩa nếu không sửa luôn.
- Fix: destructure `wardrobeContext`, chặn độ dài qua `sanitizeText(…, 3000)`, nối
  vào system prompt (không nối vào userMessage để tránh AI hiểu nhầm là user tự gõ).

## Dead code cleanup (DEAD_CODE_AUDIT.md)

**Xoá hẳn (verify zero-importer bằng grep toàn repo trước khi xoá):**
- `netlify/functions/lib/corsMiddleware.js`
- `netlify/functions/lib/wardrobeFilter.js`
- `src/hooks/useToastQueue.js`
- `src/components/ToastContainer.jsx`
- `ragService.js → filterByMeasurements` (xem mục #1 ở trên)
- `netlify/functions/lib/constants.js`: `CATEGORIES`, `HARMONY_TYPES`,
  `JOB_STATUSES`, `TIMEOUTS`, `FILE_LIMITS`, `JOBS_COLLECTION`, `JOB_TIMEOUT_MS`
  (tàn dư kiến trúc job-queue bất đồng bộ đã bỏ, không ai còn tham chiếu)
- `netlify/functions/lib/schemas.js`: `SEASONS`/`OCCASIONS` trùng với
  `constants.js` (giữ `validateAndParse`, vẫn dùng thật qua `resultParser.js`)
- `netlify/functions/lib/geminiService.js → getModelConfig` (tự nhận "backward-compat
  helper", zero caller)
- `netlify/functions/lib/cloudinary.js → uploadImage` (biến thể base64, zero caller —
  giữ `uploadImageFromUrl` đang dùng thật)

**Giữ lại có chủ đích (kèm comment giải thích trong file, không xoá bừa):**
- `netlify/functions/lib/colorTheory.js` — rule-based color/material scorer hoàn
  chỉnh, tiềm năng làm lớp validate/re-rank sau AI (xem audit #5). Effort cao hơn,
  cần quyết định kiến trúc trước.
- `netlify/functions/lib/remoteConfig.js` — server-side Remote Config, tiềm năng
  tune trọng số scoring + A/B test prompt_version không cần redeploy (xem audit #2).
  Effort cao hơn, cần quyết định ai gọi fetchAndActivate/cache ở đâu trước.

**Bonus tìm thêm ngoài audit:**
- `SECURITY_HEADERS` (X-Frame-Options, HSTS, nosniff...) từng chỉ tồn tại trong
  `corsMiddleware.js` đã chết → **chưa từng apply cho bất kỳ response nào**. Đã wire
  vào `withAuth.js` (chokepoint chung mọi handler), áp dụng cùng lúc với CORS headers.
- `logger.js → logAPIError` build sẵn nhưng chưa nơi nào gọi → wire vào catch-block
  của `withAuth.js`. Chỉ log/Sentry cho lỗi 5xx thật sự (internal/unavailable/
  deadline-exceeded) — 4xx (validation, auth, rate-limit) không tốn quota Sentry
  free-tier vì đó là lỗi "bình thường" của user, không phải bug.
- `withAuth.js` import `logWarn` nhưng không dùng — dọn theo.

## Bảo mật ⚠️ (đã flag trong audit, giờ đã wire)

- `inputSanitizer.js → sanitizeObject` (chặn `__proto__`/`constructor`/`prototype`)
  build sẵn nhưng chưa áp dụng ở input nào. Đã wire vào `withAuth.js` ngay chỗ
  unwrap `request.data` — bảo vệ **mọi** handler cùng lúc, một chỗ.
  Lưu ý: đây là guard nông (shallow), chỉ chặn ở top-level object. Nếu sau này có
  chỗ nào deep-merge payload user gửi lên, cần audit lại riêng.

## Chưa động tới — deferred theo đúng khuyến nghị của audit

- **#2 Remote config weights** — effort cao, cần quyết định kiến trúc (đã giữ
  `remoteConfig.js` lại, xem trên).
- **#7 Push notification qua FCM** — cần thêm Service Worker riêng, effort cao.
- **#5 colorTheory làm lớp validate** — effort cao, cần quyết định kiến trúc
  (đã giữ file lại, xem trên).
- **#8 apiKeyService Firestore sync** — chưa xem lại trong lần này.
- Danh sách dài các hàm/constant chết lẻ tẻ còn lại trong DEAD_CODE_AUDIT.md
  (ước ~20 hàm frontend) chưa rà hết từng cái — đã ưu tiên xử lý các mục có
  security/behavior impact rõ ràng trước.

## Việc còn cần làm thủ công (không thể làm từ đây)

- `npm install` rồi build thử (`npm run build`) — môi trường này không có
  network để cài node_modules, mới chỉ syntax-check (`node --check`) từng file
  JS, **chưa chạy build/test thật**. Nên build local trước khi deploy.
- Set `ALLOWED_ORIGINS`, deploy Firestore rules, test SePay webhook idempotency,
  config `TELEGRAM_BOT_TOKEN`/`SENTRY_DSN` — các mục checklist production cũ,
  vẫn còn outstanding, không nằm trong scope của 2 audit lần này.
