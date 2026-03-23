import Image from "next/image";
import Link from "next/link";
import { Noto_Sans_KR } from "next/font/google";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

const heroTitleFont = Noto_Sans_KR({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700", "800"],
});

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f8fafb] selection:bg-[color:var(--primary)]/20">
      <SiteHeader currentPath="/" />

      <section className="relative isolate flex min-h-[50vh] w-full flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-20 sm:px-8">
        {/* Full Wide Background Image */}
        <div className="absolute inset-0 -z-20 w-full h-full bg-[#f8fafb]">
          <Image
            src="/hero-learning-space.svg"
            alt="Educational hero background"
            fill
            className="object-cover opacity-85 mix-blend-multiply"
            priority
          />
        </div>
        
        {/* Soft Background Gradient like reference */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/10 via-white/50 to-[#f8fafb] pointer-events-none" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-[1000px] -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(195,234,249,0.5)_0%,transparent_70%)] pointer-events-none" />

        {/* Badge */}
        <div className="mb-8 mt-8 inline-flex items-center gap-2 rounded-full bg-[#dbebef]/80 px-3.5 py-1.5 transition-colors backdrop-blur-sm hover:bg-[#dbebef] md:mt-10">
          <CalendarDays className="h-[13px] w-[13px] text-[#4d7281]" />
          <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#4d7281]">
            2026학년도 1학기
          </span>
        </div>

        {/* Title */}
        <div className="mb-6 flex max-w-[46rem] flex-col items-center">
          <p className="mb-4 inline-flex items-center gap-3 font-body text-[0.78rem] font-semibold tracking-[0.18em] text-[#5b7481] sm:text-[0.82rem]">
            <span className="h-px w-7 bg-[#9ab3be]" />
            여수 신월초등학교
            <span className="h-px w-7 bg-[#9ab3be]" />
          </p>
          <h1
            className={`${heroTitleFont.className} text-balance text-center text-[2.45rem] font-bold leading-[1.1] tracking-[-0.035em] text-[#223038] sm:text-[3.15rem] md:text-[4.05rem]`}
          >
            <span className="block whitespace-nowrap text-[#1f2d34]">
              학부모상담 신청 프로그램
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-readable mx-auto mb-10 mt-1 max-w-[31rem] text-center font-body text-[15.5px] font-medium leading-[1.75] text-[#566e7a] sm:text-[16px]">
          선생님과의 진솔한 대화로 아이의 더 나은 내일을 만들어갑니다. 원하시는 상담 일정을 온라인으로
          손쉽게 확정하세요.
        </p>

        {/* Buttons */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" style={{ color: '#ffffff' }} className="h-[52px] rounded-full bg-[color:var(--primary)] px-8 text-[15.5px] font-bold text-[#FFFFFF] transition-all shadow-md hover:-translate-y-0.5 hover:bg-[color:var(--primary-dim)] hover:shadow-lg">
            <Link href="/auth" style={{ color: '#ffffff' }}>
              상담 예약 시작하기
              <ArrowRight className="ml-2 h-[18px] w-[18px]" style={{ color: '#ffffff' }} />
            </Link>
          </Button>
          <Button asChild variant="soft" size="lg" className="h-[52px] rounded-full border border-gray-200 bg-white px-8 text-[15.5px] font-bold text-[color:var(--primary)] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md">
            <Link href="/dashboard">
              예약 내역 조회
            </Link>
          </Button>
        </div>
      </section>

      {/* Grid Features Layout */}
      <section className="relative z-10 mx-auto w-full max-w-[1040px] px-6 pb-24 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          
          {/* Card 1: Collaborative Growth (Left, spans 2 cols) */}
          <div className="col-span-1 flex flex-col overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] md:col-span-2 md:flex-row">
             <div className="flex w-full flex-col justify-between pb-8 pr-0 font-body md:w-[48%] md:pb-0 md:pr-10">
               <div>
                 <h3 className="mb-4 font-display text-[22px] font-bold text-[#222f36] tracking-tight">
                   소중한 우리 아이의 올바른 성장을 위한 첫 상담
                 </h3>
                 <p className="text-readable font-body text-[14.5px] font-medium leading-[1.7] text-[#6b828e]">
                   선생님과의 첫 대화를 통해 아이의 학업 성취와 정서적 건강을 함께 고민하고, 올바른 성장을 지원하는 소중하고 유의미한 시간을 가져보세요.
                 </p>
               </div>
             </div>
             
             <div className="mt-4 w-full overflow-hidden rounded-[1.25rem] md:mt-0 md:w-[52%] h-full flex flex-col">
               <div className="relative aspect-[4/3] w-full min-h-[220px] bg-[#e8f1f5] shrink-0">
                 <Image 
                   src="/korean_consultation_card.png" 
                   fill 
                   alt="Collaborative Room" 
                   className="object-cover"
                   sizes="(max-width: 768px) 100vw, 33vw"
                 />
               </div>
             </div>
          </div>

          {/* Card 2: Secure & Private (Right, 1 col) */}
          <div className="col-span-1 flex flex-col justify-between rounded-[2rem] bg-[color:var(--primary)] p-8 shadow-[0_8px_30px_-12px_rgba(26,95,122,0.3)] hover:bg-[color:var(--primary-dim)] transition-colors">
            <div className="mb-12 flex h-fit w-fit items-center justify-center">
               <ShieldCheck className="h-7 w-7 text-[#FFFFFF]" strokeWidth={2.5} />
            </div>
            <div>
               <h3 className="mb-3 font-display text-[22px] font-bold tracking-tight text-[#FFFFFF]">강력한 정보 보호</h3>
               <p className="text-readable font-body text-[14.5px] font-medium leading-[1.7] text-[#a0c7d4]">
                 입력하신 연락처 및 예약 내역은 최고 수준의 보안으로 유지되며, 상담이 종료된 직후 모두 폐기됩니다.
               </p>
            </div>
          </div>

          {/* Card 3: 15m Standard Sessions (Bottom Left, 1 col) */}
          <div className="col-span-1 flex flex-col justify-center rounded-[2rem] bg-[#c1ebf9] p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] hover:bg-[#b5e6f6] transition-colors">
            <div>
              <h2 className="mb-1 font-display text-[44px] font-extrabold tracking-tight text-[#1a3845] md:text-[50px]">20분</h2>
              <h3 className="mb-2.5 font-display text-[17px] font-bold text-[#1e4554]">밀도 있는 집중 상담</h3>
              <p className="text-readable font-body text-[14.5px] font-medium leading-[1.65] text-[#4d7f91]">
                가장 핵심적인 학업 이야기를 나누고 구체적인 계획을 수립할 수 있도록 최적화된 시간을 제공합니다.
              </p>
            </div>
          </div>

          {/* Card 4: Ready to start? (Bottom Right, 2 cols) */}
          <div className="relative isolate col-span-1 flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#f5f7f9] p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.04)] md:col-span-2 md:flex-row md:items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(92,115,128,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(92,115,128,0.2)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_right,transparent_4%,rgba(0,0,0,0.2)_36%,rgba(0,0,0,0.88)_68%,black_100%)]"
            />
            <div className="relative z-10 w-full md:w-[50%] md:pr-10">
               <h3 className="mb-2 font-display text-[22px] font-bold tracking-tight text-[#222f36]">복잡한 절차 없이 간편하게</h3>
               <p className="text-readable font-body text-[14.5px] font-medium leading-[1.65] text-[#6b828e]">
                 PC와 모바일 언제 어디서든 접속하여 실시간 빈자리를 확인하고, 가장 편리한 일정을 직접 선택하세요.
               </p>
            </div>
            <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 md:mt-0 md:w-[50%] md:justify-end">
              {['초등 1~6학년'].map((grade) => (
                 <span key={grade} className="flex h-[36px] items-center justify-center rounded-full bg-[#dee5e8] px-4 font-display text-[13px] font-bold tracking-wide text-[#5c7380] hover:bg-[#d5dde1] transition-colors cursor-default">
                   {grade}
                 </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
