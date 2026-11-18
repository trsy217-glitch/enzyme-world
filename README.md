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
- `assets/js/member.js` — 회원가입·로그인(Firebase Auth), 등급(일반회원/대리점/총판), 등급별 할인가 계산, 관리자 등급 변경(Firestore)
- `firestore.rules` · `firebase.json` — Firestore 보안 규칙과 Firebase CLI 설정
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
- 등급·할인율을 바꾸려면 `assets/js/member.js`의 `GRADES` 배열을 고칩니다.

## 백엔드 (Firebase Authentication + Cloud Firestore)

회원 정보는 회사가 관리하는 Firebase 프로젝트 **`enzyme-world`** 에 저장됩니다.

| 항목 | 내용 |
| --- | --- |
| 프로젝트 | `enzyme-world` (Spark 무료 요금제, Firestore 위치 `asia-northeast3` 서울) |
| 웹 앱 설정 | `assets/js/config.js`의 `firebase` 블록 (사이트에 공개되는 식별자) |
| 로그인 방법 | 이메일·비밀번호, Google |
| 회원 문서 | `members/{uid}` — `name`, `phone`, `email`, `grade`, `joinedAt`, `updatedAt`, `history[]` |
| 관리자 목록 | `config/admin` 문서의 `emails` 배열 (이메일 인증이 끝난 계정만 관리자로 인정) |
| 보안 규칙 | `firestore.rules` — Firestore 콘솔 > 규칙에 같은 내용이 게시되어 있음 |

- 회원은 **본인 문서만** 읽을 수 있고, **등급(grade)은 본인이 바꿀 수 없습니다**
  (이름·연락처만 수정 가능). 등급 변경은 보안 규칙이 관리자 계정에만 허용합니다.
- 관리자 등록·해제: Firebase 콘솔 > Firestore > `config/admin` > `emails` 배열에
  회사 관리자 이메일을 넣거나 뺍니다. 관리자는 **Google 로그인(이메일 인증 완료)** 으로
  `admin-members.html`에 들어갑니다.
- 비밀번호는 Firebase Authentication이 보관하며 사이트 코드에는 남지 않습니다.
- 규칙을 고칠 때는 `firestore.rules`를 수정한 뒤 콘솔의 규칙 편집기에 같은 내용을
  붙여넣고 게시합니다(또는 `firebase deploy --only firestore:rules`).
- Firebase SDK(compat)는 `member.js`가 처음 필요할 때 불러옵니다. `member.html`과
  `admin-members.html`에는 미리 `<script>`로 넣어 두었습니다.

### 운영 전 확인

| 항목 | 현재 |
| --- | --- |
| 회원 저장 | Firebase Firestore (모든 기기에서 같은 계정으로 로그인하면 같은 등급) |
| 관리자 화면 | 관리자 계정 로그인 + 서버(보안 규칙) 검증 |
| 등급·할인 | DB의 등급을 읽어 화면에 적용. 주문은 카카오톡으로 받으므로 접수 시 사람이 확인 |
| 비밀번호 | Firebase Authentication (사이트에 해시 없음) |
| 관리자 코드 | 없음(제거). 관리자 계정 + `config/admin` 목록으로 대체 |

> 주문 금액은 회원 등급을 기준으로 브라우저에서 계산됩니다. 카카오톡으로 주문을 받아
> 확인하는 단계에서 회원 이메일과 등급을 `admin-members.html`에서 다시 확인해 주세요.
> 결제를 자동화(토스페이먼츠 등)할 때는 서버에서 금액을 다시 계산해야 합니다.

## 설정

`assets/js/config.js`에서 전화번호, 이메일, 배송비, 카카오톡 채널 주소, 폼 수신 주소를 바꿉니다.
`kakaoChannelUrl`이 비어 있으면 상담 버튼은 전화 연결로 동작합니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000   # 또는 npx serve .
```

## 배포

`main` 브랜치에 push하면 Vercel과 GitHub Pages(`trsy217-glitch.github.io/enzyme-world`)가 갱신됩니다.
