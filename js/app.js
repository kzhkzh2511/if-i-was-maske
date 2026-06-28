// ============================================================
// 假如我是马斯克 — 核心逻辑

// ============================================================

// ===================== STATE =====================
const state = {
    currentCharId: 'musk',
    cart: {},           // { itemId: quantity }
    wealth: 0,          // current displayed wealth
    totalLoan: 0,       // accumulated loan debt
    loanCount: 0,       // number of loans taken
    checkoutCompleted: false,
    loanedItems: [],
};

// ===================== DOM REFS =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    charStrip: $('#characterStrip'),
    catTabs: $('#categoryTabs'),
    productGrid: $('#productGrid'),
    wealthDisplay: $('#wealthDisplay'),
    debtDisplay: $('#debtDisplay'),
    debtAmount: $('#debtAmount'),
    cartFab: $('#cartFab'),
    cartBadge: $('#cartBadge'),
    cartDrawer: $('#cartDrawer'),
    cartOverlay: $('#cartOverlay'),
    cartClose: $('#cartClose'),
    cartBody: $('#cartBody'),
    cartEmpty: $('#cartEmpty'),
    cartItems: $('#cartItems'),
    cartFooter: $('#cartFooter'),
    cartTotal: $('#cartTotal'),
    cartRemain: $('#cartRemain'),
    cartLoanRow: $('#cartLoanRow'),
    cartLoan: $('#cartLoan'),
    btnCheckout: $('#btnCheckout'),
    checkoutOverlay: $('#checkoutOverlay'),
    checkoutModal: $('#checkoutModal'),
    checkoutClose: $('#checkoutClose'),
    checkoutCharName: $('#checkoutCharName'),
    checkoutTime: $('#checkoutTime'),
    checkoutItems: $('#checkoutItems'),
    checkoutTotal: $('#checkoutTotal'),
    checkoutRemain: $('#checkoutRemain'),
    checkoutLoanRow: $('#checkoutLoanRow'),
    checkoutLoan: $('#checkoutLoan'),
    checkoutPercent: $('#checkoutPercent'),
    checkoutReview: $('#checkoutReview'),
    checkoutBody: $('#checkoutBody'),
    checkoutSuccess: $('#checkoutSuccess'),
    successSub: $('#successSub'),
    btnConfirmCheckout: $('#btnConfirmCheckout'),
    btnSaveImage: $('#btnSaveImage'),
    btnCopyReceipt: $('#btnCopyReceipt'),
    btnDone: $('#btnDone'),
    checkoutCancel: $('#checkoutCancel'),
    billCanvas: $('#billCanvas'),
    loanOverlay: $('#loanOverlay'),
    loanModal: $('#loanModal'),
    loanManagerName: $('#loanManagerName'),
    loanManagerSay: $('#loanManagerSay'),
    loanAmount: $('#loanAmount'),
    loanRate: $('#loanRate'),
    loanYears: $('#loanYears'),
    loanMonthly: $('#loanMonthly'),
    loanCollateral: $('#loanCollateral'),
    loanTotalDebt: $('#loanTotalDebt'),
    loanCurrentDebt: $('#loanCurrentDebt'),
    loanConfirm: $('#loanConfirm'),
    loanCancel: $('#loanCancel'),
    btnReset: $('#btnReset'),
    toastContainer: $('#toastContainer'),
    header: $('#header'),
    btnLoan: $('#btnLoan'),
};

// ===================== CONSTANTS =====================
const WEALTH_ANIM_MIN_MS = 200;
const WEALTH_ANIM_MAX_MS = 800;
const WEALTH_ANIM_SCALE = 0.00000001;  // diff * scale = duration
const TOAST_DURATION_MS = 3000;
const TOAST_MAX_VISIBLE = 3;
const CANVAS_PADDING = 40;
const CANVAS_LINE_HEIGHT = 24;
const CART_FAB_BOTTOM_DESKTOP = 32;
const MAX_LOAN_RATIO = 100;  // max total loan = character.wealth * this

// ===================== UTILITY =====================
function formatMoney(n) {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6)  return '$' + (n / 1e6).toFixed(1) + 'M';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyFull(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getChar() {
    return CHARACTERS.find(c => c.id === state.currentCharId);
}

function getItem(id) {
    return ITEMS.find(i => i.id === id);
}

function getCartItems() {
    return Object.entries(state.cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ item: getItem(id), qty }));
}

function getCartTotal() {
    return getCartItems().reduce((sum, { item, qty }) => sum + item.price * qty, 0);
}

function getRemainingWealth() {
    return Math.max(0, state.wealth - getCartTotal());
}

function getBudget() {
    return Math.max(0, state.wealth - getCartTotal());
}

function getSpentRatio() {
    const char = getChar();
    return Math.min(1, getCartTotal() / char.wealth);
}

function isLoanItem(itemId) {
    const item = getItem(itemId);
    if (!item) return false;
    if (item.unaffordableForAll) return false;
    return item.price > getBudget();
}

