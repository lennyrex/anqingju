// ==================== 暗情局 前端应用 ====================

const API = '/api';
let currentUser = null;
let authToken = localStorage.getItem('anqingju_token');

// ==================== 工具函数 ====================

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const key in attrs) {
    if (key === 'class') node.className = attrs[key];
    else if (key === 'html') node.innerHTML = attrs[key];
    else if (key.startsWith('on') && typeof attrs[key] === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
    } else if (key === 'style' && typeof attrs[key] === 'object') {
      Object.assign(node.style, attrs[key]);
    } else {
      node.setAttribute(key, attrs[key]);
    }
  }
  if (typeof children === 'string') {
    node.innerHTML = children;
  } else if (Array.isArray(children)) {
    children.forEach(c => {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c instanceof Node) node.appendChild(c);
    });
  }
  return node;
}

function showToast(message, type = 'info') {
  const toast = el('div', { class: `toast ${type}` }, message);
  $('#toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch') {
      showToast('网络连接失败，请检查服务是否启动', 'error');
    } else {
      showToast(e.message, 'error');
    }
    throw e;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace('T', ' ').substring(0, 16);
}

function getRoute() {
  const hash = location.hash.slice(1) || '/';
  return hash;
}

function navigate(path) {
  location.hash = path;
}

