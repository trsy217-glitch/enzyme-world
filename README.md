# 효소세상 (enzyme-world)

Google Stitch 프로젝트 **‘효소세상 웹디자인’**을 바탕으로 만든 정적 웹사이트입니다.
빌드 과정 없이 HTML 파일을 그대로 GitHub Pages에 올려 운영합니다.

- 배포 주소: https://trsy217-glitch.github.io/enzyme-world/

## 페이지 구성

| 파일 | 내용 | 출처 |
| --- | --- | --- |
| `index.html` | 공식 홈 (Brand Hub) | Stitch |
| `products.html` | 제품과 가격 (필터·검색·정렬·장바구니) | Stitch |
| `fermentation.html` | 발효 시스템 · 지식 허브 | Stitch |
| `b2b.html` | B2B 제조 · OEM 견적 (견적 신청 폼) | Stitch |
| `partner-login.html` | 파트너 / 관리자 로그인 | Stitch |
| `partner-dashboard.html` | 파트너 대시보드 (발주 기능) | Stitch |
| `admin-dashboard.html` | 관리자 대시보드 | Stitch |
| `company.html` · `programs.html` · `partner.html` · `stories.html` | 회사소개 · 프로그램 · 대리점·총판 · 체험스토리 | 템플릿 (내용 추가 필요) |
| `404.html` | 페이지 없음 | 템플릿 |

## 내용 · 이미지 바꾸기

- **텍스트**: 각 HTML 파일에서 문구를 직접 고치면 됩니다.
- **이미지**: `assets/images/` 폴더의 파일을 **같은 이름으로 덮어쓰면** 바로 교체됩니다.
  - `brand-01.png` → 로고 / `home-*.jpg` → 홈 / `product-*.jpg` → 제품 / `b2b-*`, `fermentation-*`, `partner-dash-*` → 각 페이지
  - 새 이미지를 쓰려면 HTML의 `src="assets/images/파일명"`을 바꿔 주세요.
- **템플릿 페이지**(회사소개 등)의 빗금 박스(`data-placeholder`)는 이미지 자리입니다.
  `<img src="assets/images/파일명" class="w-full h-72 object-cover rounded-2xl">` 로 바꾸면 됩니다.
- **제품 카드**(`products.html`)의 `data-*` 속성이 필터·정렬·장바구니에 쓰입니다.
  - `data-id`(상품코드), `data-name`, `data-price`(숫자, 0이면 B2B 문의 상품), `data-category`(`grain`/`liquid`/`pill`/`b2b`/`set`), `data-potency`(역가)

## 설정 (`assets/js/config.js`)

| 항목 | 설명 |
| --- | --- |
| `kakaoChannelUrl` | 카카오톡 채널 채팅 주소. 비우면 "준비 중" 안내 |
| `formEndpoint` | [Formspree](https://formspree.io) 등 폼 수신 주소. 넣으면 견적/상담/주문 내용이 이메일로 옵니다. 비우면 브라우저에만 저장 |
| `auth.requireLogin` | 대시보드 접근 시 로그인 요구 여부 |
| `productsPerPage` | 제품 페이지당 표시 개수 |
| `shipping` | 배송비 / 무료배송 기준 금액 |

## 들어간 기능

- 전체 메뉴 연결, 현재 페이지 표시, 모바일 햄버거 메뉴, 스크롤 시 섹션 등장 애니메이션, 숫자 카운트업, 맨 위로 버튼
- 제품: 카테고리 필터 · 검색 · 정렬 · 페이지 나누기 · 찜 · 빠른 보기(상세 모달) · 장바구니(수량/배송비 계산) · 주문 접수
- B2B 견적 폼 / 대리점 상담 폼: 필수값 검증, 연락처 자동 하이픈, 파일 드래그&드롭, 접수 완료 안내
- 로그인: 파트너(사업자번호 10자리) / 관리자(`HQ-`로 시작하는 ID), 비밀번호 8자 이상, 아이디 기억, OTP 입력
  - ⚠️ 정적 사이트용 **데모 인증**입니다. 실제 회원 보안이 필요하면 Firebase Auth 등 서버 인증을 연동하세요.
- 대시보드: 사이드바 접기(모바일 대응), 알림, 표 검색, 발주 수량 계산 · 일괄 발주, 입점 승인/보류, 견적서 등록, 인쇄(PDF)

## 로컬에서 보기

```bash
npx serve .
```

## 배포

`main` 브랜치에 push 하면 GitHub Pages(Settings → Pages → Branch: `main` / `root`)가 자동으로 갱신됩니다.
