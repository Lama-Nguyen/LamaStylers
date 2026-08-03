import { useNavigate } from 'react-router-dom'

const OWNER = {
  name:    'Lama Stylers',
  email:   'support@lamastyle.app',
  updated: '27/07/2026',
}

export default function TermsOfServicePage() {
  const navigate = useNavigate()

  return (
    <div style={s.page}>
      <div style={s.container}>

        <button onClick={() => navigate(-1)} style={s.back}>← Quay lại</button>
        <h1 style={s.title}>Điều Khoản Dịch Vụ</h1>
        <p style={s.subtitle}>Lama Stylers — Cập nhật lần cuối: {OWNER.updated}</p>

        <Section title="1. Chấp Nhận Điều Khoản">
          <p>Bằng cách tạo tài khoản hoặc sử dụng Lama Stylers, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các điều khoản này. Nếu bạn không đồng ý, vui lòng không sử dụng ứng dụng.</p>
          <p>Điều khoản này là thỏa thuận ràng buộc pháp lý giữa bạn và <strong>{OWNER.name}</strong> ("chúng tôi"), được điều chỉnh theo pháp luật Việt Nam.</p>
        </Section>

        <Section title="2. Mô Tả Dịch Vụ">
          <p>Lama Stylers là ứng dụng quản lý tủ đồ thông minh, cung cấp:</p>
          <ul>
            <li>Phân tích trang phục bằng AI (nhận diện loại, màu sắc, chất liệu)</li>
            <li>Gợi ý outfit dựa trên tủ đồ thật của bạn</li>
            <li>AI companion Hạ Vy tư vấn phong cách cá nhân</li>
            <li>Tính năng tách nền ảnh (dành cho người dùng Premium)</li>
          </ul>
          <p>Chúng tôi có quyền thêm, sửa, hoặc ngừng tính năng với thông báo trước <strong>7 ngày</strong> (trừ trường hợp khẩn cấp về kỹ thuật hoặc bảo mật).</p>
        </Section>

        <Section title="3. Tài Khoản Người Dùng">
          <ul>
            <li>Bạn phải từ 13 tuổi trở lên để sử dụng dịch vụ</li>
            <li>Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình</li>
            <li>Mỗi người chỉ được tạo một tài khoản — nghiêm cấm tạo tài khoản để lách giới hạn</li>
            <li>Thông tin đăng ký phải trung thực và chính xác</li>
            <li>Bạn phải thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép vào tài khoản của bạn</li>
          </ul>
        </Section>

        <Section title="4. Quy Tắc Sử Dụng">
          <p>Bạn <strong>KHÔNG</strong> được:</p>
          <ul>
            <li>❌ Tải lên ảnh khiêu dâm, bạo lực, hoặc vi phạm quyền riêng tư của người khác</li>
            <li>❌ Dùng ứng dụng để thu thập dữ liệu của người dùng khác</li>
            <li>❌ Cố ý phá vỡ, tấn công, hoặc khai thác lỗ hổng của hệ thống</li>
            <li>❌ Dùng bot, script, hoặc công cụ tự động để gọi API mà không có phép</li>
            <li>❌ Chia sẻ tài khoản Premium với người khác</li>
            <li>❌ Sao chép, phân phối, hoặc bán lại dịch vụ</li>
          </ul>
          <p>Vi phạm có thể dẫn đến khóa tài khoản ngay lập tức mà không hoàn tiền.</p>
        </Section>

        <Section title="5. Nội Dung Người Dùng">
          <p>Bạn giữ toàn quyền sở hữu ảnh và dữ liệu bạn tải lên. Bằng cách sử dụng dịch vụ, bạn cấp cho chúng tôi quyền <strong>hạn chế, không độc quyền</strong> để:</p>
          <ul>
            <li>Lưu trữ và xử lý ảnh nhằm cung cấp tính năng phân tích AI</li>
            <li>Gửi ảnh tới các API của bên thứ ba (Google Gemini, fal.ai) để xử lý</li>
          </ul>
          <p>Chúng tôi <strong>không</strong> dùng ảnh của bạn để huấn luyện AI hay chia sẻ với bên thứ ba vì mục đích thương mại.</p>
        </Section>

        <Section title="6. Thanh Toán & Hoàn Tiền">
          <SubTitle>6.1 Gói Premium</SubTitle>
          <p>Lama Stylers cung cấp gói Premium trả phí với các tính năng nâng cao. Giá cụ thể hiển thị trong ứng dụng tại thời điểm mua.</p>

          <SubTitle>6.2 Phương thức thanh toán</SubTitle>
          <p>Hiện tại chúng tôi chấp nhận chuyển khoản ngân hàng nội địa Việt Nam qua hệ thống SePay. Tài khoản được nâng cấp tự động sau khi giao dịch được xác minh (thường trong vòng 5 phút).</p>

          <SubTitle>6.3 Hoàn tiền</SubTitle>
          <p>Do đặc thù sản phẩm số:</p>
          <ul>
            <li>Hoàn tiền 100% nếu yêu cầu trong vòng <strong>24 giờ</strong> sau khi mua và chưa sử dụng tính năng Premium</li>
            <li>Sau 24 giờ: xem xét hoàn tiền theo từng trường hợp cụ thể</li>
            <li>Không hoàn tiền nếu tài khoản bị khóa do vi phạm Điều khoản</li>
          </ul>
          <p>Liên hệ: <a href={`mailto:${OWNER.email}`} style={s.link}>{OWNER.email}</a></p>
        </Section>

        <Section title="7. Giới Hạn Trách Nhiệm">
          <p>Dịch vụ được cung cấp "<strong>nguyên trạng</strong>" (as-is). Chúng tôi không đảm bảo:</p>
          <ul>
            <li>Gợi ý của AI luôn chính xác hoặc phù hợp với sở thích cá nhân của bạn</li>
            <li>Dịch vụ hoạt động không gián đoạn 24/7</li>
          </ul>
          <p>Trách nhiệm bồi thường tối đa của chúng tôi không vượt quá số tiền bạn đã trả cho dịch vụ trong 3 tháng gần nhất.</p>
        </Section>

        <Section title="8. Chấm Dứt Dịch Vụ">
          <p>Bạn có thể xóa tài khoản bất kỳ lúc nào trong Cài đặt. Chúng tôi có thể khóa hoặc xóa tài khoản nếu:</p>
          <ul>
            <li>Bạn vi phạm Điều khoản này</li>
            <li>Chúng tôi ngừng cung cấp dịch vụ (thông báo trước 30 ngày)</li>
            <li>Tài khoản không hoạt động hơn 24 tháng liên tiếp</li>
          </ul>
        </Section>

        <Section title="9. Thay Đổi Điều Khoản">
          <p>Chúng tôi có thể cập nhật điều khoản này. Thay đổi quan trọng sẽ được thông báo qua email trước <strong>15 ngày</strong>. Tiếp tục sử dụng sau thời điểm đó đồng nghĩa bạn chấp nhận điều khoản mới.</p>
        </Section>

        <Section title="10. Luật Áp Dụng & Giải Quyết Tranh Chấp">
          <p>Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp được ưu tiên giải quyết thông qua thương lượng. Nếu không thành công, tranh chấp được giải quyết tại Tòa án nhân dân có thẩm quyền tại Việt Nam.</p>
        </Section>

        <Section title="11. Liên Hệ">
          <p>📧 Mọi câu hỏi về Điều khoản: <a href={`mailto:${OWNER.email}`} style={s.link}>{OWNER.email}</a></p>
        </Section>

        <div style={s.footer}>
          <p>© {new Date().getFullYear()} Lama Stylers. Bằng cách sử dụng dịch vụ, bạn đồng ý với các điều khoản trên.</p>
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
      <div>{children}</div>
    </section>
  )
}

