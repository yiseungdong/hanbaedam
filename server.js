require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, getDB, saveDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hanbaedam_secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// uploads 폴더 자동 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const reviewImgDir = path.join(uploadsDir, 'reviews');
if (!fs.existsSync(reviewImgDir)) fs.mkdirSync(reviewImgDir);

// 미들웨어
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'hanbaedam')));

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    cb(null, ext && mime);
  }
});

// 리뷰 이미지 업로드용 multer
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reviewImgDir),
  filename: (req, file, cb) => cb(null, 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + path.extname(file.originalname))
});
const reviewUpload = multer({
  storage: reviewStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype.split('/')[1]));
  }
});

// JWT 토큰 검증 헬퍼
function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

// tags JSON 파싱 헬퍼
function parseProduct(row) {
  // 이미지 파일이 실제 존재하는지 검증
  let image = row.image || '';
  if (image) {
    const imgPath = path.join(__dirname, image);
    if (!fs.existsSync(imgPath)) image = '';
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    desc: row.desc,
    detail: row.detail,
    price: row.price,
    unit: row.unit,
    badge: row.badge,
    color: row.color,
    tags: JSON.parse(row.tags || '[]'),
    stock: row.stock,
    image: image,
    naver_id: row.naver_id,
    coupang_id: row.coupang_id,
    created_at: row.created_at
  };
}

function rowToObj(columns, values) {
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

// ── 상품 API ──

app.get('/api/products', (req, res) => {
  const db = getDB();
  const result = db.exec('SELECT * FROM products ORDER BY id');
  if (!result.length) return res.json([]);
  const products = rowToObj(result[0].columns, result[0].values).map(parseProduct);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const db = getDB();
  const result = db.exec(`SELECT * FROM products WHERE id = ${Number(req.params.id)}`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '상품을 찾을 수 없습니다' });
  const product = parseProduct(rowToObj(result[0].columns, result[0].values)[0]);
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const db = getDB();
  const { name, category, desc, detail, price, unit, badge, color, tags, stock } = req.body;
  const stmt = db.prepare(`
    INSERT INTO products (name, category, "desc", detail, price, unit, badge, color, tags, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([name, category, desc, detail, price, unit, badge, color || '#D8D8D0', JSON.stringify(tags || []), stock || 0]);
  stmt.free();
  saveDB();
  const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  res.status(201).json({ id: lastId, message: '상품 등록 완료' });
});

app.put('/api/products/:id', (req, res) => {
  const db = getDB();
  const id = Number(req.params.id);
  const { name, category, desc, detail, price, unit, badge, color, tags, stock, image } = req.body;
  db.run(`
    UPDATE products SET name=?, category=?, "desc"=?, detail=?, price=?, unit=?, badge=?, color=?, tags=?, stock=?, image=?
    WHERE id=?
  `, [name, category, desc, detail, price, unit, badge, color, JSON.stringify(tags || []), stock, image || null, id]);
  saveDB();
  res.json({ message: '상품 수정 완료' });
});

app.delete('/api/products/:id', (req, res) => {
  const db = getDB();
  db.run(`DELETE FROM products WHERE id = ${Number(req.params.id)}`);
  saveDB();
  res.json({ message: '상품 삭제 완료' });
});

// ── 주문 API ──

// [1] 주문 생성
app.post('/api/orders', (req, res) => {
  const db = getDB();
  const { user_id, guest_name, guest_phone, items, total_price, recipient_name, recipient_phone, address, address_detail, memo } = req.body;
  const now = new Date();
  const dateStr = now.getFullYear().toString().slice(2) + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const order_number = `HBD${dateStr}${rand}`;
  const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
  try {
    const stmt = db.prepare(
      `INSERT INTO orders (order_number, user_id, guest_name, guest_phone, items, total_price, recipient_name, recipient_phone, address, address_detail, memo) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    stmt.run([order_number, user_id||null, guest_name||null, guest_phone||null, itemsJson, total_price, recipient_name, recipient_phone, address, address_detail||'', memo||'']);
    stmt.free();
    saveDB();
    const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    res.json({ success: true, order_number, order_id: lastId });
  } catch(err) {
    res.status(500).json({ error: '주문 저장 실패' });
  }
});

