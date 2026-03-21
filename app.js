const products = [
  {
    id: 1,
    name: "Худи «Полярная ночь»",
    price: 4200,
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: 2,
    name: "Пуховик «Северное сияние»",
    price: 9800,
    sizes: ["M", "L"],
  },
  {
    id: 3,
    name: "Термолонгслив «Арктика»",
    price: 2900,
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: 4,
    name: "Шапка «Полярный день»",
    price: 1600,
    sizes: ["ONE SIZE"],
  },
];

const cart = [];
const purchaseHistory = [];
const HISTORY_STORAGE_KEY = "polar-day-purchase-history-v1";

function formatPrice(value) {
  return value.toLocaleString("ru-RU");
}

function formatDate(dateISO) {
  const date = new Date(dateISO);
  return date.toLocaleString("ru-RU");
}

function paymentLabel(paymentCode) {
  return paymentCode === "cash" ? "Наличные" : "Безналичная оплата";
}

function pickupLabel(pickupCode) {
  if (pickupCode === "center") return "ТЦ «Полярный День», центр";
  if (pickupCode === "north") return "ТЦ «Арктика», север";
  return pickupCode;
}

function loadPurchaseHistory() {
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      purchaseHistory.splice(0, purchaseHistory.length, ...parsed);
    }
  } catch (error) {
    console.warn("Не удалось прочитать историю покупок:", error);
  }
}

function savePurchaseHistory() {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(purchaseHistory));
}