function SubTitle({ children }) {
  return <h3 style={{ fontSize: 13, fontWeight: 600, color: '#A598C7', margin: '14px 0 8px' }}>{children}</h3>
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#0F0A1E',
    color: '#C4B5FD',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 14,
    lineHeight: 1.7,
    padding: '20px 16px 60px',
  },
  container: { maxWidth: 680, margin: '0 auto' },
  back: {
    background: 'none', border: 'none',
    color: '#8B5CF6', fontSize: 14,
    cursor: 'pointer', padding: '0 0 16px', display: 'block',
  },
  title: { fontSize: 26, fontWeight: 700, color: '#F8F5FF', margin: '0 0 6px' },
  subtitle: { color: '#6B5E8A', fontSize: 13, margin: '0 0 28px' },
  section: {
    marginBottom: 20,
    background: '#1A1230',
    borderRadius: 16,
    padding: '18px 20px 14px',
    border: '1px solid rgba(139,92,246,0.15)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#C4B5FD',
    margin: '0 0 12px',
    paddingBottom: 10,
    borderBottom: '1px solid rgba(139,92,246,0.15)',
  },
  link: { color: '#8B5CF6' },
  footer: { textAlign: 'center', color: '#6B5E8A', fontSize: 12, marginTop: 32 },
  backBtn: {
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
    color: '#8B5CF6', borderRadius: 50, padding: '10px 24px',
    fontSize: 14, cursor: 'pointer', marginTop: 14,
  },
}