function isItemAffordable(itemId) {
    const item = getItem(itemId);
    if (!item) return false;
    if (item.unaffordableForAll) return false;
    return item.price <= getBudget();
}

// ===================== WEALTH ANIMATION =====================
let wealthAnimId = null;

function animateWealthTo(target) {
    if (wealthAnimId) {
        cancelAnimationFrame(wealthAnimId);
        wealthAnimId = null;
    }
    const start = state.wealth;
    const diff = target - start;
    const duration = Math.min(WEALTH_ANIM_MAX_MS, Math.max(WEALTH_ANIM_MIN_MS, Math.abs(diff) * WEALTH_ANIM_SCALE));
    const startTime = performance.now();

    function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        state.wealth = Math.round(start + diff * eased);
        updateWealthDisplay();
        if (t < 1) {
            wealthAnimId = requestAnimationFrame(frame);
        } else {
            state.wealth = target;
            updateWealthDisplay();
            wealthAnimId = null;
        }
    }
    wealthAnimId = requestAnimationFrame(frame);
}

function updateWealthDisplay() {
    const char = getChar();
    dom.wealthDisplay.textContent = formatMoneyFull(state.wealth);

    if (state.totalLoan > 0) {
        dom.debtDisplay.style.display = 'block';
        dom.debtAmount.textContent = formatMoneyFull(state.totalLoan);
    } else {
        dom.debtDisplay.style.display = 'none';
    }
}

// ===================== CHARACTER =====================
function renderCharacters() {
    dom.charStrip.innerHTML = CHARACTERS.map(c => `
        <button class="char-btn ${c.id === state.currentCharId ? 'active' : ''}"
                data-char="${c.id}"
                title="${c.nameEn} — ${c.tagline}">
            <span class="char-avatar">
                <img class="char-img" src="${c.imageUrl || ''}"
                     alt="${c.name}"
                     onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
                <span class="char-emoji-fallback" style="${c.imageUrl ? 'display:none' : ''}">${c.emoji}</span>
            </span>
            <span class="char-name">${c.name}</span>
            <span class="char-tag">${formatMoney(c.wealth)}</span>
        </button>
    `).join('');

    dom.charStrip.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', () => switchCharacter(btn.dataset.char));
    });
}

function switchCharacter(charId) {
    if (charId === state.currentCharId) return;

    const cartCount = getCartItems().length;
    if (cartCount > 0) {
        if (!confirm('💸 切换角色将清空购物车，确定吗？')) return;
    }

    state.currentCharId = charId;
    state.cart = {};
    state.totalLoan = 0;
    state.loanCount = 0;
    state.loanedItems = [];
    state.checkoutCompleted = false;

    const char = getChar();
    state.wealth = char.wealth;

    // Update theme
    document.body.style.background = char.bgGrad;
    dom.header.style.borderBottomColor = char.accentColor;

    // Re-render
    renderCharacters();
    updateWealthDisplay();
    updateCartUI();
    renderProducts(getActiveCategory());
    closeCart();
    showToast(`🎭 切换为 ${char.emoji} ${char.name}，资产 ${formatMoney(char.wealth)}`, '');
}

// ===================== CATEGORIES =====================
function getActiveCategory() {
    const active = dom.catTabs.querySelector('.cat-btn.active');
    return active ? active.dataset.cat : 'food';
}

function renderCategories() {
    dom.catTabs.innerHTML = CATEGORIES.map(c => `
        <button class="cat-btn ${c.id === 'food' ? 'active' : ''}" data-cat="${c.id}">
            ${c.name}
        </button>
    `).join('');

    dom.catTabs.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dom.catTabs.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(btn.dataset.cat);
        });
    });
}

// ===================== PRODUCTS =====================
function renderProducts(categoryId) {
    const items = categoryId === 'all'
        ? ITEMS
        : ITEMS.filter(i => i.category === categoryId);

    if (items.length === 0) {
        dom.productGrid.innerHTML = '<div class="empty-state">暂无商品</div>';
        return;
    }

    dom.productGrid.innerHTML = items.map(item => {
        const affordable = isItemAffordable(item.id);
        const needsLoan = !item.unaffordableForAll && !affordable;
        const unaffordable = item.unaffordableForAll;

        let btnHtml;
        if (unaffordable) {
            btnHtml = `<button class="product-btn unaffordable" disabled>⛔ 余额不足</button>`;
        } else if (needsLoan) {
            btnHtml = `<button class="product-btn loan-btn" data-id="${item.id}" data-action="loan">💰 贷款买</button>`;
        } else {
            btnHtml = `<button class="product-btn" data-id="${item.id}" data-action="add">🛒 加入购物车</button>`;
        }

        return `
            <div class="product-card" data-id="${item.id}">
                <div class="product-emoji">${item.imageUrl ? '<img class="product-img" src="' + item.imageUrl + '" alt="' + item.name + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'" loading="lazy" style="min-height:80px;background:var(--glass-bg);">' + '<span style="display:none">' + item.emoji + '</span>' : item.emoji}</div>
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.desc}</div>
                <div class="product-price">${formatMoneyFull(item.price)}</div>
                ${btnHtml}
            </div>
        `;
    }).join('');

    // Product button clicks handled via event delegation in initApp
}

