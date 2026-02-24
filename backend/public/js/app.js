/**
 * Stockly — Frontend
 * Consome a API em /products (GET, POST, PUT, DELETE).
 * Funções: listar, adicionar, editar nome/quantidade, excluir, buscar, ordenar,
 * dashboard, exportar CSV, tema claro/escuro, atalhos.
 */

const API_BASE = "";
const LOW_STOCK_THRESHOLD = 5;
const FETCH_OPTS = { credentials: "include" };

let allProducts = [];
let lastMovements = [];

const el = {
  loginScreen: document.getElementById("login-screen"),
  appContainer: document.getElementById("app-container"),
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  showRegisterBtn: document.getElementById("show-register"),
  registerForm: document.getElementById("register-form"),
  registerUsername: document.getElementById("register-username"),
  registerPassword: document.getElementById("register-password"),
  registerPasswordConfirm: document.getElementById("register-password-confirm"),
  registerError: document.getElementById("register-error"),
  cancelRegisterBtn: document.getElementById("cancel-register"),
  logoutBtn: document.getElementById("logout-btn"),
  headerUsername: document.getElementById("header-username"),
  form: document.getElementById("form-product"),
  productName: document.getElementById("product-name"),
  productQuantity: document.getElementById("product-quantity"),
  list: document.getElementById("product-list"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  emptyState: document.getElementById("empty-state"),
  emptySearch: document.getElementById("empty-search"),
  searchQuery: document.getElementById("search-query"),
  status: document.getElementById("status"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  exportCsv: document.getElementById("export-csv"),
  themeToggle: document.getElementById("theme-toggle"),
  statTotalProducts: document.getElementById("stat-total-products"),
  statTotalUnits: document.getElementById("stat-total-units"),
  statLowStock: document.getElementById("stat-low-stock"),
  tabProducts: document.getElementById("tab-products"),
  tabHistory: document.getElementById("tab-history"),
  panelProducts: document.getElementById("panel-products"),
  panelHistory: document.getElementById("panel-history"),
  movementList: document.getElementById("movement-list"),
  historyLoading: document.getElementById("history-loading"),
  historyError: document.getElementById("history-error"),
  historyEmpty: document.getElementById("history-empty"),
  historyStatus: document.getElementById("history-status"),
  historyTableWrap: document.querySelector(".history-table-wrap")
  ,
  historyFilterType: document.getElementById("history-filter-type"),
  historyFilterUser: document.getElementById("history-filter-user"),
  historyExportCsv: document.getElementById("history-export-csv")
};

function setStatus(message, type = "") {
  el.status.textContent = message;
  el.status.className = "status" + (type ? " " + type : "");
}

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
  el.loading.hidden = true;
  setStatus("", "error");
}

function hideError() {
  el.error.hidden = true;
  el.error.textContent = "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function movementDetail(m) {
  switch (m.type) {
    case "cadastro":
      return `Quantidade inicial: ${m.quantityAfter}`;
    case "alteração_quantidade":
      return `${m.quantityBefore} → ${m.quantityAfter}`;
    case "alteração_nome":
      return `"${m.nameBefore}" → "${m.nameAfter}"`;
    case "exclusão":
      return `Estoque removido: ${m.quantityBefore} un.`;
    default:
      return "—";
  }
}

// ---------- Autenticação ----------
function showLogin() {
  if (el.loginScreen) el.loginScreen.hidden = false;
  if (el.appContainer) el.appContainer.hidden = true;
}

function showApp(user) {
  if (el.loginScreen) el.loginScreen.hidden = true;
  if (el.appContainer) el.appContainer.hidden = false;
  if (el.headerUsername && user) el.headerUsername.textContent = user.username;
  loadProducts();
}

async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, FETCH_OPTS);
    if (res.ok) {
      const data = await res.json();
      showApp(data.user);
    } else {
      showLogin();
    }
  } catch (_) {
    showLogin();
  }
}

// ---------- API ----------
function handleAuthResponse(res) {
  if (res.status === 401) {
    showLogin();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`, FETCH_OPTS);
  handleAuthResponse(res);
  if (!res.ok) throw new Error("Falha ao carregar produtos. Verifique se o backend está rodando na porta 3001.");
  return res.json();
}

async function addProduct(name, quantity) {
  const res = await fetch(`${API_BASE}/products`, {
    ...FETCH_OPTS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), quantity: Number(quantity) })
  });
  handleAuthResponse(res);
  if (!res.ok) throw new Error("Falha ao adicionar produto.");
  return res.json();
}

async function updateProduct(id, payload) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    ...FETCH_OPTS,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  handleAuthResponse(res);
  if (!res.ok) throw new Error("Falha ao atualizar produto.");
  return res.json();
}

async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`, { ...FETCH_OPTS, method: "DELETE" });
  handleAuthResponse(res);
  if (!res.ok) throw new Error("Falha ao remover produto.");
}

