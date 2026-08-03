# deprecated/

Các file trong thư mục này KHÔNG được dùng trong kiến trúc hiện tại.

## onUserCreated.js

Firebase Auth trigger — tạo document `users/{uid}` khi có user mới đăng ký.

**Tại sao không dùng nữa:**
Kiến trúc hiện tại (v2.2+) tạo document này trực tiếp từ client trong `authService.js`
ngay sau khi đăng ký thành công, không cần Cloud Function.
Dùng Cloud Function yêu cầu Firebase Blaze plan (billing), vi phạm ràng buộc Free Tier.

**Để deploy lại nếu cần** (chỉ khi có Blaze plan):
```bash
cp deprecated/onUserCreated.js functions/src/onUserCreated.js
firebase deploy --only functions:onUserCreated
```