// ===================== CART =====================
function addToCart(itemId) {
    const item = getItem(itemId);
    const budget = getBudget();
    if (item && item.price > budget) {
        // Check if collateral is still available, then auto-open loan
        const collTest = LOAN_CONFIG.collateralValues[Math.min(state.loanCount, LOAN_CONFIG.collateralList.length - 1)];
        if (collTest > 0) {
            showToast("💸 余额不足，自动帮你跳转贷款！签字后商品自动加入购物车", "warning");
            openLoan(itemId);
        } else {
            showToast("💸 余额不足，而且已经贷无可贷了！", "error");
        }
        return;
    }
    if (!state.cart[itemId]) state.cart[itemId] = 0;
    state.cart[itemId]++;

    // Update wealth
    animateWealthTo(Math.max(0, state.wealth - getCartTotal()));

    updateCartUI();
    renderProducts(getActiveCategory());
    showToastForItem(itemId);
}

function updateQuantity(itemId, delta) {
    if (!state.cart[itemId]) return;
    state.cart[itemId] += delta;
    if (state.cart[itemId] <= 0) {
        delete state.cart[itemId];
    }

    animateWealthTo(Math.max(0, state.wealth - getCartTotal()));

    updateCartUI();
    renderProducts(getActiveCategory());
}

function removeItem(itemId) {
    const itemTotal = (getItem(itemId).price * (state.cart[itemId] || 0));
    delete state.cart[itemId];
    animateWealthTo(Math.max(0, state.wealth + itemTotal));

    updateCartUI();
    renderProducts(getActiveCategory());
}

function clearCart() {
    const oldTotal = getCartTotal();
    state.cart = {};
    animateWealthTo(state.wealth + oldTotal);
    updateCartUI();
    renderProducts(getActiveCategory());
}

function updateCartUI() {
    const items = getCartItems();
    const total = getCartTotal();
    const count = items.reduce((s, { qty }) => s + qty, 0);
    const char = getChar();
    const remaining = Math.max(0, state.wealth - total);

    // Badge
    dom.cartBadge.textContent = count;
    dom.cartBadge.style.display = count > 0 ? 'flex' : 'none';

    // Empty state
    if (count === 0) {
        dom.cartEmpty.style.display = 'block';
        dom.cartItems.innerHTML = '';
        dom.cartFooter.style.display = 'none';
        dom.btnCheckout.disabled = true;
        return;
    }

    dom.cartEmpty.style.display = 'none';
    dom.cartFooter.style.display = 'block';

    // Cart items
    dom.cartItems.innerHTML = items.map(({ item, qty }) => `
        <div class="cart-item">
            <span class="cart-item-emoji">${item.emoji}</span>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatMoneyFull(item.price)}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" data-id="${item.id}" data-delta="-1" aria-label="减少数量">−</button>
                <span class="qty-value">${qty}</span>
                <button class="qty-btn" data-id="${item.id}" data-delta="1" aria-label="增加数量">+</button>
            </div>
            <div class="cart-item-total">${formatMoneyFull(item.price * qty)}</div>
            <button class="cart-item-delete" data-id="${item.id}" aria-label="删除">✕</button>
        </div>
    `).join('');

    // Cart item events handled via event delegation in initApp

    // Summary
    dom.cartTotal.textContent = formatMoneyFull(total);
    dom.cartRemain.textContent = formatMoneyFull(remaining);
    if (state.totalLoan > 0 && remaining === 0) {
        dom.cartRemain.textContent = '🏦 贷款已覆盖';
        dom.cartRemain.style.color = 'var(--accent-red)';
    } else {
        dom.cartRemain.style.color = 'var(--accent-green)';
    }

    if (state.totalLoan > 0) {
        dom.cartLoanRow.style.display = 'flex';
        dom.cartLoan.textContent = formatMoneyFull(state.totalLoan);
    } else {
        dom.cartLoanRow.style.display = 'none';
    }

    // Checkout button
    dom.btnCheckout.disabled = count === 0;
}

// ===================== TOAST =====================
function showToast(message, type = 'egg') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    while (dom.toastContainer.children.length > TOAST_MAX_VISIBLE) {
        dom.toastContainer.firstChild.remove();
    }

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, TOAST_DURATION_MS);
}