// [2] 어드민 전체 주문 목록
app.get('/api/admin/orders', (req, res) => {
  const db = getDB();
  const { status, search, date_from, date_to } = req.query;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const conditions = [];
  if (status && status !== '전체') conditions.push(`status='${status.replace(/'/g,"''")}'`);
  if (search) {
    const s = search.replace(/'/g,"''");
    conditions.push(`(guest_name LIKE '%${s}%' OR recipient_name LIKE '%${s}%' OR recipient_phone LIKE '%${s}%' OR order_number LIKE '%${s}%')`);
  }
  if (date_from) conditions.push(`date(created_at)>='${date_from}'`);
  if (date_to) conditions.push(`date(created_at)<='${date_to}'`);
  if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
  sql += ` ORDER BY created_at DESC`;
  const result = db.exec(sql);
  if (!result.length) return res.json([]);
  const orders = rowToObj(result[0].columns, result[0].values).map(o => {
    o.items = JSON.parse(o.items || '[]');
    return o;
  });
  res.json(orders);
});

// [3] 주문 상태 변경
app.patch('/api/admin/orders/:id/status', (req, res) => {
  const db = getDB();
  const { status, admin_memo } = req.body;
  const fields = [];
  const vals = [];
  if (status) { fields.push('status=?'); vals.push(status); }
  if (admin_memo !== undefined) { fields.push('admin_memo=?'); vals.push(admin_memo); }
  if (!fields.length) return res.status(400).json({ error: '수정할 항목이 없습니다' });
  fields.push("updated_at=CURRENT_TIMESTAMP");
  vals.push(Number(req.params.id));
  db.run(`UPDATE orders SET ${fields.join(',')} WHERE id=?`, vals);
  saveDB();
  res.json({ success: true });
});

// [4] 운송장 번호 등록
app.patch('/api/admin/orders/:id/tracking', (req, res) => {
  const db = getDB();
  const { courier, tracking_number } = req.body;
  db.run(
    `UPDATE orders SET courier=?, tracking_number=?, status='배송중', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [courier, tracking_number, Number(req.params.id)]
  );
  saveDB();
  res.json({ success: true });
});

// [5] 대시보드 통계
app.get('/api/admin/orders/stats', (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const monthStart = today.slice(0,7) + '-01';
  const db = getDB();
  const result = db.exec(`
    SELECT
      (SELECT COUNT(*) FROM orders WHERE date(created_at)='${today}') AS today_count,
      (SELECT COALESCE(SUM(total_price),0) FROM orders WHERE date(created_at)>='${monthStart}' AND status!='취소') AS month_revenue,
      (SELECT COUNT(*) FROM orders WHERE status IN ('결제대기','결제완료')) AS pending_count,
      (SELECT COUNT(*) FROM orders WHERE status='배송중') AS shipping_count
  `);
  if (!result.length) return res.json({ today_count: 0, month_revenue: 0, pending_count: 0, shipping_count: 0 });
  const row = rowToObj(result[0].columns, result[0].values)[0];
  res.json(row);
});

// [6] 회원 본인 주문 목록
app.get('/api/orders/my', (req, res) => {
  const user = verifyToken(req);
  if (!user || !user.id) return res.status(401).json({ error: '로그인이 필요합니다' });
  const db = getDB();
  const result = db.exec(`SELECT id, order_number, items, total_price, status, courier, tracking_number, created_at FROM orders WHERE user_id=${Number(user.id)} ORDER BY created_at DESC`);
  if (!result.length) return res.json([]);
  const orders = rowToObj(result[0].columns, result[0].values).map(o => {
    o.items = JSON.parse(o.items || '[]');
    return o;
  });
  res.json(orders);
});

// ── 사진 업로드 API ──

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ── 사진 목록/삭제 API ──

app.get('/api/photos', (req, res) => {
  const files = fs.readdirSync(uploadsDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(uploadsDir, f));
      return {
        filename: f,
        url: '/uploads/' + f,
        date: stat.mtime.toISOString().split('T')[0]
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  res.json(files);
});

app.delete('/api/photos/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  fs.unlinkSync(filepath);
  res.json({ message: '삭제 완료' });
});

// ── 회원 API ──

app.post('/api/auth/check-username', (req, res) => {
  const db = getDB();
  const { username } = req.body;
  if (!username || username.length < 4 || username.length > 20 || !/^[a-zA-Z0-9]+$/.test(username)) {
    return res.status(400).json({ available: false, error: '아이디는 영문, 숫자 4~20자여야 합니다' });
  }
  const existing = db.exec(`SELECT id FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
  if (existing.length && existing[0].values.length) {
    return res.json({ available: false, error: '이미 사용중인 아이디입니다' });
  }
  res.json({ available: true, message: '사용 가능한 아이디입니다' });
});

app.post('/api/auth/register', async (req, res) => {
  const db = getDB();
  const { username, password, name, phone, email } = req.body;
  if (!username || username.length < 4 || username.length > 20 || !/^[a-zA-Z0-9]+$/.test(username)) {
    return res.status(400).json({ error: '아이디는 영문, 숫자 4~20자여야 합니다' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다' });
  }
  const existing = db.exec(`SELECT id FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
  if (existing.length && existing[0].values.length) {
    return res.status(409).json({ error: '이미 사용중인 아이디입니다' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, email, password, name, phone) VALUES (?, ?, ?, ?, ?)');
  stmt.run([username, email || '', hashed, name, phone]);
  stmt.free();
  saveDB();
  const userId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const token = jwt.sign({ id: userId, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: userId, username, name } });
});

app.post('/api/auth/login', async (req, res) => {
  const db = getDB();
  const { username, password } = req.body;
  const result = db.exec(`SELECT * FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
  if (!result.length || !result[0].values.length) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
  }
  const user = rowToObj(result[0].columns, result[0].values)[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
  const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

// ── 배송지 저장/조회 API ──

app.post('/api/user/address', (req, res) => {
  const user = verifyToken(req);
  if (!user || !user.id) return res.status(401).json({ error: '로그인이 필요합니다' });
  const db = getDB();
  const { zipcode, address, address_detail } = req.body;
  db.run(`UPDATE users SET saved_zipcode=?, saved_address=?, saved_address_detail=? WHERE id=?`,
    [zipcode || '', address || '', address_detail || '', user.id]);
  saveDB();
  res.json({ success: true });
});

app.get('/api/user/address', (req, res) => {
  const user = verifyToken(req);
  if (!user || !user.id) return res.status(401).json({ error: '로그인이 필요합니다' });
  const db = getDB();
  const result = db.exec(`SELECT saved_zipcode, saved_address, saved_address_detail FROM users WHERE id=${Number(user.id)}`);
  if (!result.length || !result[0].values.length) return res.json({});
  const row = rowToObj(result[0].columns, result[0].values)[0];
  res.json(row);
});

// ── 후기 API ──

function parseReview(row) {
  return { ...row, images: JSON.parse(row.images || '[]') };
}

app.get('/api/reviews', (req, res) => {
  const db = getDB();
  const productId = req.query.product_id;
  const limit = Number(req.query.limit) || 50;
  let sql = 'SELECT * FROM reviews WHERE is_hidden = 0';
  if (productId) sql += ` AND product_id = ${Number(productId)}`;
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  const result = db.exec(sql);
  if (!result.length) return res.json({ reviews: [], summary: { count: 0, average: 0, distribution: {5:0,4:0,3:0,2:0,1:0} } });
  const reviews = rowToObj(result[0].columns, result[0].values).map(parseReview);
  const count = reviews.length;
  const average = count ? +(reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : 0;
  const distribution = {5:0,4:0,3:0,2:0,1:0};
  reviews.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });
  res.json({ reviews, summary: { count, average, distribution } });
});

app.get('/api/admin/reviews', (req, res) => {
  const db = getDB();
  const result = db.exec('SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC');
  if (!result.length) return res.json([]);
  res.json(rowToObj(result[0].columns, result[0].values).map(parseReview));
});

app.get('/api/reviews/best', (req, res) => {
  const db = getDB();
  let result = db.exec('SELECT * FROM reviews WHERE is_best = 1 AND is_hidden = 0 ORDER BY created_at DESC LIMIT 3');
  if (!result.length || !result[0].values.length) {
    result = db.exec('SELECT * FROM reviews WHERE is_hidden = 0 ORDER BY rating DESC, created_at DESC LIMIT 3');
  }
  if (!result.length) return res.json([]);
  res.json(rowToObj(result[0].columns, result[0].values).map(parseReview));
});

app.post('/api/reviews', (req, res) => {
  const user = verifyToken(req);
  if (!user || !user.id) return res.status(401).json({ error: '로그인이 필요합니다' });
  const db = getDB();
  const { order_id, product_id, rating, content } = req.body;
  if (!order_id || !product_id || !rating || !content) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: '별점은 1~5점이어야 합니다' });
  if (content.length < 10) return res.status(400).json({ error: '후기는 10자 이상 작성해주세요' });

  // 주문 확인
  const orderCheck = db.exec(`SELECT id FROM orders WHERE id = ${Number(order_id)}`);
  if (!orderCheck.length || !orderCheck[0].values.length) return res.status(400).json({ error: '해당 주문을 찾을 수 없습니다' });

  // 중복 확인
  const dupCheck = db.exec(`SELECT id FROM reviews WHERE product_id = ${Number(product_id)} AND user_id = ${Number(user.id)}`);
  if (dupCheck.length && dupCheck[0].values.length) return res.status(409).json({ error: '이미 이 상품에 후기를 작성하셨습니다' });

  const stmt = db.prepare('INSERT INTO reviews (order_id, product_id, user_id, username, rating, content) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run([Number(order_id), Number(product_id), user.id, user.username, Number(rating), content]);
  stmt.free();
  saveDB();
  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  res.status(201).json({ success: true, id: newId });
});

app.post('/api/reviews/:id/images', reviewUpload.array('images', 3), (req, res) => {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: '로그인이 필요합니다' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: '파일이 없습니다' });
  const db = getDB();
  const reviewId = Number(req.params.id);
  const result = db.exec(`SELECT images FROM reviews WHERE id = ${reviewId} AND user_id = ${user.id}`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '후기를 찾을 수 없습니다' });
  const existing = JSON.parse(result[0].values[0][0] || '[]');
  const newUrls = req.files.map(f => '/uploads/reviews/' + f.filename);
  const all = [...existing, ...newUrls].slice(0, 3);
  db.run(`UPDATE reviews SET images = '${JSON.stringify(all)}' WHERE id = ${reviewId}`);
  saveDB();
  res.json({ images: all });
});

app.put('/api/reviews/:id', (req, res) => {
  const db = getDB();
  const reviewId = Number(req.params.id);
  const { is_best, is_hidden, admin_reply } = req.body;
  const fields = [];
  const vals = [];
  if (is_best !== undefined) { fields.push('is_best=?'); vals.push(is_best ? 1 : 0); }
  if (is_hidden !== undefined) { fields.push('is_hidden=?'); vals.push(is_hidden ? 1 : 0); }
  if (admin_reply !== undefined) { fields.push('admin_reply=?'); vals.push(admin_reply); }
  if (!fields.length) return res.status(400).json({ error: '수정할 항목이 없습니다' });
  db.run(`UPDATE reviews SET ${fields.join(',')} WHERE id = ${reviewId}`, vals);
  saveDB();
  res.json({ message: '후기 수정 완료' });
});

app.delete('/api/reviews/:id', (req, res) => {
  const db = getDB();
  const reviewId = Number(req.params.id);
  const result = db.exec(`SELECT images FROM reviews WHERE id = ${reviewId}`);
  if (result.length && result[0].values.length) {
    const images = JSON.parse(result[0].values[0][0] || '[]');
    images.forEach(url => {
      const filepath = path.join(__dirname, url);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    });
  }
  db.run(`DELETE FROM reviews WHERE id = ${reviewId}`);
  saveDB();
  res.json({ message: '후기 삭제 완료' });
});

// ── 어드민 API ──

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, message: '어드민 로그인 성공' });
});

// ── 서버 시작 ──

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('한백담 서버 실행중: http://localhost:' + PORT);
  });
}).catch(err => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