function updateHistoryUI() {
  const emptyState = document.getElementById("history-empty");
  const historyList = document.getElementById("history-list");

  if (purchaseHistory.length === 0) {
    emptyState.classList.remove("hidden");
    historyList.classList.add("hidden");
    historyList.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  historyList.classList.remove("hidden");
  historyList.innerHTML = "";

  purchaseHistory.forEach((order, index) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-item__head">
        <div class="history-item__title">Заказ #${purchaseHistory.length - index}</div>
        <div class="history-item__meta">${formatDate(order.createdAt)}</div>
      </div>
      <div class="history-item__meta">Покупатель: ${order.name}, телефон: ${order.phone}</div>
      <div class="history-item__meta">Самовывоз: ${pickupLabel(order.pickup)} | Оплата: ${paymentLabel(order.payment)}</div>
      <ul class="history-item__list">
        ${order.items
          .map(
            (line) =>
              `<li>${line.name} — размер ${line.size}, ${line.qty} шт., ${formatPrice(line.lineTotal)} ₽</li>`
          )
          .join("")}
      </ul>
      <div class="history-item__total">Итого: ${formatPrice(order.total)} ₽</div>
    `;
    historyList.appendChild(item);
  });
}

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__title">${product.name}</div>
      <div class="product-card__meta">
        <span>Размер</span>
        <span>от ${formatPrice(product.price)} ₽</span>
      </div>
      <select class="size-select" data-product-id="${product.id}">
        <option value="">Выберите размер</option>
        ${product.sizes.map((s) => `<option value="${s}">${s}</option>`).join("")}
      </select>
      <div class="product-card__footer">
        <span class="product-card__price">${formatPrice(product.price)} ₽</span>
        <button class="btn btn--primary" data-add-to-cart="${product.id}">
          В корзину
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

function findCartItem(productId, size) {
  return cart.find((item) => item.productId === productId && item.size === size);
}

function updateCartUI() {
  const emptyState = document.getElementById("cart-empty");
  const cartItemsContainer = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  const totalElement = document.getElementById("cart-total");

  if (cart.length === 0) {
    emptyState.classList.remove("hidden");
    cartItemsContainer.classList.add("hidden");
    summary.classList.add("hidden");
    cartItemsContainer.innerHTML = "";
    totalElement.textContent = "0";
    return;
  }

  emptyState.classList.add("hidden");
  cartItemsContainer.classList.remove("hidden");
  summary.classList.remove("hidden");

  cartItemsContainer.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    const row = document.createElement("div");
    row.className = "cart-item";
    const lineTotal = product.price * item.qty;
    total += lineTotal;

    row.innerHTML = `
      <div>
        <div class="cart-item__title">${product.name}</div>
        <div class="cart-item__size">Размер: ${item.size}</div>
      </div>
      <div class="cart-item__price">${formatPrice(product.price)} ₽</div>
      <div class="cart-item__controls">
        <button class="cart-qty-btn" data-dec="${product.id}" data-size="${item.size}">−</button>
        <span class="cart-qty">${item.qty}</span>
        <button class="cart-qty-btn" data-inc="${product.id}" data-size="${item.size}">+</button>
      </div>
      <div style="text-align: right;">
        <div class="cart-item__price">${formatPrice(lineTotal)} ₽</div>
        <button class="cart-remove" data-remove="${product.id}" data-size="${item.size}">Удалить</button>
      </div>
    `;

    cartItemsContainer.appendChild(row);
  });

  totalElement.textContent = formatPrice(total);
}

function scrollToCheckout() {
  document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  loadPurchaseHistory();
  renderProducts();
  updateCartUI();
  updateHistoryUI();

  const productList = document.getElementById("product-list");
  const cartItemsContainer = document.getElementById("cart-items");
  const goToCheckoutBtn = document.getElementById("go-to-checkout");
  const checkoutForm = document.getElementById("checkout-form");
  const statusEl = document.getElementById("order-status");

  productList.addEventListener("click", (event) => {
    const addBtn = event.target.closest("[data-add-to-cart]");
    if (!addBtn) return;

    const productId = Number(addBtn.dataset.addToCart);
    const sizeSelect = productList.querySelector(`.size-select[data-product-id="${productId}"]`);
    const size = sizeSelect?.value;

    if (!size) {
      window.alert("Пожалуйста, выберите размер перед добавлением в корзину.");
      return;
    }

    const existing = findCartItem(productId, size);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ productId, size, qty: 1 });
    }

    updateCartUI();
  });

  cartItemsContainer.addEventListener("click", (event) => {
    const target = event.target;

    if (target.matches("[data-inc]")) {
      const productId = Number(target.dataset.inc);
      const size = target.dataset.size;
      const item = findCartItem(productId, size);
      if (item) {
        item.qty += 1;
        updateCartUI();
      }
    } else if (target.matches("[data-dec]")) {
      const productId = Number(target.dataset.dec);
      const size = target.dataset.size;
      const item = findCartItem(productId, size);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) {
          const index = cart.indexOf(item);
          cart.splice(index, 1);
        }
        updateCartUI();
      }
    } else if (target.matches("[data-remove]")) {
      const productId = Number(target.dataset.remove);
      const size = target.dataset.size;
      const index = cart.findIndex((item) => item.productId === productId && item.size === size);
      if (index !== -1) {
        cart.splice(index, 1);
        updateCartUI();
      }
    }
  });

  goToCheckoutBtn.addEventListener("click", scrollToCheckout);

  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();

    statusEl.textContent = "";
    statusEl.classList.remove("order-status--success", "order-status--error");

    if (cart.length === 0) {
      statusEl.textContent = "Добавьте хотя бы один товар в корзину перед оформлением.";
      statusEl.classList.add("order-status--error");
      return;
    }

    const formData = new FormData(checkoutForm);
    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const pickup = formData.get("pickup")?.toString();
    const payment = formData.get("payment")?.toString();

    if (!name || !phone || !pickup || !payment) {
      statusEl.textContent = "Пожалуйста, заполните обязательные поля: имя, телефон, пункт самовывоза и способ оплаты.";
      statusEl.classList.add("order-status--error");
      return;
    }

    const orderItems = cart.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const lineTotal = (product?.price || 0) * item.qty;
      return {
        name: product?.name || "Товар",
        size: item.size,
        qty: item.qty,
        lineTotal,
      };
    });
    const orderTotal = orderItems.reduce((sum, line) => sum + line.lineTotal, 0);

    console.log("Новый заказ:", {
      name,
      phone,
      pickup,
      payment,
      comment: formData.get("comment")?.toString(),
      items: orderItems,
      total: orderTotal,
    });

    purchaseHistory.unshift({
      createdAt: new Date().toISOString(),
      name,
      phone,
      pickup,
      payment,
      comment: formData.get("comment")?.toString() || "",
      items: orderItems,
      total: orderTotal,
    });
    savePurchaseHistory();
    updateHistoryUI();

    statusEl.textContent = "Заказ подтверждён! Это черновая версия — данные никуда не отправляются.";
    statusEl.classList.add("order-status--success");

    cart.splice(0, cart.length);
    updateCartUI();
    checkoutForm.reset();
  });
});