function showToastForItem(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    const char = getChar();
    let msg = '';

    // Character-specific toasts
    if (item.id === 'tesla' && char.id === 'musk') {
        msg = '好家伙，左手造车右手买车 🚗';
    } else if (item.id === 'tesla') {
        msg = '帮马斯克冲业绩？好人啊 🤝';
    } else if (item.id === 'twitter') {
        msg = '🎉 欢迎加入俱乐部！现在你可以自由删帖了（不是）';
    } else if (item.id === 'space-travel' && char.id === 'musk') {
        msg = '马斯克：亲，要不要员工折扣？🚀';
    } else if (item.id === 'space-travel' && char.id === 'jackma') {
        msg = '马老师也要上天了？';
    } else if (item.id === 'maotai' && char.id === 'jackma') {
        msg = '马老师：这个我熟 🍶';
    } else if (item.id === 'h100' && char.id === 'huang') {
        msg = '黄老板：自家产品也要买？💰';
    } else if (item.toast) {
        msg = item.toast;
    }

    // Quantity-based toasts
    if (!msg && item.id === 'starbucks' && state.cart[itemId] >= 10) {
        msg = '你打算在星巴克开会开到下周吗？';
    } else if (!msg && item.id === 'starbucks') {
        msg = '作为亿万富翁，你终于实现了星巴克自由！☕';
    }

    if (!msg && item.category === 'food') {
        msg = `${item.emoji} ${item.name} 加入购物车！`;
    } else if (!msg) {
        msg = `${item.emoji} ${item.name} 已加入购物车 🛒`;
    }

    showToast(msg, 'egg');
}

// ===================== CART DRAWER =====================
function openCart() {
    dom.cartDrawer.classList.add('open');
    dom.cartOverlay.classList.add('open');
}

function closeCart() {
    dom.cartDrawer.classList.remove('open');
    dom.cartOverlay.classList.remove('open');
}

// ===================== LOAN SYSTEM =====================
let pendingLoanItemId = null;

function openLoanGeneral() {
    pendingLoanItemId = null;
    const collIdx = Math.min(state.loanCount, LOAN_CONFIG.collateralList.length - 1);
    const collValue = LOAN_CONFIG.collateralValues[collIdx];
    if (collValue === 0) {
        showToast("🏦 王行长：你身上已经没有任何东西可以抵押了！请回吧！", "error");
        return;
    }
    const collName = LOAN_CONFIG.collateralList[collIdx];
    dom.loanAmount.textContent = formatMoneyFull(collValue);
    dom.loanRate.textContent = LOAN_CONFIG.interestRate + '%';
    dom.loanYears.textContent = LOAN_CONFIG.repaymentYears + ' 年';
    dom.loanMonthly.textContent = '$' + LOAN_CONFIG.monthlyPayment.toFixed(2);
    dom.loanCollateral.textContent = collName + '(估值 ' + formatMoneyFull(collValue) + ')';
    dom.loanManagerName.textContent = LOAN_CONFIG.managerName + ' 行长';
    const nextColl = LOAN_CONFIG.collateralList[collIdx];
    if (state.loanCount === 0) {
        dom.loanManagerSay.textContent = '"老弟来啦？我就喜欢你这种有眼光的年轻人！这次抵押物：' + nextColl + '，签字吧！"';
    } else if (state.loanCount >= LOAN_CONFIG.collateralList.length - 1) {
        dom.loanManagerSay.textContent = '"老弟..." 王行长沉默了许久，"你身上已经没有任何东西可以抵押了。"';
    } else if (state.loanCount >= LOAN_CONFIG.collateralList.length - 3) {
        dom.loanManagerSay.textContent = '"老弟... 说实话我都不忍心了。但是生意归生意！这次抵押：' + nextColl + '！签字！"';
    } else {
        dom.loanManagerSay.textContent = '"又来啦？老规矩，这次抵押：' + nextColl + '。签字签字 ✍️"';
    }
    if (state.totalLoan > 0) {
        dom.loanTotalDebt.style.display = 'block';
        dom.loanCurrentDebt.textContent = formatMoneyFull(state.totalLoan);
    } else {
        dom.loanTotalDebt.style.display = 'none';
    }
    dom.loanOverlay.style.display = 'flex';
}