async function fetchMovements() {
  const res = await fetch(`${API_BASE}/movements`, FETCH_OPTS);
  handleAuthResponse(res);
  if (!res.ok) throw new Error("Falha ao carregar histórico.");
  return res.json();
}

// ---------- Abas (Produtos | Histórico) ----------
function switchTab(tabName) {
  const isProducts = tabName === "products";
  if (el.tabProducts) {
    el.tabProducts.classList.toggle("active", isProducts);
    el.tabProducts.setAttribute("aria-selected", isProducts);
  }
  if (el.tabHistory) {
    el.tabHistory.classList.toggle("active", !isProducts);
    el.tabHistory.setAttribute("aria-selected", !isProducts);
  }
  if (el.panelProducts) el.panelProducts.hidden = !isProducts;
  if (el.panelHistory) {
    el.panelHistory.hidden = isProducts;
    if (!isProducts) loadMovements();
  }
}

async function loadMovements() {
  if (!el.movementList) return;
  if (el.historyLoading) el.historyLoading.hidden = false;
  if (el.historyError) {
    el.historyError.hidden = true;
    el.historyError.textContent = "";
  }
  if (el.historyTableWrap) el.historyTableWrap.hidden = true;
  if (el.historyEmpty) el.historyEmpty.hidden = true;
  if (el.historyStatus) el.historyStatus.textContent = "";
  try {
    const list = await fetchMovements();
    lastMovements = list || [];
    if (el.historyLoading) el.historyLoading.hidden = true;
    renderMovements(getFilteredMovements(lastMovements));
  } catch (err) {
    if (el.historyLoading) el.historyLoading.hidden = true;
    if (el.historyError) {
      el.historyError.textContent = err.message;
      el.historyError.hidden = false;
    }
  }
}

function getFilteredMovements(list) {
  const type = el.historyFilterType ? el.historyFilterType.value : "";
  const userQ = el.historyFilterUser ? (el.historyFilterUser.value || "").trim().toLowerCase() : "";
  let filtered = Array.isArray(list) ? [...list] : [];
  if (type) filtered = filtered.filter((m) => m.type === type);
  if (userQ) filtered = filtered.filter((m) => (m.modifiedBy || "").toLowerCase().includes(userQ));
  // keep most recent first
  filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  return filtered;
}

function renderMovements(list) {
  el.movementList.innerHTML = "";
  const total = Array.isArray(lastMovements) ? lastMovements.length : 0;
  const shown = Array.isArray(list) ? list.length : 0;
  if (el.historyStatus) el.historyStatus.textContent = `Mostrando ${shown} de ${total} movimentações`;
  if (!list || list.length === 0) {
    if (el.historyTableWrap) el.historyTableWrap.hidden = true;
    if (el.historyEmpty) el.historyEmpty.hidden = false;
    return;
  }
  if (el.historyTableWrap) el.historyTableWrap.hidden = false;
  if (el.historyEmpty) el.historyEmpty.hidden = true;
  list.forEach((m) => {
    const tr = document.createElement("tr");
    const typeLabel = m.type.replace("_", " ");
    tr.innerHTML = `
      <td>${escapeHtml(formatDateTime(m.createdAt))}</td>
      <td><span class="movement-type ${escapeHtml(m.type)}">${escapeHtml(typeLabel)}</span></td>
      <td>#${m.productId} ${escapeHtml(m.productName)}</td>
      <td class="movement-detail">${escapeHtml(movementDetail(m))}</td>
      <td class="movement-user">${m.modifiedBy ? `<span class="user-badge">${escapeHtml((m.modifiedBy || '').charAt(0).toUpperCase())}</span><span class="user-name">${escapeHtml(m.modifiedBy)}</span>` : '—'}</td>
    `;
    el.movementList.appendChild(tr);
  });
}

