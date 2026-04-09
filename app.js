/**
 * Полярный день — учебное приложение магазина.
 * Всё хранится в localStorage браузера (нет сервера).
 * Разделение по ключам: пользователи, текущая сессия, корзина, заказы.
 */

// --- Константы ключей localStorage (одно место — проще менять)
const LS_USERS = "polar_day_users"; // { email: { password, ... } } — пароль в открытом виде только для учёбы
const LS_SESSION = "polar_day_session"; // email вошедшего пользователя или null
const LS_CART_PREFIX = "polar_day_cart_"; // корзина на пользователя: polar_day_cart_email
const LS_ORDERS_PREFIX = "polar_day_orders_"; // заказы: polar_day_orders_email

/**
 * Каталог товаров V1 — статичный массив.
 * Позже можно вынести в отдельный JSON или подгружать с сервера.
 */
const PRODUCTS = [
  { id: "p1", name: "Куртка «Север»", price: 4990, note: "Утеплитель, ветрозащита" },
  { id: "p2", name: "Шапка «Полярная»", price: 1290, note: "Шерсть, универсальный размер" },
  { id: "p3", name: "Перчатки «Лёд»", price: 890, note: "Сенсорные пальцы" },
  { id: "p4", name: "Свитер «Тундра»", price: 3490, note: "Вязаный, oversize" },
];

// --- Утилиты localStorage
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSessionEmail() {
  return readJson(LS_SESSION, null);
}

function setSessionEmail(email) {
  if (email) writeJson(LS_SESSION, email);
  else localStorage.removeItem(LS_SESSION);
}

function cartKey(email) {
  return LS_CART_PREFIX + email;
}

function ordersKey(email) {
  return LS_ORDERS_PREFIX + email;
}

function getUsers() {
  return readJson(LS_USERS, {});
}

function saveUsers(users) {
  writeJson(LS_USERS, users);
}

/** Корзина: массив { id, qty } */
function getCart(email) {
  if (!email) return [];
  return readJson(cartKey(email), []);
}

function saveCart(email, items) {
  if (!email) return;
  writeJson(cartKey(email), items);
}

/** Заказы: массив { id, date, items, total } */
function getOrders(email) {
  if (!email) return [];
  return readJson(ordersKey(email), []);
}

function saveOrders(email, orders) {
  if (!email) return;
  writeJson(ordersKey(email), orders);
}

// --- UI: всплывающее сообщение
function showToast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.hidden = true;
  }, 2800);
}

/** Переключение видимых экранов */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.hidden = s.id !== "screen-" + name;
  });
}

/** Обновить шапку: кто вошёл, кнопки */
function refreshHeader() {
  const email = getSessionEmail();
  const badge = document.getElementById("user-badge");
  const btnLogout = document.getElementById("btn-logout");
  const btnAuth = document.getElementById("btn-auth");
  if (email) {
    badge.textContent = email;
    badge.hidden = false;
    btnLogout.hidden = false;
    btnAuth.textContent = "Аккаунт";
  } else {
    badge.hidden = true;
    btnLogout.hidden = true;
    btnAuth.textContent = "Вход / Регистрация";
  }
}