// ==================== 兽爪 SVG ====================
function clawLogoSVG(size = 36) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2002000/svg">
    <!-- 主掌心 -->
    <ellipse cx="50" cy="62" rx="18" ry="14" fill="#8b1a1a" opacity="0.6"/>
    <!-- 爪指1 -->
    <path d="M30 50 Q25 35 30 20 Q33 15 38 20 Q35 35 38 50" fill="#8b1a1a" opacity="0.8" stroke="#c43030" stroke-width="1.5"/>
    <!-- 爪指2 -->
    <path d="M42 46 Q40 28 45 12 Q48 7 53 12 Q50 28 50 46" fill="#8b1a1a" opacity="0.85" stroke="#c43030" stroke-width="1.5"/>
    <!-- 爪指3 -->
    <path d="M58 46 Q60 28 55 12 Q52 7 47 12 Q50 28 50 46" fill="#8b1a1a" opacity="0.85" stroke="#c43030" stroke-width="1.5"/>
    <!-- 爪指4 -->
    <path d="M70 50 Q75 35 70 20 Q67 15 62 20 Q65 35 62 50" fill="#8b1a1a" opacity="0.8" stroke="#c43030" stroke-width="1.5"/>
    <!-- 爪尖高光 -->
    <circle cx="33" cy="18" r="2" fill="#daa520" opacity="0.8"/>
    <circle cx="48" cy="10" r="2" fill="#daa520" opacity="0.8"/>
    <circle cx="52" cy="10" r="2" fill="#daa520" opacity="0.8"/>
    <circle cx="67" cy="18" r="2" fill="#daa520" opacity="0.8"/>
  </svg>`;
}

function clawScratchSVG() {
  return `<svg width="60" height="20" viewBox="0 0 60 20" fill="none">
    <path d="M2 10 Q15 4 30 10 Q45 16 58 8" stroke="#8b1a1a" stroke-width="1.5" opacity="0.4" fill="none"/>
    <path d="M2 14 Q15 8 30 14 Q45 20 58 12" stroke="#8b1a1a" stroke-width="1" opacity="0.25" fill="none"/>
  </svg>`;
}

// ==================== 路由系统 ====================
const routes = {
  '/': renderHome,
  '/login': renderLogin,
  '/register': renderRegister,
  '/stories': renderStories,
  '/stories/:id': renderStoryDetail,
  '/characters': renderCharacters,
  '/characters/:id': renderCharacterDetail,
  '/settings': renderSettings,
  '/settings/:id': renderSettingDetail,
  '/relations': renderRelations,
  '/delegation-wall': renderDelegationWall,
  '/admin/dashboard': renderAdminDashboard,
  '/admin/users': renderAdminUsers,
  '/admin/stories': renderAdminStories,
  '/admin/characters': renderAdminCharacters,
  '/admin/settings': renderAdminSettings,
  '/admin/relations': renderAdminRelations,
};

function matchRoute(path) {
  // 尝试精确匹配
  if (routes[path]) return { fn: routes[path], params: {} };
  // 尝试参数匹配
  for (const route in routes) {
    if (route.includes(':')) {
      const routeParts = route.split('/');
      const pathParts = path.split('/');
      if (routeParts.length === pathParts.length) {
        const params = {};
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = pathParts[i];
          } else if (routeParts[i] !== pathParts[i]) {
            match = false; break;
          }
        }
        if (match) return { fn: routes[route], params };
      }
    }
  }
  return null;
}

async function router() {
  const path = getRoute();
  const app = $('#app');
  const match = matchRoute(path);
  
  if (!match) {
    app.innerHTML = '<div class="page"><div class="empty-state"><div class="empty-state-icon">🐾</div><div class="empty-state-title">页面不存在</div><div class="empty-state-text">你迷失在暗情局的迷雾中</div></div></div>';
    renderNavbar();
    return;
  }

  // 管理员页面权限检查
  if (path.startsWith('/admin') && (!currentUser || currentUser.role !== 'admin')) {
    showToast('无权限访问', 'error');
    navigate('/login');
    return;
  }

  renderNavbar();
  try {
    await match.fn(match.params);
  } catch (e) {
    console.error(e);
  }
  window.scrollTo(0, 0);
}

// ==================== 导航栏 ====================
function renderNavbar() {
  const path = getRoute();
  const existingNav = $('#navbar');
  if (existingNav) existingNav.remove();

  const nav = el('nav', { id: 'navbar', class: 'navbar' });
  
  // 左侧 Logo
  const left = el('div', { class: 'navbar-left' });
  left.innerHTML = `
    <div class="claw-logo">${clawLogoSVG()}</div>
    <span class="navbar-logo-text">暗情局</span>
  `;
  left.style.cursor = 'pointer';
  left.addEventListener('click', () => navigate('/'));
  nav.appendChild(left);

  // 中间链接
  const links = el('ul', { class: 'navbar-links' });
  const navItems = [
    { path: '/stories', label: '故事' },
    { path: '/characters', label: '角色' },
    { path: '/settings', label: '设定' },
    { path: '/relations', label: '关系图' },
    { path: '/delegation-wall', label: '委托墙' },
  ];
  if (currentUser?.role === 'admin') {
    navItems.push({ path: '/admin/dashboard', label: '管理后台' });
  }
  
  navItems.forEach(item => {
    const li = el('li');
    const a = el('a', { 
      href: `#${item.path}`,
      class: path === item.path || path.startsWith(item.path + '/') ? 'active' : ''
    }, item.label);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.path);
    });
    li.appendChild(a);
    links.appendChild(li);
  });
  nav.appendChild(links);

  // 右侧用户区
  const right = el('div', { class: 'navbar-right' });
  
  if (currentUser) {
    const dropdown = el('div', { class: 'user-dropdown' });
    const btn = el('button', { class: 'user-dropdown-btn' });
    btn.innerHTML = `<span>${currentUser.username}</span> <span style="font-size:10px;">▼</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      $('#user-dropdown-menu')?.classList.toggle('show');
    });
    dropdown.appendChild(btn);

    const menu = el('div', { id: 'user-dropdown-menu', class: 'user-dropdown-menu' });
    
    if (currentUser.role === 'admin') {
      const adminLink = el('a', { href: '#/admin/dashboard' }, '管理后台');
      adminLink.addEventListener('click', (e) => { e.preventDefault(); navigate('/admin/dashboard'); $('#user-dropdown-menu').classList.remove('show'); });
      menu.appendChild(adminLink);
    }
    
    const logoutBtn = el('button', {}, '退出登录');
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('anqingju_token');
      authToken = null;
      currentUser = null;
      showToast('已退出登录', 'success');
      navigate('/');
      router();
    });
    menu.appendChild(logoutBtn);
    dropdown.appendChild(menu);
    right.appendChild(dropdown);
  } else {
    const loginLink = el('a', { href: '#/login', class: 'btn btn-sm btn-outline' }, '登录');
    loginLink.addEventListener('click', (e) => { e.preventDefault(); navigate('/login'); });
    right.appendChild(loginLink);
    
    const regLink = el('a', { href: '#/register', class: 'btn btn-sm btn-gold' }, '注册');
    regLink.addEventListener('click', (e) => { e.preventDefault(); navigate('/register'); });
    right.appendChild(regLink);
  }
  
  nav.appendChild(right);

  // 抓痕装饰
  const scratch = el('div', { class: 'navbar-scratch' });
  nav.appendChild(scratch);

  document.body.insertBefore(nav, document.body.firstChild);
  
  // 点击外部关闭下拉
  document.addEventListener('click', () => $('#user-dropdown-menu')?.classList.remove('show'));
}

// ==================== 首页 ====================
async function renderHome() {
  const app = $('#app');
  app.innerHTML = `
    <div class="main-container">
      <div class="home-hero">
        <h1>暗情局</h1>
        <p class="subtitle">在暗影与诡谲交织的世界里，每一段故事都隐匿着不为人知的秘密</p>
      </div>
      <div class="home-cards">
        <div class="home-card" onclick="navigate('/stories')">
          <div class="home-card-icon">📖</div>
          <h3>故事词条</h3>
          <p>探索暗情局世界的时间线叙事</p>
        </div>
        <div class="home-card" onclick="navigate('/relations')">
          <div class="home-card-icon">🕸️</div>
          <h3>角色关系图</h3>
          <p>角色之间的纠葛与羁绊可视化</p>
        </div>
        <div class="home-card" onclick="navigate('/delegation-wall')">
          <div class="home-card-icon">📜</div>
          <h3>委托墙</h3>
          <p>留下你的印记，与暗情局互动</p>
        </div>
      </div>
    </div>
  `;
}

// ==================== 登录 ====================
async function renderLogin() {
  if (currentUser) { navigate('/'); return; }
  const app = $('#app');
  app.innerHTML = `
    <div class="main-container">
      <div class="auth-container">
        <h2 class="auth-title">登录暗情局</h2>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">用户ID</label>
            <input type="text" class="form-input" id="login-username" placeholder="输入你的ID" required>
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input type="password" class="form-input" id="login-password" placeholder="输入密码" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;">登 录</button>
        </form>
        <p class="text-center text-sm text-muted" style="margin-top:20px;">
          还没有ID？ <a href="#/register" onclick="navigate('/register');return false;">注册新身份</a>
        </p>
      </div>
    </div>
  `;

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    try {
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      authToken = data.token;
      localStorage.setItem('anqingju_token', authToken);
      currentUser = data.user;
      showToast('登录成功', 'success');
      navigate('/');
      router();
    } catch (e) { /* toast 已显示 */ }
  });
}

// ==================== 注册 ====================
async function renderRegister() {
  if (currentUser) { navigate('/'); return; }
  const app = $('#app');
  app.innerHTML = `
    <div class="main-container">
      <div class="auth-container">
        <h2 class="auth-title">注册新身份</h2>
        <form id="register-form">
          <div class="form-group">
            <label class="form-label">用户ID</label>
            <input type="text" class="form-input" id="reg-username" placeholder="创建你的唯一ID" required maxlength="20">
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input type="password" class="form-input" id="reg-password" placeholder="设置密码" required maxlength="50">
          </div>
          <button type="submit" class="btn btn-gold btn-lg" style="width:100%;margin-top:8px;">注 册</button>
        </form>
        <p class="text-center text-sm text-muted" style="margin-top:20px;">
          已有ID？ <a href="#/login" onclick="navigate('/login');return false;">直接登录</a>
        </p>
      </div>
    </div>
  `;

  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#reg-username').value.trim();
    const password = $('#reg-password').value;
    try {
      const data = await api('/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      authToken = data.token;
      localStorage.setItem('anqingju_token', authToken);
      currentUser = data.user;
      showToast('注册成功，欢迎加入暗情局', 'success');
      navigate('/');
      router();
    } catch (e) { /* toast 已显示 */ }
  });
}

// ==================== 故事词条 ====================
async function renderStories() {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  const { stories } = await api('/stories');
  
  let html = '<div class="main-container"><div class="page">';
  html += '<h1 class="page-title">故事词条</h1>';
  html += '<p class="page-subtitle">沿着时间线追溯暗情局的世界叙事</p>';
  
  if (stories.length === 0) {
    html += emptyState('📖', '暂无故事', '暗情局的故事尚未展开');
  } else {
    html += '<div class="timeline">';
    stories.forEach(s => {
      html += `
        <div class="timeline-item">
          <div class="timeline-time">${s.story_time || formatDate(s.created_at)}</div>
          <h3 class="timeline-title" onclick="navigate('/stories/${s.id}')">${escapeHtml(s.title)}</h3>
          <p class="card-item-content">${escapeHtml(s.content)}</p>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div></div>';
  app.innerHTML = html;
}

