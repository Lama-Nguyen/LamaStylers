# CHANGELOG — Upload Refactor

> **Deprecated** — Tài liệu lịch sử (07/2026). Xem `DEPLOY.md` cho kiến trúc hiện tại.

**Tóm tắt:** Upload ảnh quần áo được thực hiện hoàn toàn client-side (Cloudinary Direct Upload).
Server không nhận binary payload — chỉ generate signed URL (`getCloudinarySignature`).

Flow hiện tại: `client resize (512px)` → `getCloudinarySignature` → `upload thẳng lên Cloudinary` → `analyzeClothing(publicId)`