/** Нарисовать каталог */
function renderCatalog() {
  const root = document.getElementById("catalog-list");
  root.innerHTML = "";
  PRODUCTS.forEach((p) => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h3>${escapeHtml(p.name)}</h3>
      <p class="price">${p.price} ₽</p>
      <p class="hint" style="margin:0 0 0.75rem">${escapeHtml(p.note)}</p>
    `;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-add";
    btn.textContent = "В корзину";
    btn.addEventListener("click", () => addToCart(p.id));
    div.appendChild(btn);
    root.appendChild(div);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function findProduct(id) {
  return PRODUCTS.find((x) => x.id === id);
}

/** Добавить единицу товара в корзину */
function addToCart(productId) {
  const email = getSessionEmail();
  if (!email) {
    showToast("Сначала войдите или зарегистрируйтесь");
    showScreen("auth");
    return;
  }
  const cart = getCart(email);
  const row = cart.find((c) => c.id === productId);
  if (row) row.qty += 1;
  else cart.push({ id: productId, qty: 1 });
  saveCart(email, cart);
  showToast("Добавлено в корзину");
  renderCart();
}

/** Пересчёт и отрисовка корзины + формы оплаты */
function renderCart() {
  const email = getSessionEmail();
  const emptyEl = document.getElementById("cart-empty");
  const blockEl = document.getElementById("cart-block");
  const listEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (!email) {
    emptyEl.textContent = "Войдите, чтобы пользоваться корзиной.";
    emptyEl.hidden = false;
    blockEl.hidden = true;
    listEl.innerHTML = "";
    return;
  }

  const cart = getCart(email);
  if (cart.length === 0) {
    emptyEl.textContent = "Корзина пуста. Добавьте товары из каталога.";
    emptyEl.hidden = false;
    blockEl.hidden = true;
    listEl.innerHTML = "";
    return;
  }

  emptyEl.hidden = true;
  blockEl.hidden = false;
  listEl.innerHTML = "";
  let total = 0;

  cart.forEach((row) => {
    const p = findProduct(row.id);
    if (!p) return;
    const sum = p.price * row.qty;
    total += sum;
    const li = document.createElement("li");
    // Левая часть — название и сумма строки; справа — кнопка удаления
    li.innerHTML = `<span class="cart-line-main">${escapeHtml(p.name)} × ${row.qty} — ${sum} ₽</span>`;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "Убрать";
    rm.addEventListener("click", () => removeLine(email, row.id));
    li.appendChild(rm);
    listEl.appendChild(li);
  });

  totalEl.textContent = String(total);
}

function removeLine(email, productId) {
  let cart = getCart(email).filter((c) => c.id !== productId);
  saveCart(email, cart);
  renderCart();
  showToast("Товар убран");
}

/** Учебная «оплата»: проверяем, что поля не пустые, сохраняем заказ, очищаем корзину */
function handlePaySubmit(e) {
  e.preventDefault();
  const email = getSessionEmail();
  if (!email) {
    showToast("Войдите в аккаунт");
    return;
  }
  const form = e.target;
  const holder = form.holder.value.trim();
  const card = form.card.value.replace(/\s/g, "");
  const exp = form.exp.value.trim();
  const cvc = form.cvc.value.trim();

  // Минимальная проверка «как будто карта» — только для учебы
  if (holder.length < 2 || card.length < 12 || exp.length < 4 || cvc.length < 3) {
    showToast("Заполните данные карты");
    return;
  }

  const cart = getCart(email);
  if (cart.length === 0) {
    showToast("Корзина пуста");
    return;
  }

  let total = 0;
  const snapshot = cart.map((row) => {
    const p = findProduct(row.id);
    if (!p) return null;
    const lineTotal = p.price * row.qty;
    total += lineTotal;
    return { name: p.name, price: p.price, qty: row.qty, lineTotal };
  }).filter(Boolean);

  const order = {
    id: "ord_" + Date.now(),
    date: new Date().toISOString(),
    items: snapshot,
    total,
  };

  const orders = getOrders(email);
  orders.unshift(order); // новые сверху
  saveOrders(email, orders);
  saveCart(email, []);
  form.reset();
  showToast("Заказ оформлен (учебная оплата)");
  renderCart();
  renderHistory();
}

function renderHistory() {
  const email = getSessionEmail();
  const guest = document.getElementById("history-guest");
  const list = document.getElementById("history-list");

  if (!email) {
    guest.hidden = false;
    list.hidden = true;
    list.innerHTML = "";
    return;
  }

  guest.hidden = true;
  const orders = getOrders(email);
  if (orders.length === 0) {
    list.hidden = false;
    list.innerHTML = '<p class="hint">Пока нет покупок.</p>';
    return;
  }

  list.hidden = false;
  list.innerHTML = "";
  orders.forEach((o) => {
    const div = document.createElement("div");
    div.className = "order";
    const date = new Date(o.date).toLocaleString("ru-RU");
    const lines = (o.items || [])
      .map((i) => `${escapeHtml(i.name)} × ${i.qty} — ${i.lineTotal} ₽`)
      .join("<br>");
    div.innerHTML = `
      <div class="meta">Заказ ${escapeHtml(o.id)} · ${escapeHtml(date)}</div>
      <div>${lines}</div>
      <p><strong>Итого: ${o.total} ₽</strong></p>
    `;
    list.appendChild(div);
  });
}

// --- Обработчики форм регистрации и входа
document.getElementById("form-register").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email")).trim().toLowerCase();
  const password = String(fd.get("password"));
  if (!email || !password) return;

  const users = getUsers();
  if (users[email]) {
    showToast("Такой email уже зарегистрирован");
    return;
  }
  users[email] = { password, createdAt: new Date().toISOString() };
  saveUsers(users);
  setSessionEmail(email);
  saveCart(email, getCart(email));
  showToast("Регистрация успешна");
  refreshHeader();
  renderCart();
  renderHistory();
  showScreen("catalog");
});

document.getElementById("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email")).trim().toLowerCase();
  const password = String(fd.get("password"));
  const users = getUsers();
  const u = users[email];
  if (!u || u.password !== password) {
    showToast("Неверный email или пароль");
    return;
  }
  setSessionEmail(email);
  showToast("Добро пожаловать");
  refreshHeader();
  renderCart();
  renderHistory();
  showScreen("catalog");
});

document.getElementById("btn-logout").addEventListener("click", () => {
  setSessionEmail(null);
  refreshHeader();
  renderCart();
  renderHistory();
  showToast("Вы вышли");
  showScreen("auth");
});

document.getElementById("form-pay").addEventListener("submit", handlePaySubmit);

// Навигация по экранам
document.querySelectorAll("[data-screen]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-screen");
    if (name === "cart" || name === "history") {
      renderCart();
      renderHistory();
    }
    showScreen(name);
  });
});

// Старт: каталог по умолчанию, если уже вошли — иначе форма входа
function init() {
  renderCatalog();
  refreshHeader();
  const email = getSessionEmail();
  if (email && getUsers()[email]) {
    showScreen("catalog");
  } else {
    if (email) setSessionEmail(null);
    showScreen("auth");
  }
  renderCart();
  renderHistory();
}

init();
