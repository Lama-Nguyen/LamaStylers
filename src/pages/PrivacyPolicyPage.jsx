import { useNavigate } from 'react-router-dom'

const OWNER = {
  name:    'Lama Stylers',
  address: 'Việt Nam',
  email:   'support@lamastyle.app',
  phone:   '',              // TODO: điền số điện thoại nếu muốn
  updated: '27/07/2026',
}

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div style={s.page}>
      <div style={s.container}>

        {}
        <button onClick={() => navigate(-1)} style={s.back}>← Quay lại</button>
        <h1 style={s.title}>Chính Sách Bảo Mật</h1>
        <p style={s.subtitle}>Lama Stylers — Cập nhật lần cuối: {OWNER.updated}</p>

        {}
        <Section title="1. Thông Tin Chủ Sở Hữu / Đơn Vị Vận Hành">
          <p>Ứng dụng Lama Stylers được sở hữu và vận hành bởi:</p>
          <ul>
            <li><strong>Tên:</strong> {OWNER.name}</li>
            <li><strong>Địa chỉ:</strong> {OWNER.address}</li>
            <li><strong>Email liên hệ:</strong> <a href={`mailto:${OWNER.email}`} style={s.link}>{OWNER.email}</a></li>
            {OWNER.phone && <li><strong>Điện thoại:</strong> {OWNER.phone}</li>}
          </ul>
        </Section>

        {}
        <Section title="2. Dữ Liệu Chúng Tôi Thu Thập">
          <p>Chúng tôi thu thập các loại dữ liệu sau khi bạn sử dụng Lama Stylers:</p>

          <SubTitle>2.1 Dữ liệu bạn cung cấp trực tiếp</SubTitle>
          <ul>
            <li><strong>Thông tin tài khoản:</strong> tên hiển thị, địa chỉ email, mật khẩu (được mã hóa — chúng tôi không đọc được mật khẩu của bạn)</li>
            <li><strong>Ảnh trang phục:</strong> ảnh do bạn chụp hoặc tải lên để phân tích và quản lý tủ đồ</li>
            <li><strong>Số đo cơ thể:</strong> thông tin tùy chọn bạn nhập để nhận gợi ý phù hợp hơn (chiều cao, cân nặng, số đo nếu có)</li>
            <li><strong>Thông tin thanh toán:</strong> mã giao dịch chuyển khoản ngân hàng (chúng tôi xác nhận qua webhook SePay — chúng tôi KHÔNG lưu số thẻ tín dụng, thông tin thẻ, hay tài khoản ngân hàng của bạn)</li>
            <li><strong>Phản hồi & góp ý:</strong> nội dung bạn gửi qua form phản hồi trong ứng dụng</li>
          </ul>

          <SubTitle>2.2 Dữ liệu thu thập tự động</SubTitle>
          <ul>
            <li><strong>Dữ liệu sử dụng:</strong> các tính năng bạn dùng, tần suất truy cập, thời gian trong ứng dụng (qua Firebase Analytics — ẩn danh)</li>
            <li><strong>Thông tin thiết bị:</strong> loại trình duyệt, hệ điều hành, mã định danh phiên đăng nhập (không phải IMEI hay định danh phần cứng cố định)</li>
            <li><strong>Nhật ký lỗi:</strong> thông tin kỹ thuật khi ứng dụng gặp sự cố, để chúng tôi sửa lỗi</li>
          </ul>
        </Section>

        {}
        <Section title="3. Mục Đích Sử Dụng Dữ Liệu">
          <p>Dữ liệu của bạn được dùng cho các mục đích sau:</p>
          <ul>
            <li>✅ <strong>Cung cấp dịch vụ chính:</strong> phân tích trang phục, gợi ý outfit, quản lý tủ đồ thông minh</li>
            <li>✅ <strong>Cá nhân hóa:</strong> Hạ Vy (AI companion) đọc tủ đồ của bạn để đưa ra lời khuyên phù hợp</li>
            <li>✅ <strong>Xác minh thanh toán:</strong> xác nhận giao dịch nâng cấp Premium</li>
            <li>✅ <strong>Cải thiện sản phẩm:</strong> phân tích (ẩn danh) để hiểu tính năng nào được yêu thích</li>
            <li>✅ <strong>Hỗ trợ kỹ thuật:</strong> chẩn đoán và sửa lỗi khi bạn gặp vấn đề</li>
            <li>✅ <strong>Thông báo dịch vụ:</strong> cập nhật tính năng mới, thay đổi chính sách (qua email — bạn có thể từ chối)</li>
            <li>❌ <strong>Quảng cáo bên thứ ba:</strong> KHÔNG. Chúng tôi không dùng dữ liệu của bạn để phục vụ quảng cáo.</li>
          </ul>
        </Section>

        {}
        <Section title="4. Chia Sẻ Dữ Liệu Với Bên Thứ Ba">
          <p>Chúng tôi chia sẻ dữ liệu <strong>hạn chế và có mục đích</strong> với các nhà cung cấp dịch vụ kỹ thuật:</p>
          <ul>
            <li><strong>Google Firebase / Firestore:</strong> lưu trữ dữ liệu người dùng, xác thực đăng nhập</li>
            <li><strong>Cloudinary:</strong> lưu trữ và xử lý ảnh trang phục</li>
            <li><strong>Google Gemini / AI API:</strong> phân tích ảnh và gợi ý outfit (ảnh được gửi để xử lý, không lưu lại ở phía Google theo API policy)</li>
            <li><strong>SePay:</strong> xác minh giao dịch chuyển khoản ngân hàng</li>
            <li><strong>Netlify:</strong> hosting và xử lý API backend</li>
          </ul>
          <p style={{ color: '#F59E0B', marginTop: 12 }}>
            ⚠️ Tất cả các bên trên đều ký cam kết bảo mật dữ liệu (DPA). Chúng tôi <strong>không bán, không cho thuê, không trao đổi</strong> dữ liệu của bạn với bất kỳ bên thứ ba nào vì mục đích thương mại.
          </p>
        </Section>

        {}
        <Section title="5. Thời Gian Lưu Trữ">
          <ul>
            <li><strong>Dữ liệu tài khoản & tủ đồ:</strong> lưu trữ cho đến khi bạn xóa tài khoản</li>
            <li><strong>Ảnh trang phục trên Cloudinary:</strong> bị xóa trong vòng 24 giờ sau khi bạn xóa món đồ hoặc xóa tài khoản</li>
            <li><strong>Nhật ký giao dịch:</strong> lưu tối đa 12 tháng theo yêu cầu kế toán/thuế</li>
            <li><strong>Dữ liệu analytics (ẩn danh):</strong> lưu trữ tối đa 14 tháng theo chính sách Firebase Analytics</li>
            <li><strong>Pending uploads (ảnh chưa lưu):</strong> tự động xóa sau 7 ngày nếu bạn không hoàn thành bước lưu</li>
          </ul>
        </Section>

        {}
        <Section title="6. Quyền Của Bạn">
          <p>Theo Nghị định 13/2023/NĐ-CP và các quy định hiện hành, bạn có các quyền sau:</p>
          <ul>
            <li>✅ <strong>Quyền truy cập:</strong> xem toàn bộ dữ liệu chúng tôi lưu về bạn — liên hệ email để yêu cầu xuất dữ liệu</li>
            <li>✅ <strong>Quyền sửa đổi:</strong> chỉnh sửa thông tin tài khoản, số đo, thông tin trang phục ngay trong ứng dụng</li>
            <li>✅ <strong>Quyền xóa:</strong> xóa từng món đồ, hoặc xóa toàn bộ tài khoản và dữ liệu trong phần Cài đặt → Xóa tài khoản</li>
            <li>✅ <strong>Quyền phản đối:</strong> bạn có thể từ chối nhận email thông báo bằng cách liên hệ chúng tôi</li>
            <li>✅ <strong>Quyền chuyển dữ liệu:</strong> liên hệ email để yêu cầu xuất dữ liệu dạng JSON/CSV</li>
            <li>✅ <strong>Yêu cầu xóa cụ thể:</strong> dùng form trong Cài đặt → Yêu cầu xóa dữ liệu</li>
          </ul>
          <p>Chúng tôi sẽ phản hồi yêu cầu trong vòng <strong>30 ngày làm việc</strong>.</p>
        </Section>

        {}
        <Section title="7. Biện Pháp Bảo Mật">
          <ul>
            <li>Dữ liệu truyền tải được mã hóa HTTPS/TLS</li>
            <li>Mật khẩu được mã hóa một chiều bởi Firebase Authentication (bcrypt) — chúng tôi không thể đọc mật khẩu của bạn</li>
            <li>Truy cập Firestore được kiểm soát bởi Security Rules — người dùng chỉ đọc/ghi được dữ liệu của chính mình</li>
            <li>API keys và credentials KHÔNG nằm trong code frontend (lưu trong Netlify Environment Variables)</li>
          </ul>
        </Section>

        {}
        <Section title="8. Cookie & Local Storage">
          <p>Lama Stylers là Progressive Web App (PWA). Chúng tôi sử dụng:</p>
          <ul>
            <li><strong>Firebase Auth Token:</strong> lưu trong trình duyệt để duy trì đăng nhập (xóa khi bạn đăng xuất)</li>
            <li><strong>Service Worker Cache:</strong> lưu tài nguyên ứng dụng để hoạt động offline — không chứa dữ liệu cá nhân</li>
          </ul>
          <p>Chúng tôi <strong>không</strong> sử dụng cookie theo dõi quảng cáo hoặc cookie của bên thứ ba.</p>
        </Section>

        {}
        <Section title="9. Trẻ Em">
          <p>Lama Stylers <strong>không dành cho người dưới 13 tuổi</strong>. Chúng tôi không cố ý thu thập dữ liệu của trẻ em. Nếu bạn tin rằng con bạn đã cung cấp dữ liệu cho chúng tôi, vui lòng liên hệ ngay để chúng tôi xóa.</p>
        </Section>

        {}
        <Section title="10. Liên Hệ & Khiếu Nại">
          <p>Mọi thắc mắc về chính sách bảo mật, yêu cầu truy cập hoặc xóa dữ liệu:</p>
          <ul>
            <li>📧 Email: <a href={`mailto:${OWNER.email}`} style={s.link}>{OWNER.email}</a></li>
            <li>⏱ Thời gian phản hồi: trong vòng 30 ngày làm việc</li>
          </ul>
          <p>Nếu bạn không hài lòng với cách chúng tôi xử lý yêu cầu, bạn có quyền khiếu nại lên Bộ Thông tin và Truyền thông Việt Nam.</p>
        </Section>

        <div style={s.footer}>
          <p>© {new Date().getFullYear()} Lama Stylers. Chính sách này có thể thay đổi — phiên bản mới nhất luôn có tại địa chỉ này.</p>
          <button onClick={() => navigate(-1)} style={s.backBtn}>← Quay lại ứng dụng</button>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      <div style={s.sectionBody}>{children}</div>
    </section>
  )
}

