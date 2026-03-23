export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1180px] px-5 pb-10 text-sm text-[color:var(--text-soft)] sm:px-8">
      <div className="flex flex-col gap-4 border-t border-transparent pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-readable font-display text-xl text-[color:var(--text-strong)]">여수신월초등학교 상담 포털</p>
          <p className="text-readable mt-2 leading-relaxed">
            담당 교사: 박준효 | 이메일: <a href="mailto:jhjhpark0800@gmail.com" className="hover:underline">jhjhpark0800@gmail.com</a>
          </p>
          <p className="text-readable mt-1">© 2026 여수신월초등학교. 모든 권리 보유.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>개인정보 처리방침</span>
          <span>이용약관</span>
          <span>상담 일정</span>
          <span>학교 문의</span>
        </div>
      </div>
    </footer>
  );
}