// Export history CSV (current filtered list)
async function exportHistoryCsv() {
  try {
    const filtered = getFilteredMovements(lastMovements);
    const headers = ["id", "createdAt", "type", "productId", "productName", "detail", "modifiedBy"];
    const rows = filtered.map((m) => [m.id, m.createdAt, m.type, m.productId, `"${String(m.productName || '').replace(/"/g, '""')}"`, `"${String(movementDetail(m)).replace(/"/g, '""')}"`, m.modifiedBy || ""]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stockly-movements-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("CSV de histórico exportado.", "success");
    setTimeout(() => setStatus(""), 2000);
  } catch (err) {
    if (el.historyError) {
      el.historyError.textContent = err.message || "Erro ao exportar.";
      el.historyError.hidden = false;
    }
  }
}

// ---------- Filtro e ordenação ----------
function getFilteredAndSortedProducts() {
  const query = (el.search && el.search.value.trim().toLowerCase()) || "";
  let list = query
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query))
    : [...allProducts];

  const sortValue = el.sort ? el.sort.value : "name-asc";
  if (sortValue === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortValue === "name-desc") list.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortValue === "qty-desc") list.sort((a, b) => Number(b.quantity) - Number(a.quantity));
  else if (sortValue === "qty-asc") list.sort((a, b) => Number(a.quantity) - Number(b.quantity));

  return list;
}

// ---------- Dashboard ----------
function updateStats() {
  const total = allProducts.length;
  const units = allProducts.reduce((acc, p) => acc + Number(p.quantity), 0);
  const low = allProducts.filter((p) => Number(p.quantity) < LOW_STOCK_THRESHOLD).length;

  if (el.statTotalProducts) el.statTotalProducts.textContent = total;
  if (el.statTotalUnits) el.statTotalUnits.textContent = units;
  if (el.statLowStock) el.statLowStock.textContent = low;
}

// ---------- Renderizar lista (tabela desktop) ----------
function renderProduct(product) {
  const tr = document.createElement("tr");
  tr.className = "product-item";
  tr.dataset.id = product.id;
  const qty = Number(product.quantity);
  if (qty < LOW_STOCK_THRESHOLD) tr.classList.add("low-stock");

  const nameDisplay = document.createElement("span");
  nameDisplay.className = "product-name";
  nameDisplay.textContent = product.name;

  const nameWrap = document.createElement("div");
  nameWrap.className = "product-name-wrap";
  nameWrap.appendChild(nameDisplay);
  if (qty < LOW_STOCK_THRESHOLD) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Estoque baixo";
    nameWrap.appendChild(badge);
  }

  const quantityValue = document.createElement("span");
  quantityValue.className = "product-quantity-value";
  quantityValue.textContent = qty;

  const inputQty = document.createElement("input");
  inputQty.type = "number";
  inputQty.min = 0;
  inputQty.value = qty;
  inputQty.setAttribute("aria-label", `Quantidade de ${product.name}`);
  inputQty.dataset.inputQty = "";

  const btnSaveQty = document.createElement("button");
  btnSaveQty.type = "button";
  btnSaveQty.className = "btn btn-edit";
  btnSaveQty.setAttribute("aria-label", "Salvar quantidade");
  btnSaveQty.textContent = "Salvar";

  const btnEditName = document.createElement("button");
  btnEditName.type = "button";
  btnEditName.className = "btn btn-edit";
  btnEditName.setAttribute("aria-label", "Editar nome");
  btnEditName.textContent = "Editar nome";

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn btn-delete";
  btnDelete.setAttribute("aria-label", "Excluir produto");
  btnDelete.textContent = "Excluir";

  const tdId = document.createElement("td");
  tdId.className = "td-id";
  tdId.textContent = product.id;

  const tdName = document.createElement("td");
  tdName.className = "td-name";
  tdName.appendChild(nameWrap);

  const tdQty = document.createElement("td");
  tdQty.className = "td-qty";
  tdQty.appendChild(quantityValue);
  tdQty.appendChild(inputQty);

  const tdActions = document.createElement("td");
  tdActions.className = "td-actions";
  tdActions.append(btnSaveQty, btnEditName, btnDelete);

  tr.append(tdId, tdName, tdQty, tdActions);

  // Salvar quantidade
  btnSaveQty.addEventListener("click", async () => {
    const newQty = inputQty.value.trim();
    if (newQty === "" || Number(newQty) < 0) return;
    setStatus("Salvando…");
    hideError();
    try {
      const updated = await updateProduct(product.id, { quantity: Number(newQty) });
      const idx = allProducts.findIndex((p) => p.id === product.id);
      if (idx !== -1) allProducts[idx] = updated;
      quantityValue.textContent = newQty;
      inputQty.value = newQty;
      updateStats();
      updateLowStockClass(tr, Number(newQty));
      setStatus("Quantidade atualizada.", "success");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      showError(err.message);
    }
  });

  // Editar nome (alternar para input)
  btnEditName.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "product-name-edit";
    input.value = product.name;
    input.setAttribute("aria-label", "Novo nome do produto");
    nameWrap.replaceChildren(input);
    input.focus();
    input.select();

    const saveName = async () => {
      const newName = input.value.trim();
      if (!newName) {
        nameWrap.replaceChildren(nameDisplay);
        if (qty < LOW_STOCK_THRESHOLD) nameWrap.appendChild(createLowStockBadge());
        return;
      }
      setStatus("Salvando…");
      hideError();
      try {
        const updated = await updateProduct(product.id, { name: newName });
        const idx = allProducts.findIndex((p) => p.id === product.id);
        if (idx !== -1) allProducts[idx] = updated;
        nameDisplay.textContent = newName;
        nameWrap.replaceChildren(nameDisplay);
        if (Number(updated.quantity) < LOW_STOCK_THRESHOLD) nameWrap.appendChild(createLowStockBadge());
        setStatus("Nome atualizado.", "success");
        setTimeout(() => setStatus(""), 2000);
      } catch (err) {
        showError(err.message);
      }
    };

    input.addEventListener("blur", saveName, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
      if (e.key === "Escape") {
        nameWrap.replaceChildren(nameDisplay);
        if (qty < LOW_STOCK_THRESHOLD) nameWrap.appendChild(createLowStockBadge());
      }
    });
  });

  function createLowStockBadge() {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = "Estoque baixo";
    return b;
  }

  // Excluir (confirmação nativa do navegador)
  btnDelete.addEventListener("click", async () => {
    if (!confirm(`Excluir "${product.name}" do estoque?`)) return;
    setStatus("Excluindo…");
    hideError();
    try {
      await deleteProduct(product.id);
      allProducts = allProducts.filter((p) => p.id !== product.id);
      renderList();
      updateStats();
      setStatus("Produto excluído.", "success");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      showError(err.message);
    }
  });

  return tr;
}

