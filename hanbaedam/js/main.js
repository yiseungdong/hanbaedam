/* ── 상품 데이터 ── */
const PRODUCTS = [
  {
    id: 1, category: "fresh",
    name: "홍천 고구마",
    desc: "서늘한 가을 땅에서 캐낸 달고 부드러운 홍천 고구마",
    detail: "화학비료 없이 유기농으로 재배한 홍천 대표 고구마. 당도가 높고 식감이 부드러워 구워먹기, 쪄먹기 모두 좋습니다.",
    price: 12000, unit: "2kg",
    badge: "신선",
    color: "#C8D8BE",
    tags: ["무농약", "강원도"],
    stock: 50,
    naver_id: "", coupang_id: ""
  },
  {
    id: 2, category: "processed",
    name: "강원 잣 선물세트",
    desc: "백두대간 청정 산지의 고소하고 풍성한 잣을 담은 선물세트",
    detail: "강원도 산지에서 직접 채취한 햇잣. 고소한 향과 풍부한 영양으로 선물용으로 최적입니다.",
    price: 38000, unit: "300g",
    badge: "선물",
    color: "#E8E0D0",
    tags: ["선물세트", "명절"],
    stock: 30,
    naver_id: "", coupang_id: ""
  },
  {
    id: 3, category: "processed",
    name: "홍천 곤드레 나물",
    desc: "봄 산에서 직접 채취한 향긋한 곤드레 건조 나물",
    detail: "매년 봄, 홍천 산지에서 직접 채취·건조한 곤드레 나물. 밥에 넣거나 나물 무침으로 활용하세요.",
    price: 15000, unit: "100g",
    badge: "가공",
    color: "#D4E8D0",
    tags: ["산나물", "건강"],
    stock: 40,
    naver_id: "", coupang_id: ""
  },
  {
    id: 4, category: "fresh",
    name: "홍천 토마토",
    desc: "일교차 큰 강원 고랭지에서 자란 당도 높은 토마토",
    detail: "해발 400m 이상 홍천 고랭지에서 재배. 일교차가 커 당도가 높고 과육이 단단합니다.",
    price: 18000, unit: "2kg",
    badge: "신선",
    color: "#F0D8D0",
    tags: ["고랭지", "무농약"],
    stock: 45,
    naver_id: "", coupang_id: ""
  },
  {
    id: 5, category: "processed",
    name: "고구마 조청",
    desc: "홍천 고구마로 직접 만든 무설탕 전통 조청",
    detail: "설탕 없이 고구마만으로 만든 전통 방식 조청. 요리 감미료, 차 음료로 활용 가능합니다.",
    price: 22000, unit: "500g",
    badge: "가공",
    color: "#E8D8B0",
    tags: ["무설탕", "전통"],
    stock: 25,
    naver_id: "", coupang_id: ""
  },
  {
    id: 6, category: "gift",
    name: "한백담 명절 선물세트",
    desc: "홍천 청정 자연의 정수를 담은 한백담 대표 선물세트",
    detail: "고구마·잣·곤드레나물·조청으로 구성된 한백담 대표 선물세트. 명절, 기업 선물로 최적입니다.",
    price: 75000, unit: "세트",
    badge: "GIFT",
    color: "#E0D8C8",
    tags: ["명절", "기업선물", "B2B"],
    stock: 20,
    naver_id: "", coupang_id: ""
  }
];