async function renderStoryDetail(params) {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  try {
    const { story } = await api(`/stories/${params.id}`);
    app.innerHTML = `
      <div class="main-container">
        <div class="page">
          <div class="back-link" onclick="navigate('/stories')">← 返回故事列表</div>
          <div class="detail-container">
            <h1 class="detail-title">${escapeHtml(story.title)}</h1>
            <div class="detail-meta">
              ${story.story_time ? `<span>⏱ ${escapeHtml(story.story_time)}</span>` : ''}
              <span>📅 ${formatDate(story.created_at)}</span>
            </div>
            <div class="detail-content">${escapeHtml(story.content).replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    app.innerHTML = notFoundState('故事');
  }
}

// ==================== 角色词条 ====================
async function renderCharacters() {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  const { characters } = await api('/characters');
  
  let html = '<div class="main-container"><div class="page">';
  html += '<h1 class="page-title">角色词条</h1>';
  html += '<p class="page-subtitle">暗情局世界中的关键人物</p>';
  
  if (characters.length === 0) {
    html += emptyState('🎭', '暂无角色', '角色尚未登场');
  } else {
    html += '<div class="card-list">';
    characters.forEach(c => {
      html += `
        <div class="card-item character-card" onclick="navigate('/characters/${c.id}')">
          ${c.avatar_url 
            ? `<img class="character-avatar" src="${c.avatar_url}" alt="${escapeHtml(c.name)}">` 
            : `<div class="character-avatar-placeholder">${escapeHtml(c.name.charAt(0))}</div>`
          }
          <h3 class="card-item-title">${escapeHtml(c.name)}</h3>
          <p class="card-item-content">${escapeHtml(c.description || '暂无描述')}</p>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div></div>';
  app.innerHTML = html;
}

async function renderCharacterDetail(params) {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  try {
    const { character } = await api(`/characters/${params.id}`);
    app.innerHTML = `
      <div class="main-container">
        <div class="page">
          <div class="back-link" onclick="navigate('/characters')">← 返回角色列表</div>
          <div class="detail-container">
            <div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap;">
              ${character.avatar_url 
                ? `<img class="character-avatar" src="${character.avatar_url}" style="width:120px;height:120px;" alt="${escapeHtml(character.name)}">` 
                : `<div class="character-avatar-placeholder" style="width:120px;height:120px;font-size:48px;">${escapeHtml(character.name.charAt(0))}</div>`
              }
              <div style="flex:1;min-width:200px;">
                <h1 class="detail-title">${escapeHtml(character.name)}</h1>
                <div class="detail-meta"><span>📅 ${formatDate(character.created_at)}</span></div>
              </div>
            </div>
            <div class="detail-content" style="margin-top:24px;">${escapeHtml(character.description || '暂无描述').replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    app.innerHTML = notFoundState('角色');
  }
}

// ==================== 设定词条 ====================
const SETTING_CATEGORIES = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: '概念', label: '概念', icon: '🧠' },
  { value: '物品', label: '物品', icon: '🗡️' },
  { value: '事件', label: '事件', icon: '⚡' },
  { value: '场景', label: '场景', icon: '🏙️' },
  { value: '势力', label: '势力', icon: '🏛️' },
];

async function renderSettings(category = 'all') {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  const { settings } = await api(`/settings?category=${category}`);
  
  let html = '<div class="main-container"><div class="page">';
  html += '<h1 class="page-title">设定词条</h1>';
  html += '<p class="page-subtitle">世界观架构与设定集</p>';
  
  // 分类筛选
  html += '<div class="category-tabs">';
  SETTING_CATEGORIES.forEach(cat => {
    html += `<div class="category-tab ${category === cat.value ? 'active' : ''}" onclick="renderSettings('${cat.value}')">${cat.icon} ${cat.label}</div>`;
  });
  html += '</div>';
  
  if (settings.length === 0) {
    html += emptyState('📋', '暂无设定', '该分类下还没有设定词条');
  } else {
    html += '<div class="card-list">';
    settings.forEach(s => {
      const catIcon = SETTING_CATEGORIES.find(c => c.value === s.category)?.icon || '📋';
      html += `
        <div class="card-item" onclick="navigate('/settings/${s.id}')">
          <span class="category-badge">${catIcon} ${s.category}</span>
          <h3 class="card-item-title" style="margin-top:8px;">${escapeHtml(s.title)}</h3>
          <p class="card-item-content">${escapeHtml(s.content)}</p>
          <div class="card-item-meta">📅 ${formatDate(s.created_at)}</div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div></div>';
  app.innerHTML = html;
}

async function renderSettingDetail(params) {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  try {
    const { setting } = await api(`/settings/${params.id}`);
    const catIcon = SETTING_CATEGORIES.find(c => c.value === setting.category)?.icon || '📋';
    app.innerHTML = `
      <div class="main-container">
        <div class="page">
          <div class="back-link" onclick="navigate('/settings')">← 返回设定列表</div>
          <div class="detail-container">
            <span class="category-badge">${catIcon} ${setting.category}</span>
            <h1 class="detail-title" style="margin-top:12px;">${escapeHtml(setting.title)}</h1>
            <div class="detail-meta"><span>📅 ${formatDate(setting.created_at)}</span></div>
            <div class="detail-content">${escapeHtml(setting.content).replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    app.innerHTML = notFoundState('设定');
  }
}

// ==================== 角色关系图 ====================
async function renderRelations() {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  const { relations } = await api('/relations');
  const { characters } = await api('/characters');
  
  if (characters.length === 0) {
    app.innerHTML = `<div class="main-container"><div class="page">${emptyState('🕸️', '暂无角色', '需要先创建角色才能建立关系')}</div></div>`;
    return;
  }

  let html = '<div class="main-container"><div class="page-full">';
  html += '<h1 class="page-title">角色关系图</h1>';
  html += '<p class="page-subtitle">拖拽节点查看角色之间的羁绊</p>';
  
  html += '<div class="relations-container" id="relations-container">';
  html += '<canvas id="relations-canvas"></canvas>';
  html += `<div class="relations-legend">
    <h4>操作说明</h4>
    <ul>
      <li>🖱️ 拖拽节点移动</li>
      <li>🖱️ 拖拽画布平移</li>
      <li>🔍 滚轮缩放</li>
    </ul>
  </div>`;
  html += '</div>';
  
  if (currentUser?.role === 'admin') {
    html += '<div class="mt-24 flex gap-12"><button class="btn btn-primary" onclick="openRelationModal()">+ 新建关系</button></div>';
  }
  
  html += '</div></div>';
  app.innerHTML = html;
  
  // 初始化力导向图
  initForceGraph(characters, relations);
}

let graphNodes = [];
let graphEdges = [];
let graphCanvas = null;
let graphCtx = null;
let graphAnimId = null;
let graphDragNode = null;
let graphDragOffset = { x: 0, y: 0 };
let graphPan = { x: 0, y: 0 };
let graphScale = 1;
let isPanning = false;
let panStart = { x: 0, y: 0 };

function initForceGraph(characters, relations) {
  const canvas = $('#relations-canvas');
  if (!canvas) return;
  
  const container = $('#relations-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  graphCanvas = canvas;
  graphCtx = canvas.getContext('2d');
  
  // 创建节点
  graphNodes = characters.map((c, i) => {
    const angle = (i / characters.length) * Math.PI * 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    return {
      id: c.id,
      name: c.name,
      avatar_url: c.avatar_url,
      x: canvas.width / 2 + Math.cos(angle) * radius,
      y: canvas.height / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: 28,
    };
  });
  
  // 创建边
  graphEdges = relations.map(r => ({
    source: r.character_id_1,
    target: r.character_id_2,
    desc: r.relation_desc,
    id: r.id,
  }));
  
  // 事件
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('mouseleave', onCanvasMouseUp);
  canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
  canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
  canvas.addEventListener('touchend', onCanvasMouseUp);
  
  // 窗口大小变化
  window.addEventListener('resize', resizeCanvas);
  
  // 启动力模拟
  startForceSimulation();
}

function resizeCanvas() {
  const container = $('#relations-container');
  if (!container || !graphCanvas) return;
  graphCanvas.width = container.clientWidth;
  graphCanvas.height = container.clientHeight;
}

function startForceSimulation() {
  const centerX = graphCanvas.width / 2;
  const centerY = graphCanvas.height / 2;
  
  function tick() {
    // 简化力导向：排斥力 + 边吸引力 + 中心引力
    for (let i = 0; i < graphNodes.length; i++) {
      const a = graphNodes[i];
      // 中心引力
      a.vx += (centerX - a.x) * 0.001;
      a.vy += (centerY - a.y) * 0.001;
      
      for (let j = 0; j < graphNodes.length; j++) {
        if (i === j) continue;
        const b = graphNodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const force = 3000 / (dist * dist);
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
      }
    }
    
    // 边吸引力
    graphEdges.forEach(e => {
      const s = graphNodes.find(n => n.id === e.source);
      const t = graphNodes.find(n => n.id === e.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
      const force = (dist - 150) * 0.01;
      s.vx += (dx / dist) * force;
      s.vy += (dy / dist) * force;
      t.vx -= (dx / dist) * force;
      t.vy -= (dy / dist) * force;
    });
    
    // 更新位置
    graphNodes.forEach(n => {
      if (n === graphDragNode) return;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      // 边界约束
      n.x = Math.max(n.radius + 10, Math.min(graphCanvas.width - n.radius - 10, n.x));
      n.y = Math.max(n.radius + 10, Math.min(graphCanvas.height - n.radius - 10, n.y));
    });
    
    drawGraph();
    graphAnimId = requestAnimationFrame(tick);
  }
  tick();
}

function drawGraph() {
  const ctx = graphCtx;
  ctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
  
  ctx.save();
  ctx.translate(graphPan.x, graphPan.y);
  ctx.scale(graphScale, graphScale);
  
  // 绘制边
  graphEdges.forEach(e => {
    const s = graphNodes.find(n => n.id === e.source);
    const t = graphNodes.find(n => n.id === e.target);
    if (!s || !t) return;
    
    // 线
    ctx.strokeStyle = 'rgba(139, 26, 26, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    
    // 关系描述
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    ctx.fillStyle = 'rgba(184, 134, 11, 0.9)';
    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 背景
    const textW = ctx.measureText(e.desc).width;
    ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
    ctx.fillRect(mx - textW/2 - 4, my - 9, textW + 8, 18);
    ctx.fillStyle = 'rgba(218, 165, 32, 0.9)';
    ctx.fillText(e.desc, mx, my);
  });
  
  // 绘制节点
  graphNodes.forEach(n => {
    // 外环
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = n === graphDragNode ? '#c43030' : '#8b1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 光晕
    ctx.shadowColor = 'rgba(139, 26, 26, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // 头像或文字
    if (n.avatar_url) {
      try {
        const img = new Image();
        img.src = n.avatar_url;
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius - 4, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, n.x - n.radius + 4, n.y - n.radius + 4, (n.radius - 4) * 2, (n.radius - 4) * 2);
        ctx.restore();
      } catch (e) {}
    } else {
      ctx.fillStyle = '#daa520';
      ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.name.charAt(0), n.x, n.y);
    }
    
    // 名字
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '13px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + n.radius + 16);
  });
  
  ctx.restore();
}

function getNodeAt(x, y) {
  const tx = (x - graphPan.x) / graphScale;
  const ty = (y - graphPan.y) / graphScale;
  for (let i = graphNodes.length - 1; i >= 0; i--) {
    const n = graphNodes[i];
    const dx = tx - n.x;
    const dy = ty - n.y;
    if (dx * dx + dy * dy < n.radius * n.radius) return n;
  }
  return null;
}

function onCanvasMouseDown(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const node = getNodeAt(x, y);
  if (node) {
    graphDragNode = node;
    const tx = (x - graphPan.x) / graphScale;
    const ty = (y - graphPan.y) / graphScale;
    graphDragOffset = { x: tx - node.x, y: ty - node.y };
  } else {
    isPanning = true;
    panStart = { x: x - graphPan.x, y: y - graphPan.y };
  }
}

function onCanvasMouseMove(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (graphDragNode) {
    const tx = (x - graphPan.x) / graphScale;
    const ty = (y - graphPan.y) / graphScale;
    graphDragNode.x = tx - graphDragOffset.x;
    graphDragNode.y = ty - graphDragOffset.y;
    graphDragNode.vx = 0;
    graphDragNode.vy = 0;
  } else if (isPanning) {
    graphPan.x = x - panStart.x;
    graphPan.y = y - panStart.y;
  }
}

function onCanvasMouseUp() {
  graphDragNode = null;
  isPanning = false;
}

function onCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  graphScale = Math.max(0.3, Math.min(3, graphScale * delta));
}

function onCanvasTouchStart(e) {
  if (e.touches.length === 1) {
    e.preventDefault();
    const rect = graphCanvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    onCanvasMouseDown({ clientX: x + rect.left, clientY: y + rect.top });
  }
}

function onCanvasTouchMove(e) {
  if (e.touches.length === 1) {
    e.preventDefault();
    const rect = graphCanvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    onCanvasMouseMove({ clientX: x + rect.left, clientY: y + rect.top });
  }
}

// 新建关系弹窗
async function openRelationModal() {
  const { characters } = await api('/characters');
  if (characters.length < 2) {
    showToast('至少需要2个角色才能创建关系', 'error');
    return;
  }
  
  const modal = el('div', { class: 'modal-overlay' });
  const content = el('div', { class: 'modal' });
  content.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">新建角色关系</h3>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">角色 1</label>
        <select class="form-select" id="rel-char1">
          ${characters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">角色 2</label>
        <select class="form-select" id="rel-char2">
          ${characters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">关系描述</label>
        <input type="text" class="form-input" id="rel-desc" placeholder="如：宿敌、父子、师徒、暗中保护">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn btn-primary" id="rel-submit">创建</button>
    </div>
  `;
  modal.appendChild(content);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  
  $('#rel-submit').addEventListener('click', async () => {
    const char1 = $('#rel-char1').value;
    const char2 = $('#rel-char2').value;
    const desc = $('#rel-desc').value.trim();
    if (char1 === char2) { showToast('不能关联同一角色', 'error'); return; }
    if (!desc) { showToast('请填写关系描述', 'error'); return; }
    try {
      await api('/relations', { method: 'POST', body: JSON.stringify({ character_id_1: char1, character_id_2: char2, relation_desc: desc }) });
      showToast('关系创建成功', 'success');
      modal.remove();
      renderRelations();
    } catch (e) {}
  });
}

// ==================== 委托墙 ====================
async function renderDelegationWall() {
  const app = $('#app');
  app.innerHTML = '<div class="main-container"><div class="page"><div class="loading"><div class="loading-spinner"></div></div></div></div>';
  
  const { messages } = await api('/messages');
  
  let html = '<div class="main-container"><div class="page">';
  html += '<h1 class="page-title">委托墙</h1>';
  html += '<p class="page-subtitle">在暗影中留下你的印记</p>';
  
  // 发布留言
  if (currentUser) {
    html += `
      <div class="card-item mb-24">
        <textarea class="form-textarea" id="msg-input" placeholder="写下你的留言（最多500字）..." maxlength="500" style="min-height:100px;"></textarea>
        <div class="flex-between mt-16">
          <span class="text-xs text-muted" id="msg-counter">0 / 500</span>
          <button class="btn btn-primary btn-claw-hover" id="msg-submit">发布留言</button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="card-item mb-24 text-center">
        <p class="text-secondary text-sm">登录后即可发布留言</p>
        <button class="btn btn-outline mt-16" onclick="navigate('/login')">前往登录</button>
      </div>
    `;
  }
  
  // 留言列表
  if (messages.length === 0) {
    html += emptyState('📜', '委托墙空空如也', '成为第一个留下印记的人');
  } else {
    html += '<div class="message-wall">';
    messages.forEach(m => {
      html += `
        <div class="message-card">
          <div class="message-header">
            <span class="message-author">${escapeHtml(m.username)}</span>
            <span class="message-time">${formatDate(m.created_at)}</span>
          </div>
          <div class="message-content">${escapeHtml(m.content)}</div>
          <div class="message-actions">
            <button class="like-btn ${m.liked_by_me ? 'liked' : ''}" onclick="toggleLike(${m.id})">
              <span class="heart">${m.liked_by_me ? '❤️' : '🤍'}</span>
              <span id="like-count-${m.id}">${m.likes_count}</span>
            </button>
            ${currentUser?.role === 'admin' ? `<button class="delete-btn" onclick="deleteMessage(${m.id})">🗑 删除</button>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div></div>';
  app.innerHTML = html;
  
  // 绑定事件
  if (currentUser) {
    const msgInput = $('#msg-input');
    msgInput.addEventListener('input', () => {
      $('#msg-counter').textContent = `${msgInput.value.length} / 500`;
    });
    $('#msg-submit').addEventListener('click', async () => {
      const content = msgInput.value.trim();
      if (!content) { showToast('留言内容不能为空', 'error'); return; }
      try {
        await api('/messages', { method: 'POST', body: JSON.stringify({ content }) });
        showToast('留言发布成功', 'success');
        renderDelegationWall();
      } catch (e) {}
    });
  }
}

async function toggleLike(messageId) {
  if (!currentUser) { showToast('请先登录', 'error'); navigate('/login'); return; }
  try {
    const data = await api(`/messages/${messageId}/like`, { method: 'POST' });
    const btn = $(`#like-count-${messageId}`);
    if (btn) btn.textContent = data.likes_count;
    const likeBtn = btn?.closest('.like-btn');
    if (likeBtn) {
      likeBtn.classList.toggle('liked', data.liked);
      likeBtn.querySelector('.heart').textContent = data.liked ? '❤️' : '🤍';
    }
  } catch (e) {}
}

async function deleteMessage(messageId) {
  showConfirm('确认删除', '确定要删除这条留言吗？', async () => {
    try {
      await api(`/messages/${messageId}`, { method: 'DELETE' });
      showToast('留言已删除', 'success');
      renderDelegationWall();
    } catch (e) {}
  });
}

// ==================== 管理后台 ====================
async function renderAdminLayout(activeTab, contentFn) {
  const app = $('#app');
  app.innerHTML = `
    <div class="main-container">
      <div class="admin-layout">
        <div class="admin-sidebar">
          <h3>管理后台</h3>
          <ul>
            <li><a href="#/admin/dashboard" data-tab="dashboard" class="${activeTab === 'dashboard' ? 'active' : ''}" onclick="navigate('/admin/dashboard');return false;">📊 总览</a></li>
            <li><a href="#/admin/stories" data-tab="stories" class="${activeTab === 'stories' ? 'active' : ''}" onclick="navigate('/admin/stories');return false;">📖 故事管理</a></li>
            <li><a href="#/admin/characters" data-tab="characters" class="${activeTab === 'characters' ? 'active' : ''}" onclick="navigate('/admin/characters');return false;">🎭 角色管理</a></li>
            <li><a href="#/admin/settings" data-tab="settings" class="${activeTab === 'settings' ? 'active' : ''}" onclick="navigate('/admin/settings');return false;">📋 设定管理</a></li>
            <li><a href="#/admin/relations" data-tab="relations" class="${activeTab === 'relations' ? 'active' : ''}" onclick="navigate('/admin/relations');return false;">🕸️ 关系管理</a></li>
            <li><a href="#/admin/users" data-tab="users" class="${activeTab === 'users' ? 'active' : ''}" onclick="navigate('/admin/users');return false;">👥 用户管理</a></li>
          </ul>
        </div>
        <div class="admin-content" id="admin-content">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;
  await contentFn();
}

async function renderAdminDashboard() {
  await renderAdminLayout('dashboard', async () => {
    const { stats } = await api('/admin/dashboard');
    $('#admin-content').innerHTML = `
      <h1 class="page-title">后台总览</h1>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${stats.users}</div><div class="stat-label">注册用户</div></div>
        <div class="stat-card"><div class="stat-value">${stats.stories}</div><div class="stat-label">故事词条</div></div>
        <div class="stat-card"><div class="stat-value">${stats.characters}</div><div class="stat-label">角色词条</div></div>
        <div class="stat-card"><div class="stat-value">${stats.settings}</div><div class="stat-label">设定词条</div></div>
        <div class="stat-card"><div class="stat-value">${stats.relations}</div><div class="stat-label">角色关系</div></div>
        <div class="stat-card"><div class="stat-value">${stats.messages}</div><div class="stat-label">委托墙留言</div></div>
        <div class="stat-card"><div class="stat-value">${stats.total_likes}</div><div class="stat-label">总点赞数</div></div>
      </div>
    `;
  });
}

async function renderAdminUsers() {
  await renderAdminLayout('users', async () => {
    const { users } = await api('/admin/users');
    let html = '<h1 class="page-title">用户注册表</h1>';
    html += '<table class="data-table"><thead><tr><th>ID</th><th>用户名</th><th>身份</th><th>注册时间</th></tr></thead><tbody>';
    users.forEach(u => {
      html += `<tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.username)}</td>
        <td><span class="role-badge ${u.role === 'admin' ? 'admin' : 'visitor'}">${u.role === 'admin' ? '管理员' : '访客'}</span></td>
        <td>${formatDate(u.created_at)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    $('#admin-content').innerHTML = html;
  });
}

async function renderAdminStories() {
  await renderAdminLayout('stories', async () => {
    const { stories } = await api('/stories');
    let html = `
      <div class="flex-between mb-24">
        <h1 class="page-title">故事管理</h1>
        <button class="btn btn-primary btn-claw-hover" onclick="openStoryModal()">+ 新建故事</button>
      </div>
    `;
    if (stories.length === 0) {
      html += emptyState('📖', '暂无故事', '点击上方按钮创建第一个故事');
    } else {
      html += '<div class="card-list">';
      stories.forEach(s => {
        html += `
          <div class="card-item">
            <h3 class="card-item-title">${escapeHtml(s.title)}</h3>
            <div class="card-item-meta">⏱ ${s.story_time || '未设置'} · 📅 ${formatDate(s.created_at)}</div>
            <p class="card-item-content">${escapeHtml(s.content)}</p>
            <div class="admin-actions">
              <button class="admin-action-btn" onclick="openStoryModal(${s.id})">编辑</button>
              <button class="admin-action-btn danger" onclick="deleteStory(${s.id})">删除</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    $('#admin-content').innerHTML = html;
  });
}

async function openStoryModal(id) {
  let story = null;
  if (id) {
    const data = await api(`/stories/${id}`);
    story = data.story;
  }
  
  const modal = el('div', { class: 'modal-overlay' });
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${story ? '编辑故事' : '新建故事'}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">标题</label>
          <input type="text" class="form-input" id="story-title" value="${story ? escapeAttr(story.title) : ''}" placeholder="故事标题">
        </div>
        <div class="form-group">
          <label class="form-label">故事时间（用于排序，可选）</label>
          <input type="text" class="form-input" id="story-time" value="${story ? escapeAttr(story.story_time || '') : ''}" placeholder="如：第一纪元·黎明">
        </div>
        <div class="form-group">
          <label class="form-label">正文内容</label>
          <textarea class="form-textarea" id="story-content" placeholder="故事正文...">${story ? escapeHtml(story.content) : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="story-submit">${story ? '保存' : '创建'}</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  
  $('#story-submit').addEventListener('click', async () => {
    const title = $('#story-title').value.trim();
    const content = $('#story-content').value.trim();
    const story_time = $('#story-time').value.trim();
    if (!title || !content) { showToast('标题和内容不能为空', 'error'); return; }
    try {
      if (story) {
        await api(`/stories/${id}`, { method: 'PUT', body: JSON.stringify({ title, content, story_time }) });
        showToast('故事已更新', 'success');
      } else {
        await api('/stories', { method: 'POST', body: JSON.stringify({ title, content, story_time }) });
        showToast('故事已创建', 'success');
      }
      modal.remove();
      renderAdminStories();
    } catch (e) {}
  });
}

async function deleteStory(id) {
  showConfirm('确认删除', '确定要删除这个故事吗？此操作不可逆。', async () => {
    try {
      await api(`/stories/${id}`, { method: 'DELETE' });
      showToast('故事已删除', 'success');
      renderAdminStories();
    } catch (e) {}
  });
}

async function renderAdminCharacters() {
  await renderAdminLayout('characters', async () => {
    const { characters } = await api('/characters');
    let html = `
      <div class="flex-between mb-24">
        <h1 class="page-title">角色管理</h1>
        <button class="btn btn-primary btn-claw-hover" onclick="openCharacterModal()">+ 新建角色</button>
      </div>
    `;
    if (characters.length === 0) {
      html += emptyState('🎭', '暂无角色', '点击上方按钮创建第一个角色');
    } else {
      html += '<div class="card-list">';
      characters.forEach(c => {
        html += `
          <div class="card-item character-card">
            ${c.avatar_url 
              ? `<img class="character-avatar" src="${c.avatar_url}" alt="${escapeHtml(c.name)}">` 
              : `<div class="character-avatar-placeholder">${escapeHtml(c.name.charAt(0))}</div>`
            }
            <h3 class="card-item-title">${escapeHtml(c.name)}</h3>
            <p class="card-item-content">${escapeHtml(c.description || '暂无描述')}</p>
            <div class="admin-actions">
              <button class="admin-action-btn" onclick="openCharacterModal(${c.id})">编辑</button>
              <button class="admin-action-btn danger" onclick="deleteCharacter(${c.id})">删除</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    $('#admin-content').innerHTML = html;
  });
}

async function openCharacterModal(id) {
  let character = null;
  if (id) {
    const data = await api(`/characters/${id}`);
    character = data.character;
  }
  
  const modal = el('div', { class: 'modal-overlay' });
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${character ? '编辑角色' : '新建角色'}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">角色名</label>
          <input type="text" class="form-input" id="char-name" value="${character ? escapeAttr(character.name) : ''}" placeholder="角色名称">
        </div>
        <div class="form-group">
          <label class="form-label">角色描述 / 背景故事</label>
          <textarea class="form-textarea" id="char-desc" placeholder="角色描述...">${character ? escapeHtml(character.description || '') : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">角色头像（可选）</label>
          <div id="avatar-preview-container">
            ${character?.avatar_url ? `<img class="avatar-preview" src="${character.avatar_url}" alt="头像预览">` : ''}
          </div>
          <label class="avatar-upload-label">
            上传头像
            <input type="file" class="avatar-upload-input" id="char-avatar" accept="image/*">
          </label>
          <input type="hidden" id="char-avatar-url" value="${character?.avatar_url || ''}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="char-submit">${character ? '保存' : '创建'}</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  
  // 头像上传（Base64 方式）
  $('#char-avatar').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const data = await api('/upload/avatar', { method: 'POST', body: JSON.stringify({ dataUrl }) });
        $('#char-avatar-url').value = data.url;
        $('#avatar-preview-container').innerHTML = `<img class="avatar-preview" src="${data.url}" alt="头像预览">`;
        showToast('头像上传成功', 'success');
      } catch (e) {
        showToast(e.message || '上传失败', 'error');
      }
    };
    reader.readAsDataURL(file);
  });
  
  $('#char-submit').addEventListener('click', async () => {
    const name = $('#char-name').value.trim();
    const description = $('#char-desc').value.trim();
    const avatar_url = $('#char-avatar-url').value;
    if (!name) { showToast('角色名不能为空', 'error'); return; }
    try {
      if (character) {
        await api(`/characters/${id}`, { method: 'PUT', body: JSON.stringify({ name, description, avatar_url }) });
        showToast('角色已更新', 'success');
      } else {
        await api('/characters', { method: 'POST', body: JSON.stringify({ name, description, avatar_url }) });
        showToast('角色已创建', 'success');
      }
      modal.remove();
      renderAdminCharacters();
    } catch (e) {}
  });
}

async function deleteCharacter(id) {
  showConfirm('确认删除', '确定要删除这个角色吗？相关关系也将被删除。', async () => {
    try {
      await api(`/characters/${id}`, { method: 'DELETE' });
      showToast('角色已删除', 'success');
      renderAdminCharacters();
    } catch (e) {}
  });
}

async function renderAdminSettings() {
  await renderAdminLayout('settings', async () => {
    const { settings } = await api('/settings');
    let html = `
      <div class="flex-between mb-24">
        <h1 class="page-title">设定管理</h1>
        <button class="btn btn-primary btn-claw-hover" onclick="openSettingModal()">+ 新建设定</button>
      </div>
    `;
    if (settings.length === 0) {
      html += emptyState('📋', '暂无设定', '点击上方按钮创建第一个设定');
    } else {
      html += '<div class="card-list">';
      settings.forEach(s => {
        const catIcon = SETTING_CATEGORIES.find(c => c.value === s.category)?.icon || '📋';
        html += `
          <div class="card-item">
            <span class="category-badge">${catIcon} ${s.category}</span>
            <h3 class="card-item-title" style="margin-top:8px;">${escapeHtml(s.title)}</h3>
            <p class="card-item-content">${escapeHtml(s.content)}</p>
            <div class="card-item-meta">📅 ${formatDate(s.created_at)}</div>
            <div class="admin-actions">
              <button class="admin-action-btn" onclick="openSettingModal(${s.id})">编辑</button>
              <button class="admin-action-btn danger" onclick="deleteSetting(${s.id})">删除</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    $('#admin-content').innerHTML = html;
  });
}

async function openSettingModal(id) {
  let setting = null;
  if (id) {
    const data = await api(`/settings/${id}`);
    setting = data.setting;
  }
  
  const modal = el('div', { class: 'modal-overlay' });
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${setting ? '编辑设定' : '新建设定'}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="form-select" id="setting-category">
            <option value="概念" ${setting?.category === '概念' ? 'selected' : ''}>🧠 概念</option>
            <option value="物品" ${setting?.category === '物品' ? 'selected' : ''}>🗡️ 物品</option>
            <option value="事件" ${setting?.category === '事件' ? 'selected' : ''}>⚡ 事件</option>
            <option value="场景" ${setting?.category === '场景' ? 'selected' : ''}>🏙️ 场景</option>
            <option value="势力" ${setting?.category === '势力' ? 'selected' : ''}>🏛️ 势力</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">标题</label>
          <input type="text" class="form-input" id="setting-title" value="${setting ? escapeAttr(setting.title) : ''}" placeholder="设定标题">
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea class="form-textarea" id="setting-content" placeholder="设定内容...">${setting ? escapeHtml(setting.content) : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="setting-submit">${setting ? '保存' : '创建'}</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  
  $('#setting-submit').addEventListener('click', async () => {
    const category = $('#setting-category').value;
    const title = $('#setting-title').value.trim();
    const content = $('#setting-content').value.trim();
    if (!title || !content) { showToast('标题和内容不能为空', 'error'); return; }
    try {
      if (setting) {
        await api(`/settings/${id}`, { method: 'PUT', body: JSON.stringify({ title, content, category }) });
        showToast('设定已更新', 'success');
      } else {
        await api('/settings', { method: 'POST', body: JSON.stringify({ title, content, category }) });
        showToast('设定已创建', 'success');
      }
      modal.remove();
      renderAdminSettings();
    } catch (e) {}
  });
}

async function deleteSetting(id) {
  showConfirm('确认删除', '确定要删除这个设定吗？', async () => {
    try {
      await api(`/settings/${id}`, { method: 'DELETE' });
      showToast('设定已删除', 'success');
      renderAdminSettings();
    } catch (e) {}
  });
}

async function renderAdminRelations() {
  await renderAdminLayout('relations', async () => {
    const { relations } = await api('/relations');
    const { characters } = await api('/characters');
    
    let html = `
      <div class="flex-between mb-24">
        <h1 class="page-title">关系管理</h1>
        <button class="btn btn-primary btn-claw-hover" onclick="openRelationModal()">+ 新建关系</button>
      </div>
    `;
    
    if (relations.length === 0) {
      html += emptyState('🕸️', '暂无关系', '点击上方按钮创建角色关系');
    } else {
      html += '<div class="card-list">';
      relations.forEach(r => {
        html += `
          <div class="card-item">
            <div class="flex-between">
              <span class="text-gold">${escapeHtml(r.name_1)}</span>
              <span class="text-muted text-sm">⇄</span>
              <span class="text-gold">${escapeHtml(r.name_2)}</span>
            </div>
            <p class="text-center mt-16 text-red">${escapeHtml(r.relation_desc)}</p>
            <div class="admin-actions">
              <button class="admin-action-btn danger" onclick="deleteRelation(${r.id})">删除</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    $('#admin-content').innerHTML = html;
  });
}

async function deleteRelation(id) {
  showConfirm('确认删除', '确定要删除这个关系吗？', async () => {
    try {
      await api(`/relations/${id}`, { method: 'DELETE' });
      showToast('关系已删除', 'success');
      renderAdminRelations();
    } catch (e) {}
  });
}

// ==================== 辅助函数 ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function emptyState(icon, title, text) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}🐾</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
    </div>
  `;
}

function notFoundState(type) {
  return `
    <div class="main-container">
      <div class="page">
        ${emptyState('🔍', `${type}未找到`, '它可能已被移除或从未存在')}
      </div>
    </div>
  `;
}

function showConfirm(title, message, onConfirm) {
  const modal = el('div', { class: 'modal-overlay' });
  modal.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-danger" id="confirm-btn">确认</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  $('#confirm-btn').addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
}

// ==================== 初始化 ====================
async function init() {
  if (authToken) {
    try {
      const data = await api('/me');
      currentUser = data.user;
    } catch {
      localStorage.removeItem('anqingju_token');
      authToken = null;
    }
  }
  
  window.addEventListener('hashchange', router);
  router();
}

init();