function openLoan(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    pendingLoanItemId = itemId;
    const gap = Math.max(0, item.price - getBudget());

    // Calculate required collateral package (A + B + C...)
    let needed = [];
    let totalValue = 0;
    let nextLoanIdx = state.loanCount;
    while (totalValue < gap && nextLoanIdx < LOAN_CONFIG.collateralList.length && LOAN_CONFIG.collateralValues[nextLoanIdx] > 0) {
        needed.push({
            name: LOAN_CONFIG.collateralList[nextLoanIdx],
            value: LOAN_CONFIG.collateralValues[nextLoanIdx]
        });
        totalValue += LOAN_CONFIG.collateralValues[nextLoanIdx];
        nextLoanIdx++;
    }
    state.pendingCollaterals = needed.map(n => nextLoanIdx - needed.length + needed.indexOf(n));

    if (totalValue < gap) {
        // Ran through all available collaterals but still not enough
        if (needed.length === 0 && LOAN_CONFIG.collateralValues[state.loanCount] === 0) {
            showToast("🏦 王行长：你身上已经没有任何东西可以抵押了！请回吧！", "error");
        } else {
            showToast("🏦 王行长：你剩下的家当加起来(" + formatMoneyFull(totalValue) + ")也不够买这个(" + formatMoneyFull(gap) + ")！换便宜点的吧！", "error");
        }
        return;
    }

    // Combine display
    const collList = needed.map(n => n.name + '(' + formatMoneyFull(n.value) + ')').join(' + ');
    const char = getChar();

    dom.loanAmount.textContent = '商品: ' + formatMoneyFull(item.price) + '  缺口: ' + formatMoneyFull(gap);
    dom.loanRate.textContent = LOAN_CONFIG.interestRate + '%';
    dom.loanYears.textContent = LOAN_CONFIG.repaymentYears + ' 年';
    dom.loanMonthly.textContent = '$' + LOAN_CONFIG.monthlyPayment.toFixed(2);
    dom.loanCollateral.textContent = '抵押包: ' + collList + '  合计: ' + formatMoneyFull(totalValue);
    dom.loanManagerName.textContent = LOAN_CONFIG.managerName + ' 行长';

    if (needed.length === 1) {
        dom.loanManagerSay.textContent = '“要买这个啊？抵押' + needed[0].name + '就够了，签字吧！”';
    } else {
        dom.loanManagerSay.textContent = '“这个贵啊！你得抵押 ' + needed.map(n => n.name).join(' + ') + ' 才够，确定要买？”';
    }

    if (state.totalLoan > 0) {
        dom.loanTotalDebt.style.display = 'block';
        dom.loanCurrentDebt.textContent = formatMoneyFull(state.totalLoan);
    } else {
        dom.loanTotalDebt.style.display = 'none';
    }

    dom.loanOverlay.style.display = 'flex';
}


function closeLoan() {
    dom.loanOverlay.style.display = 'none';
    pendingLoanItemId = null;
}

function confirmLoan() {
    const item = pendingLoanItemId ? getItem(pendingLoanItemId) : null;

    // For product-specific loans, need the item
    if (pendingLoanItemId && !item) return;

    const remaining = getBudget();
    const loanAmount = item ? Math.max(0, item.price - remaining) : 0;

    const char = getChar();

    // Collateral validation already done in openLoan (combined package check)
    const maxLoan = char.wealth * MAX_LOAN_RATIO;
    if (state.totalLoan + loanAmount > maxLoan) {
        showToast('贷款：王行长：你的信用额已经用尽了！先还一点再来吧！', 'error');
        closeLoan();
        return;
    }

    const colls = state.pendingCollaterals || [Math.min(state.loanCount, LOAN_CONFIG.collateralList.length - 1)];
    let batchValue = 0;
    colls.forEach(function(idx) { batchValue += LOAN_CONFIG.collateralValues[idx]; });
    state.totalLoan += batchValue;
    state.loanCount += colls.length;
    state.wealth += batchValue;
    state.pendingCollaterals = null;
    if (pendingLoanItemId) {
        state.loanedItems.push(pendingLoanItemId);
        if (!state.cart[pendingLoanItemId]) state.cart[pendingLoanItemId] = 0;
        state.cart[pendingLoanItemId]++;
    }

    // Loan easter egg thresholds
    const threshold = LOAN_CONFIG.eggThresholds
        .slice()
        .reverse()
        .find(t => state.totalLoan >= t.min);
    if (threshold) {
        showToast('🏦 ' + threshold.msg, 'error');
    } else {
        showToast('🏦 贷款成功！王行长：下次再来啊！', 'egg');
    }

    closeLoan();
    updateWealthDisplay();
    updateCartUI();
    renderProducts(getActiveCategory());
    openCart();
}

// ===================== CHECKOUT =====================
function openCheckout() {
    const items = getCartItems();
    if (items.length === 0) return;

    const char = getChar();
    const total = getCartTotal();
    const remaining = Math.max(0, state.wealth - total);
    const ratio = getSpentRatio();

    // Hide success, show body
    dom.checkoutBody.style.display = 'block';
    dom.checkoutSuccess.style.display = 'none';
    dom.btnConfirmCheckout.style.display = 'block';
    dom.checkoutCancel.style.display = 'block';

    dom.checkoutCharName.textContent = `${char.emoji} ${char.name}`;
    dom.checkoutTime.textContent = '📅 ' + new Date().toLocaleString('zh-CN');

    dom.checkoutItems.innerHTML = items.map(({ item, qty }) => `
        <div class="co-row">
            <span>${item.emoji} ${item.name} × ${qty}</span>
            <span class="co-amount">${formatMoneyFull(item.price * qty)}</span>
        </div>
    `).join('');

    dom.checkoutTotal.textContent = formatMoneyFull(total);
    dom.checkoutRemain.textContent = remaining > 0 ? formatMoneyFull(remaining) : '💸 已破产';

    if (state.totalLoan > 0) {
        dom.checkoutLoanRow.style.display = 'flex';
        dom.checkoutLoan.textContent = formatMoneyFull(state.totalLoan);
    } else {
        dom.checkoutLoanRow.style.display = 'none';
    }

    dom.checkoutPercent.textContent = (ratio * 100).toFixed(2) + '%';

    // Funny review
    dom.checkoutReview.innerHTML = getFunnyReview(ratio, char);
    dom.checkoutReview.style.display = 'block';

    dom.checkoutOverlay.style.display = 'flex';
}

