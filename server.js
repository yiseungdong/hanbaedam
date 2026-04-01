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

// tags JSON 파싱 헬퍼
function parseProduct(row) {
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
    image: row.image,
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

app.get('/api/orders', (req, res) => {
  const db = getDB();
  const result = db.exec('SELECT * FROM orders ORDER BY id DESC');
  if (!result.length) return res.json([]);
  const orders = rowToObj(result[0].columns, result[0].values).map(o => {
    o.items = JSON.parse(o.items || '[]');
    return o;
  });
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const db = getDB();
  const { channel, customer_name, customer_phone, customer_email, address, items, total_price, memo } = req.body;
  const order_number = 'HB' + Date.now();
  const delivery_fee = total_price >= 50000 ? 0 : 3000;
  const stmt = db.prepare(`
    INSERT INTO orders (order_number, channel, customer_name, customer_phone, customer_email, address, items, total_price, delivery_fee, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([order_number, channel || '자체몰', customer_name, customer_phone, customer_email, address, JSON.stringify(items), total_price, delivery_fee, memo || '']);
  stmt.free();
  saveDB();
  res.status(201).json({ order_number, delivery_fee, message: '주문 완료' });
});

app.put('/api/orders/:id/status', (req, res) => {
  const db = getDB();
  const { status, tracking_number } = req.body;
  db.run(`UPDATE orders SET status=?, tracking_number=? WHERE id=?`,
    [status, tracking_number || '', Number(req.params.id)]);
  saveDB();
  res.json({ message: '주문 상태 변경 완료' });
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

app.post('/api/auth/register', async (req, res) => {
  const db = getDB();
  const { email, password, name, phone } = req.body;
  const existing = db.exec(`SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
  if (existing.length && existing[0].values.length) {
    return res.status(409).json({ error: '이미 등록된 이메일입니다' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)');
  stmt.run([email, hashed, name, phone]);
  stmt.free();
  saveDB();
  const userId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: userId, email, name } });
});

app.post('/api/auth/login', async (req, res) => {
  const db = getDB();
  const { email, password } = req.body;
  const result = db.exec(`SELECT * FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
  if (!result.length || !result[0].values.length) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
  }
  const user = rowToObj(result[0].columns, result[0].values)[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
  const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
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
