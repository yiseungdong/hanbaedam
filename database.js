const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hanbaedam.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();

  // 기존 DB 파일이 있으면 로드, 없으면 새로 생성
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      desc TEXT,
      detail TEXT,
      price INTEGER NOT NULL,
      unit TEXT,
      badge TEXT,
      color TEXT DEFAULT '#D8D8D0',
      tags TEXT,
      stock INTEGER DEFAULT 0,
      image TEXT,
      naver_id TEXT DEFAULT '',
      coupang_id TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      channel TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      address TEXT,
      items TEXT,
      total_price INTEGER,
      delivery_fee INTEGER DEFAULT 3000,
      status TEXT DEFAULT '결제완료',
      tracking_number TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT DEFAULT '',
      password TEXT,
      name TEXT,
      phone TEXT,
      is_social INTEGER DEFAULT 0,
      social_provider TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      name TEXT,
      phone TEXT,
      email TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 초기 상품 데이터 삽입 (테이블이 비어있을 때만)
  const count = db.exec("SELECT COUNT(*) as cnt FROM products");
  if (count[0].values[0][0] === 0) {
    const PRODUCTS = [
      {
        name: "홍천 고구마",
        category: "fresh",
        desc: "서늘한 가을 땅에서 캐낸 달고 부드러운 홍천 고구마",
        detail: "화학비료 없이 유기농으로 재배한 홍천 대표 고구마. 당도가 높고 식감이 부드러워 구워먹기, 쪄먹기 모두 좋습니다.",
        price: 12000, unit: "2kg", badge: "신선", color: "#C8D8BE",
        tags: '["무농약","강원도"]', stock: 50
      },
      {
        name: "강원 잣 선물세트",
        category: "processed",
        desc: "백두대간 청정 산지의 고소하고 풍성한 잣을 담은 선물세트",
        detail: "강원도 산지에서 직접 채취한 햇잣. 고소한 향과 풍부한 영양으로 선물용으로 최적입니다.",
        price: 38000, unit: "300g", badge: "선물", color: "#E8E0D0",
        tags: '["선물세트","명절"]', stock: 30
      },
      {
        name: "홍천 곤드레 나물",
        category: "processed",
        desc: "봄 산에서 직접 채취한 향긋한 곤드레 건조 나물",
        detail: "매년 봄, 홍천 산지에서 직접 채취·건조한 곤드레 나물. 밥에 넣거나 나물 무침으로 활용하세요.",
        price: 15000, unit: "100g", badge: "가공", color: "#D4E8D0",
        tags: '["산나물","건강"]', stock: 40
      },
      {
        name: "홍천 토마토",
        category: "fresh",
        desc: "일교차 큰 강원 고랭지에서 자란 당도 높은 토마토",
        detail: "해발 400m 이상 홍천 고랭지에서 재배. 일교차가 커 당도가 높고 과육이 단단합니다.",
        price: 18000, unit: "2kg", badge: "신선", color: "#F0D8D0",
        tags: '["고랭지","무농약"]', stock: 45
      },
      {
        name: "고구마 조청",
        category: "processed",
        desc: "홍천 고구마로 직접 만든 무설탕 전통 조청",
        detail: "설탕 없이 고구마만으로 만든 전통 방식 조청. 요리 감미료, 차 음료로 활용 가능합니다.",
        price: 22000, unit: "500g", badge: "가공", color: "#E8D8B0",
        tags: '["무설탕","전통"]', stock: 25
      },
      {
        name: "한백담 명절 선물세트",
        category: "gift",
        desc: "홍천 청정 자연의 정수를 담은 한백담 대표 선물세트",
        detail: "고구마·잣·곤드레나물·조청으로 구성된 한백담 대표 선물세트. 명절, 기업 선물로 최적입니다.",
        price: 75000, unit: "세트", badge: "GIFT", color: "#E0D8C8",
        tags: '["명절","기업선물","B2B"]', stock: 20
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO products (name, category, "desc", detail, price, unit, badge, color, tags, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    PRODUCTS.forEach(p => {
      stmt.run([p.name, p.category, p.desc, p.detail, p.price, p.unit, p.badge, p.color, p.tags, p.stock]);
    });
    stmt.free();

    console.log('초기 상품 데이터 6개 삽입 완료');
  }

  // DB를 파일로 저장
  saveDB();

  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB, saveDB };