function closeCheckout() {
    dom.checkoutOverlay.style.display = 'none';
    if (state.checkoutCompleted) {
        state.cart = {};
        state.checkoutCompleted = false;
        state.loanedItems = [];
        const char = getChar();
        state.wealth = char.wealth;
        updateWealthDisplay();
        updateCartUI();
        renderProducts(getActiveCategory());
    }
    // Reset to body view
    dom.checkoutBody.style.display = 'block';
    dom.checkoutSuccess.style.display = 'none';
    dom.btnConfirmCheckout.style.display = 'block';
    dom.checkoutCancel.style.display = 'block';
}

function getFunnyReview(ratio, char) {
    const name = char.name;
    let review;
    let special = '';

    if (state.totalLoan > 0) {
        special = `🏦 此外你还欠了欠揍银行 ${formatMoneyFull(state.totalLoan)}，王行长表示很欣赏你！`;
    }

    if (state.totalLoan > 500_000_000_000) {
        review = `😱 ${name}的财富已经不够形容你了！催收天团正在定位你的位置，建议买完单就换个星球生活！🚀`;
        return review + (special ? '<br>' + special : '');
    }

    if (ratio < 0.0001) {
        review = `你连${name}的一根腿毛都没花掉，建议继续努力 💪`;
    } else if (ratio < 0.01) {
        review = `毛毛雨啦～${name}打个喷嚏的时间就赚回来了 😄`;
    } else if (ratio < 0.1) {
        review = `不错哦！${name}开始注意到他的账单了 👀`;
    } else if (ratio < 0.5) {
        review = `你是认真的吗？${name}开始拿起计算器了 😅`;
    } else if (ratio < 0.8) {
        review = `⚠️ ${name}：要不这钱我还给你，你别买了 😱`;
    } else {
        review = `🎉 你成功让${name}破产了！快出书：《如何花光${name}的钱》📚`;
    }

    // Character-specific flavor
    if (char.id === 'jackma' && ratio < 0.5) {
        review += '<br>🐎 马云：这点小钱，我蚂蚁森林种几年树就有了';
    } else if (char.id === 'huang' && ratio > 0.3) {
        review += '<br>💻 黄仁勋：看来你是真需要显卡，DT分你一个';
    } else if (char.id === 'buffett' && ratio > 0.5) {
        review += '<br>🦁 巴菲特：年轻人不讲股德，这钱要是定投大盘现在都...';
    } else if (char.id === 'ponyma' && ratio > 0.5) {
        review += '<br>🐧 马化腾：充这么多？送你一套心悦会员';
    }

    if (special) review += '<br>' + special;
    return review;
}

function confirmCheckout() {
    // Hide body, show success
    dom.checkoutBody.style.display = 'none';
    dom.btnConfirmCheckout.style.display = 'none';
    dom.checkoutCancel.style.display = 'none';
    dom.checkoutSuccess.style.display = 'block';

    const char = getChar();
    const ratio = getSpentRatio();
    const total = getCartTotal();

    // Success message
    if (state.totalLoan > 0) {
        dom.successSub.textContent = `有债一身轻？🏦 欠揍银行提醒您：记得每月还 $0.01，分${LOAN_CONFIG.repaymentYears}年还清哦～`;
    } else if (ratio > 0.8) {
        dom.successSub.textContent = `你成功帮${char.emoji} ${char.name}花掉了${(ratio * 100).toFixed(1)}% 的身家！建议以后他见你绕道走 😂`;
    } else {
        dom.successSub.textContent = `你成功帮${char.emoji} ${char.name}消费了 ${formatMoneyFull(total)}！体验了一把亿万富翁的感觉 💰`;
    }

    // Confetti!
    fireConfetti();

    state.checkoutCompleted = true;
}

function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFED4A', '#FF6B35', '#00D4FF'],
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFED4A', '#FF6B35', '#00D4FF'],
        });
        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();

    // Big burst
    setTimeout(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFED4A', '#FF6B35', '#00D4FF', '#00E676'],
        });
    }, 500);
}

