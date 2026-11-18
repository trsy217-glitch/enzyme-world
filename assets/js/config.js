/* 효소세상 사이트 설정
   실제 값이 확인된 항목만 채웁니다. 비어 있는 값은 화면에서 안내 문구로 대체됩니다.
   상담·문의 창구는 카카오톡 채널 하나로 통일합니다. 채널 주소를 바꾸려면 아래 kakaoChannelUrl만 고치면
   사이트의 모든 [data-kakao] 버튼과 '가격 문의' 버튼이 함께 바뀝니다. */
window.ENZYME_CONFIG = {
  brand: '효소세상',
  distributor: '알프스(AL.F.S)',
  email: 'trsy217@gmail.com',
  hours: '평일 10:00 - 18:00 (점심 12:00 - 13:00)',
  // 카카오톡 채널 상담 주소 (기본: 하루 1.3핏 효소다이어트 / 효소세상 채널)
  kakaoChannelUrl: 'http://pf.kakao.com/_Mcvfb',
  // 주문서·문의 폼을 받을 외부 주소(Formspree 등). 비우면 화면에서 접수 내용을 만들어 복사합니다.
  formEndpoint: '',
  shipping: {
    fee: 4000,
    freeOver: 50000,
    jejuExtra: 6000,
    carrier: '한진택배',
    note: '기본 배송비 4,000원 · 50,000원 이상 무료배송 · 제주·도서지역 추가 6,000원'
  },
  // 회원 등급 — 가입 기본 등급은 일반회원(할인 0%), 대리점 30%·총판 50%는 회사가 부여합니다.
  // adminCode는 회사 관리자 화면(admin-members.html) 입장 코드입니다. 시험 운영용이며 화면에 전달되므로
  // 실제 보안 수단이 아닙니다. 운영 전에는 서버 인증으로 바꾸고 이 값을 비우세요.
  member: {
    adminCode: 'enzyme2026admin'
  },
  bankNote: '입금 계좌는 주문 확인 후 카카오톡 채널로 개별 안내드립니다.'
};