function SubTitle({ children }) {
  return <h3 style={s.subTitle}>{children}</h3>
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#0F0A1E',
    color: '#F8F5FF',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px 16px 60px',
  },
  container: {
    maxWidth: 680,
    margin: '0 auto',
  },
  back: {
    background: 'none',
    border: 'none',
    color: '#8B5CF6',
    fontSize: 14,
    cursor: 'pointer',
    padding: '0 0 16px',
    display: 'block',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#F8F5FF',
    margin: '0 0 6px',
  },
  subtitle: {
    color: '#6B5E8A',
    fontSize: 13,
    margin: '0 0 28px',
  },
  section: {
    marginBottom: 28,
    background: '#1A1230',
    borderRadius: 16,
    padding: '20px 20px 16px',
    border: '1px solid rgba(139,92,246,0.15)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#C4B5FD',
    margin: '0 0 14px',
    paddingBottom: 10,
    borderBottom: '1px solid rgba(139,92,246,0.15)',
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#C4B5FD',
    '& ul': { paddingLeft: 20 },
    '& li': { marginBottom: 8 },
    '& p':  { marginTop: 0, marginBottom: 10 },
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#A598C7',
    margin: '14px 0 8px',
  },
  link: { color: '#8B5CF6' },
  footer: {
    textAlign: 'center',
    color: '#6B5E8A',
    fontSize: 12,
    marginTop: 32,
  },
  backBtn: {
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
    color: '#8B5CF6',
    borderRadius: 50,
    padding: '10px 24px',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 14,
  },
}