function updateLowStockClass(row, qty) {
  if (qty < LOW_STOCK_THRESHOLD) {
    row.classList.add("low-stock");
    const nameWrap = row.querySelector(".product-name-wrap");
    if (nameWrap && !nameWrap.querySelector(".badge")) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Estoque baixo";
      nameWrap.appendChild(badge);
    }
  } else {
    row.classList.remove("low-stock");
    const badge = row.querySelector(".badge");
    if (badge) badge.remove();
  }
}

function renderList() {
  const filtered = getFilteredAndSortedProducts();
  el.list.innerHTML = "";
  filtered.forEach((p) => el.list.appendChild(renderProduct(p)));

  const tableWrap = document.querySelector(".table-wrap");
  if (tableWrap) tableWrap.hidden = filtered.length === 0;

  const query = el.search && el.search.value.trim();
  el.emptyState.hidden = allProducts.length > 0;
  if (el.emptySearch) {
    el.emptySearch.hidden = !(allProducts.length > 0 && filtered.length === 0);
    if (el.searchQuery) el.searchQuery.textContent = query || "";
  }
}

// ---------- Busca e ordenação ----------
if (el.search) {
  el.search.addEventListener("input", renderList);
  el.search.addEventListener("search", renderList);
}
if (el.sort) {
  el.sort.addEventListener("change", renderList);
}

// ---------- Exportar CSV ----------
if (el.exportCsv) {
  el.exportCsv.addEventListener("click", () => {
    const list = getFilteredAndSortedProducts();
    const headers = ["id", "nome", "quantidade"];
    const rows = list.map((p) => [p.id, `"${String(p.name).replace(/"/g, '""')}"`, p.quantity]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stockly-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("CSV exportado.", "success");
    setTimeout(() => setStatus(""), 2000);
  });
}

// ---------- Tema ----------
function applyTheme(light) {
  if (light) {
    document.body.classList.add("light");
    if (el.themeToggle) el.themeToggle.textContent = "🌙";
  } else {
    document.body.classList.remove("light");
    if (el.themeToggle) el.themeToggle.textContent = "☀️";
  }
  try {
    localStorage.setItem("stockly-theme", light ? "light" : "dark");
  } catch (_) {}
}

if (el.themeToggle) {
  el.themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    el.themeToggle.textContent = isLight ? "🌙" : "☀️";
    try {
      localStorage.setItem("stockly-theme", isLight ? "light" : "dark");
    } catch (_) {}
  });
  try {
    const saved = localStorage.getItem("stockly-theme");
    if (saved === "light") applyTheme(true);
  } catch (_) {}
}

// ---------- Abas: cliques ----------
if (el.tabProducts) {
  el.tabProducts.addEventListener("click", () => switchTab("products"));
}
if (el.tabHistory) {
  el.tabHistory.addEventListener("click", () => switchTab("history"));
}

