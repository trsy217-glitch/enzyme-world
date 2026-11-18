# 효소세상 (enzyme-world)

효소세상 발효 효소·미생물 발효 음료를 소개하고 주문서를 받는 정적 웹사이트입니다.
빌드 도구 없이 HTML·CSS·JS 파일을 그대로 올려 운영합니다.

- 라이브: https://enzyme-world.vercel.app
- 저장소: https://github.com/trsy217-glitch/enzyme-world

## 페이지

| 파일 | 내용 |
| --- | --- |
| `index.html` | 홈 — 브랜드 소개, 대표 제품, 프로그램 요약 |
| `products.html` | 제품 6종 (필터·검색·정렬·장바구니·상세 보기) |
| `programs.html` | 3일·30일 클렌즈, 바이오에너지, 3일 효소 디톡스 신청 안내 |
| `order.html` | 주문서, 배송 안내, 교환·환불 규정 |
| `fermentation.html` | 발효·원료·보관 안내 |
| `company.html` | 효소세상(제조)·알프스(유통)와 사업자 정보 |
| `b2b.html` · `partner.html` | 도매·총판 문의와 상담 절차 |
| `stories.html` | 체험 후기 안내와 게재 원칙 |
| `member.html` | 회원 로그인·회원가입·내 등급(일반회원/대리점/총판) 확인 (noindex) |
| `admin-members.html` | 회사 관리자용 회원 등급 부여·변경 화면 (noindex, 관리자 코드 필요) |
| `404.html` | 페이지 없음 |
| `partner-login.html` · `partner-dashboard.html` · `admin-dashboard.html` | 초기 템플릿의 데모 화면 (noindex, 운영 사용 금지) |

## 폴더

- `assets/css/site.css` — 전체 스타일 (디자인 토큰은 파일 상단 `:root`)
- `assets/js/config.js` — 전화·이메일·배송비·카카오 채널 주소·폼 주소 설정
- `assets/js/site.js` — 메뉴, 장바구니, 제품 필터/검색, 상세 보기, 주문서
- `assets/js/member.js` — 회원가입·로그인, 등급(일반회원/대리점/총판), 등급별 할인가 계산, 관리자 등급 변경
- `assets/images/` — 로고(`brand-01.svg`), 제품 사진, 원료 이미지, OG 이미지

## 제품·가격 고치기

제품 카드는 `products.html`의 `<article class="card product-card" data-product …>`에 있고,
상세 보기·장바구니가 쓰는 데이터는 같은 페이지 하단의
`<script type="application/json" id="productData">`에 있습니다. 두 곳의 가격·구성·이미지를 함께 맞춰 주세요.
(다른 페이지의 장바구니도 이 데이터를 쓰므로, 공통 데이터는 각 페이지 하단 `productData` 블록에 함께 들어 있습니다.)

- `data-id` 상품 코드, `data-name` 이름, `data-price` 숫자 가격, `data-category` `program`/`bottle`, `data-order` 정렬 순서
- 가격·구성은 알프스.샵 스토어 판매가와 상품정보를 기준으로 합니다.
- 식품표시광고법에 따라 질병 치료·효능·다이어트 효과를 단정하는 문구는 넣지 않습니다.

## 회원 등급 (일반회원 · 대리점 30% · 총판 50%)

- 회원가입 기본 등급은 **일반회원(할인 0%)**이고, **대리점(30%)·총판(50%)** 은 회사가
  `admin-members.html`에서 자격을 부여해야 적용됩니다.
- 등급이 부여되면 `products.html`·`index.html`의 판매가 표시, 장바구니, 주문서 요약,
  주문서 텍스트에 할인가가 자동 반영됩니다. `가격 문의` 상품은 할인 대상이 아닙니다.
  (할인가는 10원 단위 내림, 배송비 무료 기준 50,000원은 할인 적용 금액 기준)
- 관리자 화면 주소: `https://enzyme-world.vercel.app/admin-members.html`
  입장 코드는 `assets/js/config.js`의 `member.adminCode`(기본 `enzyme2026admin`)입니다.
- 등급·할인율을 바꾸려면 `assets/js/member.js`의 `GRADES` 배열을 고칩니다.

### 현재 구현의 한계 (운영 전 확인)

현재 사이트는 서버가 없는 정적 사이트이므로 회원 정보를 **브라우저 localStorage**에만 저장합니다.

| 항목 | 현재 | 실제 운영에 필요 |
| --- | --- | --- |
| 회원 저장 | 가입한 브라우저에만 저장 | 서버 DB(Firebase Firestore, Supabase 등) |
| 관리자 화면 | 그 브라우저에 저장된 회원만 표시 | 서버 회원 목록 + 관리자 계정 인증 |
| 등급·할인 | 브라우저에서 계산 | 주문 접수 시 서버에서 등급·할인 재검증 |
| 비밀번호 | PBKDF2 해시(브라우저 저장) | 서버 인증(해시는 서버에만 보관) |
| 관리자 코드 | JS에 포함된 코드(누구나 열람 가능) | 서버 로그인·권한 확인 |

즉 지금은 회원 흐름과 할인 계산을 눈으로 확인하는 **시험 운영 단계**입니다. 실제 회원이
여러 기기에서 가입·로그인하고 회사가 등급을 관리하려면 위 백엔드가 먼저 연결되어야 합니다.

## 설정

`assets/js/config.js`에서 전화번호, 이메일, 배송비, 카카오톡 채널 주소, 폼 수신 주소를 바꿉니다.
`kakaoChannelUrl`이 비어 있으면 상담 버튼은 전화 연결로 동작합니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000   # 또는 npx serve .
```

## 배포

`main` 브랜치에 push하면 Vercel과 GitHub Pages(`trsy217-glitch.github.io/enzyme-world`)가 갱신됩니다.
