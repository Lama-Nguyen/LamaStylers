# Tiến độ chuyển đổi Firebase Functions -> Vercel

## ✅ Hoàn thành
### Backend (18 file trong /home/claude/work/vercel-api/, syntax sạch 100%)
- lib/: firebaseAdmin.js, withAuth.js, rateLimits.js, getRawBody.js,
  dateUtils.js, colorTheory.js, wardrobeFilter.js, aiProviderChain.js
- api/: analyzeClothing, generateOutfits, getGenerationCreditsStatus,
  removeBackground, havySuggestOutfit, enhanceClothingAnalysis,
  generateStyleInsight, deleteAccountData, sendOutfitCreatedEmail,
  sepayWebhook, cron/cleanupOrphanedFiles
- Cấu hình: package.json, vercel.json, .gitignore

### Client (12 file trong project gốc /home/claude/work/project/lama-stylers/,
### syntax sạch 100%)
- MỚI: src/services/vercelApi.js (thay thế toàn bộ httpsCallable)
- SỬA: src/services/firebase.js (bỏ getFunctions, sửa comment AppCheck)
- SỬA: authService.js, backgroundRemovalService.js, emailService.js,
  notificationService.js, outfitService.js, wardrobeService.js,
  AdManager.jsx, HaVyCompanion.jsx, AddClothingModal.jsx,
  StyleAnalysisPage.jsx
- SỬA: .env.local.example (thêm VITE_VERCEL_API_BASE, xoá hướng dẫn
  firebase functions:secrets:set cũ)
- Đã xác nhận: 0 chỗ còn dùng httpsCallable/firebase.functions trong code
  thật (chỉ còn trong comment mô tả)

## ⏳ Còn lại — DUY NHẤT 1 việc
Viết DEPLOY_VERCEL.md — tài liệu triển khai đầy đủ cho newbie, cần có:
1. Tổng quan kiến trúc mới (cái gì ở đâu)
2. Chuẩn bị: tài khoản Firebase (nếu chưa có), tài khoản Vercel, Node.js,
   Git
3. Bước 1: Lấy Firebase Service Account JSON (chi tiết từng click)
4. Bước 2: Bật Vision API trên Google Cloud Console (chi tiết)
5. Bước 3: Cài Vercel CLI, đăng nhập
6. Bước 4: Deploy backend (thư mục vercel-api) lần đầu
7. Bước 5: Set TOÀN BỘ Environment Variables trên Vercel (liệt kê đủ:
   FIREBASE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET, GEMINI_API_KEY,
   OPENROUTER_API_KEY, REPLICATE_API_KEY, FAL_API_KEY, RESEND_API_KEY,
   EMAIL_FROM, SEPAY_API_KEY, SEPAY_WEBHOOK_SECRET, CRON_SECRET,
   ALLOWED_ORIGIN)
8. Bước 6: Set CRON_SECRET và verify cron hoạt động
9. Bước 7: Cập nhật SePay dashboard trỏ webhook URL mới
10. Bước 8: Set VITE_VERCEL_API_BASE trong .env.local của client, build
    lại, deploy client lên Firebase Hosting (giữ nguyên) hoặc nơi khác
11. Bước 9: Test từng endpoint sau khi deploy (checklist cụ thể)
12. Bước 10: Dọn dẹp — xoá/tắt Cloud Functions cũ trên Firebase để tránh
    nhầm lẫn/phí phát sinh nếu vô tình kích hoạt lại Blaze
13. Troubleshooting — các lỗi thường gặp và cách sửa
14. Rollback plan nếu có sự cố nghiêm trọng

---

## Cập nhật tiếp theo: Vercel → Netlify (xem CHANGELOG_NETLIFY_MIGRATION.md)

Sau giai đoạn chuyển đổi Firebase Functions → Vercel ghi lại ở trên, project
tiếp tục migrate thêm 1 lần nữa: **Vercel → Netlify**. Toàn bộ nội dung phía
trên (thư mục `vercel-api/`, `vercel.json`, `src/services/vercelApi.js`,
`DEPLOY_VERCEL.md`) đã KHÔNG CÒN được dùng kể từ đợt migrate này — giữ lại
nguyên văn phía trên chỉ vì mục đích lịch sử, không phản ánh trạng thái hiện
tại của hệ thống.

Xem `CHANGELOG_NETLIFY_MIGRATION.md` ở thư mục gốc để biết chi tiết đầy đủ
đợt migrate Netlify, bao gồm các phần CHƯA HOÀN TẤT cần làm tiếp (đặc biệt:
`src/services/vercelApi.js` cần được viết lại/đổi tên thành `callApi.js`
nhưng bị thiếu source lúc thực hiện, xem mục "Việc CẦN LÀM TIẾP" trong file
đó).
