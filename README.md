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
| `404.html` | 페이지 없음 |
| `partner-login.html` · `partner-dashboard.html` · `admin-dashboard.html` | 초기 템플릿의 데모 화면 (noindex, 운영 사용 금지) |

## 폴더

- `assets/css/site.css` — 전체 스타일 (디자인 토큰은 파일 상단 `:root`)
- `assets/js/config.js` — 전화·이메일·배송비·카카오 채널 주소·폼 주소 설정
- `assets/js/site.js` — 메뉴, 장바구니, 제품 필터/검색, 상세 보기, 주문서
- `assets/images/` — 로고(`brand-01.svg`), 제품 사진, 원료 이미지, OG 이미지

## 제품·가격 고치기

제품 카드는 `products.html`의 `<article class="card product-card" data-product …>`에 있고,
상세 보기·장바구니가 쓰는 데이터는 같은 페이지 하단의
`<script type="application/json" id="productData">`에 있습니다. 두 곳의 가격·구성·이미지를 함께 맞춰 주세요.
(다른 페이지의 장바구니도 이 데이터를 쓰므로, 공통 데이터는 각 페이지 하단 `productData` 블록에 함께 들어 있습니다.)

- `data-id` 상품 코드, `data-name` 이름, `data-price` 숫자 가격, `data-category` `program`/`bottle`, `data-order` 정렬 순서
- 가격·구성은 알프스.샵 스토어 판매가와 상품정보를 기준으로 합니다.
- 식품표시광고법에 따라 질병 치료·효능·다이어트 효과를 단정하는 문구는 넣지 않습니다.

## 설정

`assets/js/config.js`에서 전화번호, 이메일, 배송비, 카카오톡 채널 주소, 폼 수신 주소를 바꿉니다.
`kakaoChannelUrl`이 비어 있으면 상담 버튼은 전화 연결로 동작합니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000   # 또는 npx serve .
```

## 배포

`main` 브랜치에 push하면 Vercel과 GitHub Pages(`trsy217-glitch.github.io/enzyme-world`)가 갱신됩니다.