/* ── 생산자 데이터 ── */
const PRODUCERS = [
  {
    id: 1,
    name: "김○○",
    avatar: "김",
    color: "#2A5C3F",
    location: "홍천군 내면",
    career: "고구마 재배 12년",
    products: [1, 4],
    method: "무농약 유기농",
    quote: "땅이 건강해야 작물도 건강합니다. 화학비료 없이 키운 고구마를 자신있게 드립니다.",
    story: "12년째 홍천 내면에서 고구마와 토마토를 재배하고 있습니다. 처음엔 힘들었지만 땅을 믿고 기다리니 해마다 더 좋은 작물이 나옵니다."
  },
  {
    id: 2,
    name: "이○○",
    avatar: "이",
    color: "#7BA87C",
    location: "홍천군 서석면",
    career: "잣 채취 20년",
    products: [2],
    method: "자연 채취",
    quote: "백두대간 자락의 잣나무숲에서 직접 채취합니다. 자연이 익힌 속도 그대로입니다.",
    story: "20년간 서석면 잣나무숲을 지켜왔습니다. 매년 가을, 자연이 허락한 만큼만 채취합니다. 욕심내지 않는 것이 좋은 잣의 비결입니다."
  },
  {
    id: 3,
    name: "박○○",
    avatar: "박",
    color: "#C9A96D",
    location: "홍천군 두촌면",
    career: "나물 채취·가공 15년",
    products: [3, 5],
    method: "자연 채취 후 전통 가공",
    quote: "봄이 오면 산을 읽습니다. 좋은 나물은 억지로 키우는 게 아니라 기다리는 겁니다.",
    story: "두촌면 산자락에서 곤드레와 각종 산나물을 채취합니다. 전통 방식으로 건조하고 가공해 영양과 맛을 최대한 살립니다."
  }
];

/* ── 카트 관리 ── */
const Cart = {
  get() { return JSON.parse(localStorage.getItem('hb_cart') || '[]'); },
  add(id, qty=1) {
    const cart = this.get();
    const idx = cart.findIndex(i => i.id === id);
    if (idx > -1) cart[idx].qty += qty;
    else cart.push({ id, qty });
    localStorage.setItem('hb_cart', JSON.stringify(cart));
    this.updateBadge();
  },
  remove(id) {
    const cart = this.get().filter(i => i.id !== id);
    localStorage.setItem('hb_cart', JSON.stringify(cart));
    this.updateBadge();
  },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  total() {
    return this.get().reduce((s, i) => {
      const p = PRODUCTS.find(p => p.id === i.id);
      return s + (p ? p.price * i.qty : 0);
    }, 0);
  },
  updateBadge() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = `장바구니 ${this.count()}`;
  }
};

/* ── 상품 카드 렌더 ── */
function renderProductCard(p) {
  const imgContent = p.image
    ? `<img src="${p.image}" alt="${p.name}">`
    : '';
  return `
    <div class="product-card" onclick="location.href='product-detail.html?id=${p.id}'">
      <div class="product-card__img" style="background:${p.color || '#EEEADF'};">
        ${imgContent}
        <div class="product-card__badge">${p.badge}</div>
      </div>
      <div class="product-card__name">${p.name}</div>
      <div class="product-card__desc">${p.desc}</div>
      <div class="product-card__price">${Number(p.price).toLocaleString()}원 / ${p.unit}</div>
    </div>`;
}

/* ── URL 파라미터 ── */
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

/* ── 선물 시즌 감지 ── */
function isGiftSeason() {
  // 어드민 강제 ON/OFF 먼저 확인
  const forced = localStorage.getItem('hb_gift_season');
  if (forced === 'on') return true;
  if (forced === 'off') return false;

  // 날짜 자동 감지
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 설날 (음력이라 양력 기준 1월 15일~2월 28일 사이 4주)
  if (month === 1 && day >= 8) return true;
  if (month === 2 && day <= 28) return true;

  // 어버이날 전 2주 (4월 24일 ~ 5월 8일)
  if (month === 4 && day >= 24) return true;
  if (month === 5 && day <= 15) return true;

  // 추석 (음력이라 양력 기준 9월~10월 초 4주)
  if (month === 9 && day >= 1) return true;
  if (month === 10 && day <= 10) return true;

  // 크리스마스 전 2주 (12월 11일~25일)
  if (month === 12 && day >= 11) return true;

  return false;
}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