// ===================== BILL IMAGE (Canvas) =====================
function generateBillImage() {
    const canvas = dom.billCanvas;
    const ctx = canvas.getContext('2d');

    const char = getChar();
    const items = getCartItems();
    const total = getCartTotal();
    const remaining = Math.max(0, state.wealth - total);
    const ratio = getSpentRatio();

    // Canvas dimensions
    const width = 600;
    const padding = 40;
    const lineHeight = 24;
    let y = padding;

    // Increase height based on content
    const itemLines = items.reduce((s, { item, qty }) => s + 1 + Math.ceil((item.name.length * 14) / 400), 0);
    const totalHeight = padding * 2 + 40 + 30 + 30 + 10 + itemLines * lineHeight + 30 + 4 * lineHeight + 60 + 40 + 60;
    canvas.width = width;
    canvas.height = Math.max(500, totalHeight);

    // Draw background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, width, canvas.height);

    // Decorative border
    ctx.strokeStyle = '#B8960C';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, canvas.height - 20);

    // Double line top
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 30);
    ctx.lineTo(width - padding, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, 34);
    ctx.lineTo(width - padding, 34);
    ctx.stroke();

    // ----- Header -----
    y = 55;
    ctx.textAlign = 'center';
    ctx.font = '28px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#0a0a1a';
    ctx.fillText(`假如我是${char.name}`, width / 2, y);

    y += 30;
    ctx.font = '12px "Orbitron", monospace';
    ctx.fillStyle = '#B8960C';
    ctx.fillText('── 购物纪念账单 ──', width / 2, y);

    // Date
    y += 26;
    ctx.font = '13px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(new Date().toLocaleString('zh-CN'), width / 2, y);

    // Separator
    y += 14;
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // ----- Items -----
    y += 14;
    items.forEach(({ item, qty }) => {
        const line = `${item.name}  × ${qty}`;
        ctx.textAlign = 'left';
        ctx.font = '14px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
        ctx.fillStyle = '#0a0a1a';
        ctx.fillText(line, padding, y);

        ctx.textAlign = 'right';
        ctx.font = '13px "Orbitron", monospace';
        ctx.fillStyle = '#333';
        ctx.fillText(formatMoneyFull(item.price * qty), width - padding, y);

        y += lineHeight;
    });

    // Separator
    y += 6;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    // ----- Totals -----
    y += 20;
    ctx.textAlign = 'right';
    ctx.font = '15px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';

    const drawRow = (label, value, color = '#0a0a1a') => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333';
        ctx.fillText(label, padding, y);
        ctx.textAlign = 'right';
        ctx.font = '14px "Orbitron", monospace';
        ctx.fillStyle = color;
        ctx.fillText(value, width - padding, y);
        ctx.font = '15px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
        y += lineHeight;
    };

    drawRow('💰 总消费', formatMoneyFull(total), '#B8960C');
    drawRow('🧾 剩余财富', remaining > 0 ? formatMoneyFull(remaining) : '💸 已破产', remaining > 0 ? '#333' : '#FF1744');

    if (state.totalLoan > 0) {
        drawRow('🏦 银行贷款', formatMoneyFull(state.totalLoan), '#FF1744');
    }

    drawRow('📊 消费占比', (ratio * 100).toFixed(2) + '%', '#B8960C');

    // ----- Funny Review -----
    y += 10;
    ctx.textAlign = 'center';
    ctx.font = '11px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('★ 趣味评价 ★', width / 2, y);
    y += 18;

    ctx.font = '13px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#555';
    const fullReview = getFunnyReview(ratio, char).replace(/<br>/g, ' ');
    const review = fullReview.length > 50 ? fullReview.substring(0, 47) + '...' : fullReview;
    // Wrap long text
    const maxChars = 30;
    let reviewText = review;
    while (reviewText.length > 0) {
        const slice = reviewText.substring(0, maxChars);
        ctx.fillText(slice, width / 2, y);
        y += 18;
        reviewText = reviewText.substring(maxChars);
    }

    // ----- Footer -----
    y += 14;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    y += 18;
    ctx.font = '10px "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('生成于 假如我是... 虚拟富翁购物体验', width / 2, y);
    y += 14;
    ctx.fillText('截图分享给好友，看谁花得更狠！', width / 2, y);

    // Convert to image and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `账单_${char.name}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('🖼️ 纪念账单已保存！', 'egg');
    }, 'image/png');
}

