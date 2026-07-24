const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'anqingju-secret-key-v1';

// ==================== JSON 文件存储 ====================
const DB_FILE = path.join(__dirname, 'data.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('读取数据库失败:', e.message);
  }
  return {
    nextId: { user: 2, story: 1, character: 1, setting: 1, relation: 1, message: 1, like: 1 },
    users: [{ id: 1, username: '颠茄先生', password: bcrypt.hashSync('7711', 10), role: 'admin', created_at: new Date().toLocaleString('zh-CN') }],
    stories: [],
    characters: [],
    settings: [],
    relations: [],
    messages: [],
    likes: []
  };
}

let db = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存数据库失败:', e.message);
  }
}

// 保存初始数据库
saveDB();

function getNextId(type) {
  const id = db.nextId[type] || 1;
  db.nextId[type] = id + 1;
  return id;
}

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { req.user = null; return next(); }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}
app.use(authMiddleware);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '请先登录' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '请先登录' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: '无权限' });
  next();
}

// ==================== 认证路由 ====================
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 1 || username.length > 20) return res.status(400).json({ error: '用户名长度1-20字符' });
  if (username === '颠茄先生') return res.status(400).json({ error: '该用户名已被保留' });
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: '用户名已存在' });

  const id = getNextId('user');
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = { id, username, password: hashedPassword, role: 'visitor', created_at: new Date().toLocaleString('zh-CN') };
  db.users.push(newUser);
  saveDB();

  const token = jwt.sign({ id, username, role: 'visitor' }, JWT_SECRET);
  res.json({ token, user: { id, username, role: 'visitor', created_at: newUser.created_at } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: '用户名或密码错误' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ error: '用户名或密码错误' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, created_at: user.created_at } });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

// ==================== 故事词条 ====================
app.get('/api/stories', (req, res) => {
  const stories = [...db.stories].sort((a, b) => {
    const ta = a.story_time || a.created_at;
    const tb = b.story_time || b.created_at;
    return (ta || '').localeCompare(tb || '');
  });
  res.json({ stories });
});

app.get('/api/stories/:id', (req, res) => {
  const story = db.stories.find(s => s.id == req.params.id);
  if (!story) return res.status(404).json({ error: '未找到' });
  res.json({ story });
});

app.post('/api/stories', requireAdmin, (req, res) => {
  const { title, content, story_time } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const id = getNextId('story');
  db.stories.push({ id, title, content, story_time: story_time || null, created_at: new Date().toLocaleString('zh-CN') });
  saveDB();
  res.json({ id });
});

app.put('/api/stories/:id', requireAdmin, (req, res) => {
  const { title, content, story_time } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const story = db.stories.find(s => s.id == req.params.id);
  if (!story) return res.status(404).json({ error: '未找到' });
  story.title = title;
  story.content = content;
  story.story_time = story_time || null;
  saveDB();
  res.json({ success: true });
});

app.delete('/api/stories/:id', requireAdmin, (req, res) => {
  db.stories = db.stories.filter(s => s.id != req.params.id);
  saveDB();
  res.json({ success: true });
});

// ==================== 角色词条 ====================
app.get('/api/characters', (req, res) => {
  res.json({ characters: db.characters });
});

app.get('/api/characters/:id', (req, res) => {
  const character = db.characters.find(c => c.id == req.params.id);
  if (!character) return res.status(404).json({ error: '未找到' });
  res.json({ character });
});

app.post('/api/characters', requireAdmin, (req, res) => {
  const { name, description, avatar_url } = req.body;
  if (!name) return res.status(400).json({ error: '角色名不能为空' });
  const id = getNextId('character');
  db.characters.push({ id, name, description: description || '', avatar_url: avatar_url || null, created_at: new Date().toLocaleString('zh-CN') });
  saveDB();
  res.json({ id });
});

app.put('/api/characters/:id', requireAdmin, (req, res) => {
  const { name, description, avatar_url } = req.body;
  if (!name) return res.status(400).json({ error: '角色名不能为空' });
  const character = db.characters.find(c => c.id == req.params.id);
  if (!character) return res.status(404).json({ error: '未找到' });
  character.name = name;
  character.description = description || '';
  character.avatar_url = avatar_url !== undefined ? avatar_url : null;
  saveDB();
  res.json({ success: true });
});

app.delete('/api/characters/:id', requireAdmin, (req, res) => {
  db.relations = db.relations.filter(r => r.character_id_1 != req.params.id && r.character_id_2 != req.params.id);
  db.characters = db.characters.filter(c => c.id != req.params.id);
  saveDB();
  res.json({ success: true });
});

// 角色头像上传（Base64 方式，无需 multer）
app.post('/api/upload/avatar', requireAdmin, (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl) return res.status(400).json({ error: '未收到图片数据' });
  // 直接返回 base64 data URL 作为存储
  res.json({ url: dataUrl });
});

// ==================== 设定词条 ====================
app.get('/api/settings', (req, res) => {
  const { category } = req.query;
  let settings = db.settings;
  if (category && category !== 'all') {
    settings = settings.filter(s => s.category === category);
  }
  res.json({ settings });
});

