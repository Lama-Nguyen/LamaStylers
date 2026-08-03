# CHANGELOG — Netlify Migration

> **Deprecated** — Tài liệu này mô tả quá trình migrate từ Vercel sang Netlify (hoàn tất 07/2026).
> Kiến trúc hiện tại được mô tả trong `DEPLOY.md`.

**Kết quả cuối cùng (v2.2+):**

| Thành phần | Giải pháp |
|------------|-----------|
| Serverless API | Netlify Functions (`netlify/functions/`) |
| Database | Firebase Firestore (Spark — free) |
| Auth | Firebase Auth (Spark — free) |
| File storage | Cloudinary (free) |
| AI | Gemini Flash via AI Studio (free) |
| Cron jobs | Cloudflare Workers (`cf-workers/`) |
| Background Functions | **Không dùng** — sync AI call thay thế |
| Firebase Cloud Functions | **Không dùng** — client-side user doc creation |

**Thư mục `api/` cũ (Vercel):** đã deprecated, giữ lại làm tham khảo, không deploy.