// ---------- Atalhos ----------
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (el.search && document.activeElement === el.search) {
      el.search.value = "";
      renderList();
      el.search.blur();
    }
    return;
  }
  if (e.key === "/" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (el.search) {
      el.search.focus();
    }
  }
});

// ---------- Formulário e carga inicial ----------
function updateEmptyState() {
  el.emptyState.hidden = allProducts.length > 0;
}

el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = el.productName.value.trim();
  const quantity = el.productQuantity.value;
  if (!name) return;

  setStatus("Adicionando…");
  hideError();
  try {
    const created = await addProduct(name, quantity);
    allProducts.push(created);
    renderList();
    updateStats();
    el.productName.value = "";
    el.productQuantity.value = "0";
    setStatus("Produto adicionado.", "success");
    setTimeout(() => setStatus(""), 2000);
  } catch (err) {
    showError(err.message);
  }
});

async function loadProducts() {
  el.loading.hidden = false;
  el.list.innerHTML = "";
  el.emptyState.hidden = true;
  if (el.emptySearch) el.emptySearch.hidden = true;
  hideError();
  setStatus("");

  try {
    allProducts = await fetchProducts();
    el.loading.hidden = true;
    updateStats();
    renderList();
  } catch (err) {
    showError(err.message);
  }
}

// ---------- Login / Logout ----------
if (el.loginForm) {
  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (el.loginError) {
      el.loginError.hidden = true;
      el.loginError.textContent = "";
    }
    const username = el.loginUsername ? el.loginUsername.value.trim() : "";
    const password = el.loginPassword ? el.loginPassword.value : "";
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        ...FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showApp(data.user);
      } else {
        if (el.loginError) {
          el.loginError.textContent = data.message || "Usuário ou senha inválidos.";
          el.loginError.hidden = false;
        }
      }
    } catch (err) {
      if (el.loginError) {
        el.loginError.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
        el.loginError.hidden = false;
      }
    }
  });
}

// Mostrar form de registro
if (el.showRegisterBtn) {
  el.showRegisterBtn.addEventListener("click", () => {
    if (el.loginForm) el.loginForm.hidden = true;
    if (el.registerForm) el.registerForm.hidden = false;
    // hide login footer while registering
    const footer = document.querySelector('.login-footer');
    if (footer) footer.hidden = true;
    // focus first input
    if (el.registerUsername) {
      setTimeout(() => el.registerUsername.focus(), 50);
    }
  });
}

if (el.cancelRegisterBtn) {
  el.cancelRegisterBtn.addEventListener("click", () => {
    if (el.registerForm) el.registerForm.hidden = true;
    if (el.loginForm) el.loginForm.hidden = false;
    if (el.registerError) {
      el.registerError.hidden = true;
      el.registerError.textContent = "";
    }
    const footer = document.querySelector('.login-footer');
    if (footer) footer.hidden = false;
  });
}

// Ensure register form is hidden on load and footer visible
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('.login-footer');
  if (footer) footer.hidden = !!(document.getElementById('register-form') && !document.getElementById('register-form').hidden);
  const rf = document.getElementById('register-form');
  if (rf) rf.hidden = true;
});

// Registro de usuário
if (el.registerForm) {
  el.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (el.registerError) {
      el.registerError.hidden = true;
      el.registerError.textContent = "";
    }
    const username = el.registerUsername ? el.registerUsername.value.trim() : "";
    const password = el.registerPassword ? el.registerPassword.value : "";
    const confirm = el.registerPasswordConfirm ? el.registerPasswordConfirm.value : "";
    if (!username || !password) {
      if (el.registerError) {
        el.registerError.textContent = "Usuário e senha são obrigatórios.";
        el.registerError.hidden = false;
      }
      return;
    }
    if (password !== confirm) {
      if (el.registerError) {
        el.registerError.textContent = "As senhas não coincidem.";
        el.registerError.hidden = false;
      }
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        ...FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showApp(data.user);
      } else {
        if (el.registerError) {
          el.registerError.textContent = data.message || "Erro ao criar usuário.";
          el.registerError.hidden = false;
        }
      }
    } catch (err) {
      if (el.registerError) {
        el.registerError.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
        el.registerError.hidden = false;
      }
    }
  });
}

if (el.logoutBtn) {
  el.logoutBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { ...FETCH_OPTS, method: "POST" });
    } catch (_) {}
    showLogin();
  });
}

// Inicia: verifica se já está logado
checkAuth();