// ===================== COPY RECEIPT =====================
function copyReceipt() {
    const char = getChar();
    const items = getCartItems();
    const total = getCartTotal();
    const remaining = Math.max(0, state.wealth - total);
    const ratio = getSpentRatio();

    let text = `================================\n`;
    text += `  ${char.emoji} 假如我是${char.name}\n`;
    text += `  ─── 购物纪念账单 ───\n`;
    text += `  ${new Date().toLocaleString('zh-CN')}\n`;
    text += `================================\n\n`;
    text += `  商品清单：\n`;

    items.forEach(({ item, qty }) => {
        text += `    ${item.emoji} ${item.name} × ${qty}  ${formatMoneyFull(item.price * qty)}\n`;
    });

    text += `\n────────────────────────────\n`;
    text += `  总消费: ${formatMoneyFull(total)}\n`;
    text += `  剩余财富: ${remaining > 0 ? formatMoneyFull(remaining) : '💸 已破产'}\n`;
    text += `  消费占比: ${(ratio * 100).toFixed(2)}%\n`;

    if (state.totalLoan > 0) {
        text += `  🏦 银行贷款: ${formatMoneyFull(state.totalLoan)}\n`;
    }

    text += `\n  ★ 趣味评价 ★\n`;
    const review = getFunnyReview(ratio, char).replace(/<br>/g, '\n  ');
    text += `  ${review}\n`;
    text += `\n================================\n`;
    text += `  生成于 假如我是... 虚拟富翁购物体验\n`;
    text += `  截图分享给好友，看谁花得更狠！\n`;
    text += `================================`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 收据文本已复制到剪贴板！', 'egg');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToast('📋 收据文本已复制！', 'egg');
    });
}

// ===================== RESET =====================
function resetAll() {
    if (getCartItems().length > 0 || state.totalLoan > 0) {
        if (!confirm('🔄 确定要重新开始吗？所有购物车和贷款记录将清空。')) return;
    }

    state.cart = {};
    state.totalLoan = 0;
    state.loanCount = 0;
    state.loanedItems = [];
    const char = getChar();
    state.wealth = char.wealth;

    closeCart();
    closeCheckout();
    updateWealthDisplay();
    updateCartUI();
    renderProducts(getActiveCategory());
    showToast(`🔄 已重置，继续买买买吧！`, '');
}

// ===================== INIT =====================
function initApp() {
    const char = getChar();
    state.wealth = char.wealth;

    renderCharacters();
    renderCategories();
    renderProducts('food');
    updateWealthDisplay();
    updateCartUI();

    // Apply theme
    document.body.style.background = char.bgGrad;

    // ===== EVENT LISTENERS =====

    dom.cartFab.setAttribute('aria-label', '打开购物车');
    dom.cartClose.setAttribute('aria-label', '关闭购物车');
    dom.checkoutClose.setAttribute('aria-label', '关闭');
    dom.checkoutCancel.setAttribute('aria-label', '继续购物');
    dom.loanCancel.setAttribute('aria-label', '取消贷款');
    dom.btnReset.setAttribute('aria-label', '重置所有');

    // Loan button
    dom.btnLoan.addEventListener('click', openLoanGeneral);

    // Cart FAB
    dom.cartFab.addEventListener('click', openCart);
    dom.cartOverlay.addEventListener('click', closeCart);
    dom.cartClose.addEventListener('click', closeCart);

    // Checkout
    dom.btnCheckout.addEventListener('click', openCheckout);
    dom.checkoutClose.addEventListener('click', closeCheckout);
    dom.checkoutCancel.addEventListener('click', closeCheckout);
    dom.checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === dom.checkoutOverlay) closeCheckout();
    });
    dom.btnConfirmCheckout.addEventListener('click', () => {
        confirmCheckout();
    });
    dom.btnDone.addEventListener('click', () => {
        // Clear cart and close
        state.checkoutCompleted = false;
        clearCart();
        closeCheckout();
    });

    // Bill image
    dom.btnSaveImage.addEventListener('click', generateBillImage);
    dom.btnCopyReceipt.addEventListener('click', copyReceipt);

    // Loan
    dom.loanConfirm.addEventListener('click', confirmLoan);
    dom.loanCancel.addEventListener('click', closeLoan);
    dom.loanOverlay.addEventListener('click', (e) => {
        if (e.target === dom.loanOverlay) closeLoan();
    });

    // Reset
    dom.btnReset.addEventListener('click', resetAll);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            closeCheckout();
            closeLoan();
        }
    });

    // Cart item event delegation (qty + delete buttons)
    dom.cartItems.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
            updateQuantity(qtyBtn.dataset.id, parseInt(qtyBtn.dataset.delta));
            return;
        }
        const delBtn = e.target.closest('.cart-item-delete');
        if (delBtn) {
            removeItem(delBtn.dataset.id);
            return;
        }
    });

    // Product button event delegation (single listener on productGrid)
    dom.productGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.product-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'add') addToCart(id);
        if (action === 'loan') openLoan(id);
    });

    // Card hover effect - event delegation on productGrid
    dom.productGrid.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', x + '%');
        card.style.setProperty('--mouse-y', y + '%');
    });

    console.log('🚀 假如我是... 已启动！');
    console.log(`🎭 当前角色: ${char.emoji} ${char.name} (${formatMoney(char.wealth)})`);
    console.log(`💡 提示: 尽情买买买吧！花光了还可以找欠揍银行贷款 😈`);
}

// Start the app


document.addEventListener('DOMContentLoaded', initApp);

