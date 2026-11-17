/* 효소세상 사이트 설정
   실제 값이 확인된 항목만 채웁니다. 비어 있는 값은 화면에서 안내 문구로 대체됩니다. */
window.ENZYME_CONFIG = {
  brand: '효소세상',
  distributor: '알프스(AL.F.S)',
  phone: '010-9190-0906',
  phoneHref: 'tel:01091900906',
  email: 'trsy217@gmail.com',
  hours: '평일 10:00 - 18:00 (점심 12:00 - 13:00)',
  // 효소세상 전용 카카오톡 채널 주소는 아직 확인되지 않아 비워 둡니다.
  // 값이 들어오면 모든 [data-kakao] 버튼이 이 주소로 연결됩니다.
  kakaoChannelUrl: '',
  // 주문서·문의 폼을 받을 외부 주소(Formspree 등). 비우면 화면에서 접수 내용을 만들어 복사합니다.
  formEndpoint: '',
  shipping: {
    fee: 4000,
    freeOver: 50000,
    jejuExtra: 6000,
    carrier: '한진택배',
    note: '기본 배송비 4,000원 · 50,000원 이상 무료배송 · 제주·도서지역 추가 6,000원'
  },
  bankNote: '입금 계좌는 주문 확인 후 개별 안내드립니다.'
};
