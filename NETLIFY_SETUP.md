# Netlify setup checklist — LamaStylers

- [ ] Repo GitHub: `lamepzaipro-spec/LamaStylers` (branch `main`)
- [ ] Netlify Import from GitHub → site tạo xong
- [ ] Env server: GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT, ALLOWED_ORIGINS, CLOUDINARY_*
- [ ] Env build (Vite): VITE_FIREBASE_*, VITE_NETLIFY_API_BASE
- [ ] Redeploy sau khi set env
- [ ] `firebase deploy --only firestore` (rules + indexes)
- [ ] `curl .../api/health` hoặc `/.netlify/functions/health` → ok
- [ ] (Tuỳ chọn) GitHub Actions secrets: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID
- [ ] (Tuỳ chọn) SePay webhook URL: `https://<site>.netlify.app/.netlify/functions/sepayWebhook`
