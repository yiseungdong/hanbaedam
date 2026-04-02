# 한백담 프로젝트 스킬 파일
> 프로젝트 기술 참조 문서 — DB, API, 데이터 구조, 작업 규칙

---

## DB 테이블 구조

### products
- id, name, category(fresh/processed/gift)
- desc, detail, price, unit, badge, color
- tags(JSON), stock, image, naver_id, coupang_id
- created_at

### orders
- id, order_number, channel
- customer_name, customer_phone, customer_email
- address, items(JSON), total_price, delivery_fee
- status(결제완료/배송준비/배송중/배송완료)
- tracking_number, memo, created_at

### users
- id, username, password(bcrypt), name, phone
- email, is_social, social_provider, created_at

### reviews
- id, order_id, product_id, user_id, username
- rating(1-5), content, images(JSON)
- is_best, is_hidden, admin_reply, created_at

### inquiries
- id, type(gift/producer), name, phone
- email, content(JSON), created_at

---

## API 목록

### 상품
- GET /api/products
- GET /api/products/:id
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id
- PATCH /api/products/:id/stock

### 주문
- GET /api/orders
- POST /api/orders
- PUT /api/orders/:id/status

### 회원
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/profile
- POST /api/auth/check-username

### 후기
- GET /api/reviews
- GET /api/reviews/best
- POST /api/reviews
- POST /api/reviews/:id/images
- PUT /api/reviews/:id
- DELETE /api/reviews/:id

### 사진
- POST /api/upload
- GET /api/photos
- DELETE /api/photos/:filename

### 어드민
- POST /api/admin/login

---

## 상품 데이터 구조 (JS)
```javascript
{
  id: 1,
  category: "fresh",  // fresh/processed/gift
  name: "홍천 고구마",
  desc: "짧은 설명",
  detail: "상세 설명",
  price: 12000,
  unit: "2kg",
  badge: "신선",
  color: "#C8D8BE",
  tags: ["무농약", "강원도"],
  stock: 50,
  image: "/uploads/파일명.jpg"  // null이면 배경색
}
```

---

## 주요 결정사항

- B2C 주력 / B2B 보조
- 회원제 + 비회원 주문 둘 다 지원
- 배송: 수동 관리 (운송장 직접 입력)
- 결제: 토스페이먼츠 (예정)
- 도메인: 가비아 hanbaedam.com + .kr (예정)
- 호스팅: Render.com + PostgreSQL (예정)
- 사진보정: Canvas 슬라이더 + Cloudinary (예정)
- 카카오 알림톡: 3인 동시 발송 (채널 개설 후)
- 선물 시즌: 자동감지 + 어드민 수동 ON/OFF

---

## 멀티채널 판매 전략

| 채널 | 상태 | 우선순위 |
|------|------|----------|
| 자체 홈페이지 | 운영중 | 1 |
| 네이버 스마트스토어 | 개설완료 | 1 |
| 쿠팡 마켓플레이스 | 미입점 | 2 |
| 카카오 선물하기 | 미입점 | 2 |
| 마켓컬리 | 미입점 | 3 |
| 11번가 | 미입점 | 3 |
| 올웨이즈 | 미입점 | 3 |

---

## 작업 규칙

1. 모든 새 기능은 의논 → 아이디어 제시 → OK → 프롬프트
2. 프롬프트는 Part 1 / Part 2로 분리
3. PowerShell 사용: && 체이닝 금지, 항상 한 줄씩
4. git 명령어 항상 3줄 분리:
   git add .
   git commit -m "내용"
   git push
5. 새 채팅 시작 시 마스터플랜 먼저 읽기
6. 채팅창 차기 전에 마스터플랜 + 스킬 업데이트

---

## 미해결 버그

- products.html 상품 카드 이미지 꽉 안 차는 문제
  (index.html 은 정상)
- 어드민 사진 드래그앤드롭 교체 안 되는 문제

---

## 다음 작업 순서

1. 네이버 스마트스토어 API 연동 ← 지금 여기
2. 쿠팡 WING API 연동
3. 결제 시스템 (토스페이먼츠)
4. 카카오 알림톡 (채널 개설 후)
5. 소셜 로그인 (카카오/네이버 앱 등록 후)
6. 미해결 버그 수정

---

## 카카오 알림톡 준비사항

1. business.kakao.com 접속
2. 카카오톡 채널 개설 (@한백담)
3. 솔라피(Solapi) 가입 → Node.js SDK 연동
4. 알림톡 템플릿 등록 및 심사 (1~3일)
5. .env 에 수신자 3명 전화번호 등록

---

## 새 채팅 시작 방법

1. VS Code 열기
2. 터미널 → 새 터미널 (Ctrl + `)
3. cd C:\Users\이승동\Desktop\프로그래밍\hanbaedam
4. claude 입력
5. 첫 메시지:
   "C:\Users\이승동\Desktop\프로그래밍\hanbaedam\public\data\hanbaedam-masterplan.md 파일을 읽고 프로젝트 현황을 파악해줘"

---

## 서버 실행

- 개발: node server.js
- 접속: http://localhost:3000
- 어드민: http://localhost:3000/admin
- API: http://localhost:3000/api/products
