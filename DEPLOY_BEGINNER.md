# 🚀 Hướng dẫn Deploy — Dành cho người mới bắt đầu

Hướng dẫn này giả định bạn **chưa từng làm việc này bao giờ**. Mọi bước đều
giải thích chi tiết, kể cả cách mở Terminal. Làm đúng theo thứ tự từ trên
xuống, đừng nhảy bước.

**Thời gian:** khoảng 45-60 phút cho lần đầu tiên.

**Cần chuẩn bị trước:**
- 1 máy tính (Windows hoặc Mac đều được)
- 1 tài khoản Google (Gmail bình thường là được)
- Kết nối internet ổn định

---

## Mục lục

1. [Cài đặt phần mềm cần thiết](#phần-1-cài-đặt-phần-mềm-cần-thiết)
2. [Mở Terminal (dòng lệnh)](#phần-2-mở-terminal-dòng-lệnh)
3. [Tạo project Firebase](#phần-3-tạo-project-firebase)
4. [Lấy thông tin cấu hình](#phần-4-lấy-thông-tin-cấu-hình)
5. [Chuẩn bị code](#phần-5-chuẩn-bị-code)
6. [Kết nối với Firebase](#phần-6-kết-nối-với-firebase)
7. [Bật tính năng AI](#phần-7-bật-tính-năng-ai)
8. [Cài đặt và Deploy](#phần-8-cài-đặt-và-deploy)
9. [Kiểm tra app đã chạy](#phần-9-kiểm-tra-app-đã-chạy)
10. [Xử lý lỗi thường gặp](#phần-10-xử-lý-lỗi-thường-gặp)

---

## Phần 1: Cài đặt phần mềm cần thiết

Bạn cần cài 2 phần mềm. Chỉ cài 1 lần duy nhất trên máy.

### 1.1. Cài Node.js

Node.js là phần mềm chạy code, bắt buộc phải có.

1. Vào trang: **https://nodejs.org**
2. Bạn sẽ thấy 2 nút tải — bấm vào nút ghi **"LTS"** (bản ổn định, không bấm bản "Current")
3. Tải xong, mở file vừa tải lên, bấm **Next** liên tục đến khi cài xong (giữ nguyên mọi lựa chọn mặc định)
4. Khởi động lại máy tính sau khi cài xong (bước này quan trọng, đừng bỏ qua)

### 1.2. Cài Git (chỉ Windows cần, Mac thường có sẵn)

Nếu dùng Windows:
1. Vào: **https://git-scm.com/download/win**
2. Tải bản 64-bit, cài đặt như bình thường (Next liên tục, giữ mặc định)

---

## Phần 2: Mở Terminal (dòng lệnh)

Terminal là nơi bạn gõ lệnh thay vì bấm chuột. Đừng lo, mọi lệnh trong hướng
dẫn này bạn chỉ cần copy-paste, không cần tự gõ.

### Trên Windows:
- Bấm nút **Start** (biểu tượng Windows góc dưới trái)
- Gõ chữ `cmd`
- Bấm vào **"Command Prompt"** khi nó hiện ra

### Trên Mac:
- Bấm tổ hợp phím **Cmd + Space** (mở Spotlight)
- Gõ chữ `terminal`
- Bấm Enter

Một cửa sổ đen (hoặc trắng) hiện ra với con trỏ nhấp nháy — đó là Terminal.
Từ giờ, mọi chỗ hướng dẫn ghi **"chạy lệnh sau"** nghĩa là: copy dòng lệnh
đó, dán vào Terminal (Windows: chuột phải để dán / Mac: Cmd+V), rồi bấm
**Enter**.

**Kiểm tra Node.js đã cài đúng chưa** — chạy lệnh sau:

```bash
node --version
```

Nếu thấy hiện ra dạng `v20.x.x` hoặc `v22.x.x` — thành công, đi tiếp Phần 3.
Nếu báo lỗi "command not found" — quay lại Phần 1.1, cài lại Node.js, nhớ
khởi động lại máy.

---

## Phần 3: Tạo project Firebase

Firebase là dịch vụ miễn phí của Google để lưu trữ và chạy app này.

### 3.1. Tạo tài khoản / đăng nhập

1. Vào: **https://console.firebase.google.com**
2. Đăng nhập bằng tài khoản Google của bạn

### 3.2. Tạo project mới

1. Bấm nút **"Add project"** (hoặc "Tạo dự án")
2. Đặt tên project — ví dụ `lama-stylers` (chỉ chữ thường, số, dấu gạch ngang, không dấu cách, không tiếng Việt có dấu)
3. Bấm **Continue**
4. Ở màn hình hỏi về Google Analytics — bạn có thể **tắt** (không bắt buộc), bấm **Continue** rồi **Create project**
5. Đợi khoảng 30 giây, bấm **Continue** khi xong

Bạn đang ở trang tổng quan (Dashboard) của project — giữ tab này mở, sẽ quay lại nhiều lần.

### 3.3. Bật các dịch vụ cần thiết

Ở menu bên trái, có 1 cột các icon — bạn sẽ bật lần lượt 4 dịch vụ sau:

**a) Authentication (đăng nhập)**
1. Menu trái → **Build** → **Authentication**
2. Bấm **Get started**
3. Trong danh sách "Sign-in method", bấm vào **Email/Password** → bật công tắc **Enable** → **Save**
4. Bấm vào **Google** → bật công tắc **Enable** → chọn email hỗ trợ (email của bạn) → **Save**

**b) Firestore Database (nơi lưu dữ liệu)**
1. Menu trái → **Build** → **Firestore Database**
2. Bấm **Create database**
3. Chọn **Start in production mode** → **Next**
4. Ở mục chọn vùng (Location), chọn **asia-southeast1 (Singapore)** — gần Việt Nam nhất
5. Bấm **Enable**

**c) Storage (nơi lưu ảnh)**
1. Menu trái → **Build** → **Storage**
2. Bấm **Get started**
3. Bấm **Next** → chọn cùng vùng **asia-southeast1** như trên → **Done**

**d) Functions (chạy AI) — cần nâng cấp gói**
1. Menu trái → **Build** → **Functions**
2. Nó sẽ yêu cầu nâng cấp lên gói **Blaze** (trả theo mức dùng)
3. Bấm **Upgrade project** → làm theo hướng dẫn nhập thẻ thanh toán

> ⚠️ **Về việc nhập thẻ:** Gói Blaze có mức miễn phí hàng tháng khá rộng
> (2 triệu lượt gọi Functions/tháng, đủ dùng cho app cá nhân/nhóm nhỏ).
> Bạn **chỉ bị trừ tiền nếu vượt mức miễn phí** đó. Google yêu cầu thẻ để
> xác minh, không tự động trừ tiền ngay.

---

## Phần 4: Lấy thông tin cấu hình

1. Ở góc trên bên trái, bấm vào biểu tượng **⚙️ (bánh răng)** cạnh chữ "Project Overview" → chọn **Project settings**
2. Cuộn xuống phần **"Your apps"**
3. Bấm vào icon **`</>`** (biểu tượng Web)
4. Đặt tên app bất kỳ, ví dụ `lama-stylers-web` → bấm **Register app**
5. Bạn sẽ thấy 1 đoạn code như sau — **đừng đóng trang này**, sẽ quay lại copy:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "lama-stylers.firebaseapp.com",
  projectId: "lama-stylers",
  storageBucket: "lama-stylers.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123"
};
```

Ghi nhớ 6 giá trị này (hoặc mở sẵn tab này để lát dán vào), rồi bấm
**Continue to console** để đóng hướng dẫn.

---

## Phần 5: Chuẩn bị code

### 5.1. Giải nén file zip

1. Tìm file `lama-stylers-complete.zip` bạn đã tải về
2. Chuột phải → **Extract All** (Windows) hoặc double-click (Mac) để giải nén
3. Bạn sẽ có 1 thư mục tên `final` — đổi tên thư mục này thành `lama-stylers` cho dễ nhớ (không bắt buộc)

### 5.2. Di chuyển Terminal vào đúng thư mục

Đây là bước hay bị lúng túng nhất với người mới. Cách dễ nhất:

**Windows:**
1. Mở thư mục `lama-stylers` vừa giải nén bằng File Explorer
2. Bấm vào thanh địa chỉ phía trên (chỗ hiện đường dẫn thư mục)
3. Gõ đè chữ `cmd` rồi Enter — 1 cửa sổ Terminal mới mở ra, **đã tự động đứng đúng trong thư mục này**

**Mac:**
1. Mở Terminal như Phần 2
2. Gõ `cd ` (có dấu cách sau chữ cd), **đừng bấm Enter vội**
3. Kéo thả thư mục `lama-stylers` từ Finder thả thẳng vào cửa sổ Terminal — đường dẫn sẽ tự động điền vào
4. Bấm Enter

**Kiểm tra đã đúng thư mục chưa** — chạy lệnh:
```bash
ls
```
Nếu thấy hiện ra danh sách có chữ `package.json`, `src`, `functions` — đúng rồi, đi tiếp. Nếu không thấy, bạn đang sai thư mục, thử lại bước trên.

### 5.3. Tạo file cấu hình `.env.local`

Chạy lệnh sau trong Terminal (đang đứng đúng thư mục từ bước trên):

**Windows:**
```bash
copy .env.local.example .env.local
```

**Mac:**
```bash
cp .env.local.example .env.local
```

### 5.4. Mở file `.env.local` để điền thông tin

1. Mở thư mục `lama-stylers` bằng File Explorer/Finder
2. Tìm file `.env.local` (nếu không thấy, cần bật hiện "file ẩn" — Windows: View → Hidden items; Mac: Cmd+Shift+.)
3. Mở bằng **Notepad** (Windows) hoặc **TextEdit** (Mac) — chuột phải → Open with

Bạn sẽ thấy nội dung có các dòng như:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Điền giá trị từ **Phần 4** vào sau dấu `=` của từng dòng tương ứng, ví dụ:
```
VITE_FIREBASE_API_KEY=AIzaSyABC123xyz...
VITE_FIREBASE_AUTH_DOMAIN=lama-stylers.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lama-stylers
VITE_FIREBASE_STORAGE_BUCKET=lama-stylers.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

**Lưu ý:** không có dấu cách, không có dấu ngoặc kép quanh giá trị.

**Lưu file lại** (Ctrl+S hoặc Cmd+S), đóng Notepad/TextEdit.

---

## Phần 6: Kết nối với Firebase

Quay lại Terminal (vẫn đứng trong thư mục `lama-stylers`).

### 6.1. Cài công cụ Firebase

```bash
npm install -g firebase-tools
```

Lệnh này chạy khoảng 1-2 phút, sẽ hiện nhiều dòng chữ chạy qua — bình thường, đợi đến khi con trỏ nhấp nháy trở lại là xong.

### 6.2. Đăng nhập Firebase

```bash
firebase login
```

Trình duyệt sẽ tự mở ra, chọn tài khoản Google bạn đã dùng tạo project ở Phần 3, bấm **Allow**. Quay lại Terminal, sẽ thấy dòng "Success!".

### 6.3. Kết nối code với project vừa tạo

```bash
firebase use --add
```

Terminal sẽ hỏi bạn chọn project — dùng phím mũi tên chọn đúng project bạn tạo ở Phần 3 (ví dụ `lama-stylers`), bấm Enter. Nó hỏi tiếp "alias" — gõ `default` rồi Enter.

### 6.4. Bật App Check (bảo vệ tính năng AI)

1. Quay lại tab trình duyệt Firebase Console
2. Menu trái → tìm mục **App Check** (có thể nằm trong "Build" hoặc mục riêng)
3. Bấm vào app Web bạn tạo ở Phần 4
4. Chọn **reCAPTCHA v3** → **Save**
5. Nó sẽ cho bạn 1 **Site Key** — copy giá trị này
6. Mở lại file `.env.local` (như Phần 5.4), tìm dòng `VITE_RECAPTCHA_SITE_KEY=`, dán giá trị vào sau dấu `=`, lưu lại

---

## Phần 7: Bật tính năng AI

App này dùng AI của Google (Gemini) để phân tích quần áo và tạo outfit — cần 1 API key riêng, **miễn phí**.

### 7.1. Lấy Gemini API Key

1. Vào: **https://aistudio.google.com/apikey**
2. Đăng nhập cùng tài khoản Google
3. Bấm **Create API key**
4. Copy đoạn key hiện ra (dạng `AIzaSy...`)

### 7.2. Gắn key vào project

Quay lại Terminal, chạy:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Terminal sẽ hỏi bạn **dán giá trị secret** — dán API key vừa copy vào, bấm Enter. Nó hỏi xác nhận — gõ `Y` rồi Enter.

---

## Phần 8: Cài đặt và Deploy

### 8.1. Cài các thư viện cần thiết

Chạy lần lượt 2 lệnh sau (mỗi lệnh mất 1-3 phút, đợi xong mới chạy lệnh tiếp theo):

```bash
npm install
```

Đợi xong, chạy tiếp:

```bash
cd functions
npm install
cd ..
```

### 8.2. Build và Deploy

```bash
npm run build
```

Đợi xong (thường 30-60 giây), chạy lệnh cuối cùng:

```bash
firebase deploy
```

Lệnh này mất khoảng **3-8 phút** — đây là bước lâu nhất, cứ để Terminal chạy, đừng tắt cửa sổ.

Khi xong, bạn sẽ thấy dòng chữ dạng:
```
✔ Deploy complete!
Hosting URL: https://lama-stylers.web.app
```

**Đó chính là link app của bạn** — copy link này, mở bằng trình duyệt.

---

## Phần 9: Kiểm tra app đã chạy

Mở link vừa nhận được, thử lần lượt:

- [ ] Bấm **Đăng ký** → tạo tài khoản mới bằng email → không báo lỗi
- [ ] Vào tab **Tủ đồ** → bấm nút **➕** → chọn 1 ảnh quần áo bất kỳ trên máy → upload → AI phân tích ra loại/màu quần áo
- [ ] Vào tab **Phối đồ** → bấm **✨ Tạo outfit mới** → sau vài giây ra kết quả outfit
- [ ] Bấm icon tròn (Hạ Vy) ở góc dưới màn hình → gõ thử "gợi ý đồ đi chơi" → có trả lời

Nếu cả 4 việc trên đều chạy được — **chúc mừng, bạn đã deploy thành công!**

---

## Phần 10: Xử lý lỗi thường gặp

### "command not found" khi gõ `node`, `npm`, hoặc `firebase`
→ Phần mềm chưa cài đúng. Quay lại Phần 1, cài lại Node.js, khởi động lại máy.

### Upload ảnh xong nhưng không thấy AI phân tích, hoặc báo lỗi đỏ
→ Thường do quên Phần 7 (chưa set `GEMINI_API_KEY`) hoặc Phần 6.4 (chưa bật App Check). Kiểm tra lại 2 phần này.

### `firebase deploy` báo lỗi "Error: Not in a Firebase app directory"
→ Terminal đang không đứng đúng thư mục `lama-stylers`. Làm lại Phần 5.2.

### `firebase deploy` báo lỗi liên quan "Blaze plan"
→ Chưa nâng cấp gói ở Phần 3.3 mục (d). Quay lại Firebase Console, mục Functions, nâng cấp Blaze.

### Trang web mở lên trắng trơn, không hiện gì
→ Mở DevTools bằng phím **F12**, bấm tab **Console**, xem dòng chữ đỏ đầu tiên — thường sẽ ghi rõ thiếu biến nào trong `.env.local`. Kiểm tra lại Phần 5.4, đảm bảo đã dán đủ 6 giá trị, không có dấu cách thừa.

### Muốn sửa code rồi deploy lại
Chạy lại 2 lệnh cuối của Phần 8.2:
```bash
npm run build
firebase deploy
```

---

## Cần thêm tính năng nâng cao?

Hướng dẫn này chỉ setup phần **cốt lõi** (đăng nhập, tủ đồ, tạo outfit, Hạ
Vy). Các tính năng khác (thanh toán Premium qua SePay, gửi email, tách nền
ảnh) là **tùy chọn** — app chạy tốt mà không cần chúng. Nếu muốn bật thêm,
xem phần cuối file `.env.local.example` hoặc hỏi lại để được hướng dẫn
riêng cho từng tính năng.