app.get('/api/settings/:id', (req, res) => {
  const setting = db.settings.find(s => s.id == req.params.id);
  if (!setting) return res.status(404).json({ error: '未找到' });
  res.json({ setting });
});

app.post('/api/settings', requireAdmin, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const validCategories = ['概念', '物品', '事件', '场景', '势力'];
  if (!validCategories.includes(category)) return res.status(400).json({ error: '无效分类' });
  const id = getNextId('setting');
  db.settings.push({ id, title, content, category, created_at: new Date().toLocaleString('zh-CN') });
  saveDB();
  res.json({ id });
});

app.put('/api/settings/:id', requireAdmin, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const validCategories = ['概念', '物品', '事件', '场景', '势力'];
  if (!validCategories.includes(category)) return res.status(400).json({ error: '无效分类' });
  const setting = db.settings.find(s => s.id == req.params.id);
  if (!setting) return res.status(404).json({ error: '未找到' });
  setting.title = title;
  setting.content = content;
  setting.category = category;
  saveDB();
  res.json({ success: true });
});

app.delete('/api/settings/:id', requireAdmin, (req, res) => {
  db.settings = db.settings.filter(s => s.id != req.params.id);
  saveDB();
  res.json({ success: true });
});

// ==================== 角色关系 ====================
app.get('/api/relations', (req, res) => {
  const relations = db.relations.map(r => {
    const c1 = db.characters.find(c => c.id === r.character_id_1);
    const c2 = db.characters.find(c => c.id === r.character_id_2);
    return {
      ...r,
      name_1: c1?.name || '?',
      avatar_1: c1?.avatar_url || null,
      name_2: c2?.name || '?',
      avatar_2: c2?.avatar_url || null
    };
  });
  res.json({ relations });
});

app.post('/api/relations', requireAdmin, (req, res) => {
  const { character_id_1, character_id_2, relation_desc } = req.body;
  if (!character_id_1 || !character_id_2 || !relation_desc) return res.status(400).json({ error: '参数不完整' });
  if (character_id_1 == character_id_2) return res.status(400).json({ error: '不能关联同一角色' });
  const id = getNextId('relation');
  db.relations.push({ id, character_id_1: parseInt(character_id_1), character_id_2: parseInt(character_id_2), relation_desc });
  saveDB();
  res.json({ id });
});

app.delete('/api/relations/:id', requireAdmin, (req, res) => {
  db.relations = db.relations.filter(r => r.id != req.params.id);
  saveDB();
  res.json({ success: true });
});

// ==================== 委托墙 ====================
app.get('/api/messages', (req, res) => {
  const messages = [...db.messages]
    .map(m => ({
      ...m,
      liked_by_me: db.likes.find(l => l.message_id === m.id && l.user_id === (req.user?.id || 0)) ? 1 : 0
    }))
    .sort((a, b) => b.likes_count - a.likes_count || new Date(b.created_at) - new Date(a.created_at));
  res.json({ messages });
});

app.post('/api/messages', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) return res.status(400).json({ error: '留言内容不能为空' });
  if (content.length > 500) return res.status(400).json({ error: '留言不能超过500字' });
  const id = getNextId('message');
  const message = {
    id, user_id: req.user.id, username: req.user.username,
    content: content.trim(), likes_count: 0,
    created_at: new Date().toLocaleString('zh-CN')
  };
  db.messages.push(message);
  saveDB();
  res.json({ message });
});

app.post('/api/messages/:id/like', requireAuth, (req, res) => {
  const messageId = parseInt(req.params.id);
  const existing = db.likes.find(l => l.message_id === messageId && l.user_id === req.user.id);
  const msg = db.messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: '未找到' });
  if (existing) {
    db.likes = db.likes.filter(l => l !== existing);
    msg.likes_count = Math.max(0, msg.likes_count - 1);
  } else {
    db.likes.push({ id: getNextId('like'), message_id: messageId, user_id: req.user.id });
    msg.likes_count++;
  }
  saveDB();
  res.json({ likes_count: msg.likes_count, liked: !existing });
});

app.delete('/api/messages/:id', requireAdmin, (req, res) => {
  const messageId = parseInt(req.params.id);
  db.likes = db.likes.filter(l => l.message_id !== messageId);
  db.messages = db.messages.filter(m => m.id !== messageId);
  saveDB();
  res.json({ success: true });
});

// ==================== 用户管理 ====================
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.users.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at }));
  res.json({ users });
});

// ==================== 管理后台数据 ====================
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  res.json({
    stats: {
      users: db.users.length,
      stories: db.stories.length,
      characters: db.characters.length,
      settings: db.settings.length,
      relations: db.relations.length,
      messages: db.messages.length,
      total_likes: db.messages.reduce((s, m) => s + m.likes_count, 0),
    }
  });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  暗情局1.1 已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  管理员: 颠茄先生 / 7711\n`);
});
