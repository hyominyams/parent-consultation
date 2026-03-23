export const CONSENT_VERSION = "2026-spring-v2";

export const CONSENT_COPY = {
  privacy: {
    title: "개인정보 수집 및 이용 동의",
    organization: "여수신월초등학교",
    purpose: "학부모 상담 신청 및 예약 관리, 본인 확인, 상담 일정 안내 및 결과 통보",
    items: "학년, 반, 번호, 학생 이름, 학부모 이름, 연락처(휴대전화), 비회원용 비밀번호(4자리)",
    retention: "상담 신청 및 관련 절차가 종료된 후 즉시 파기 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보관)",
  },
  thirdParty: {
    title: "개인정보의 제3자 제공 동의",
    organization: "Supabase, Inc. (데이터 위탁 처리)",
    purpose: "상담 신청 데이터의 안전한 저장 및 클라우드 인프라 제공",
    items: "수집된 일체의 정보 (암호화 처리된 비회원용 비밀번호 포함)",
    retention: "서비스 이용 종료 시까지 또는 위탁 계약 종료 시까지",
  },
} as const;
