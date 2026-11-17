/* 효소세상 — site.js
   공통 동작: 메뉴, 장바구니, 제품 필터/검색, 상세 보기, 주문서 */
(function () {
  'use strict';

  var CFG = window.ENZYME_CONFIG || {};
  var SHIP = CFG.shipping || { fee: 4000, freeOver: 50000, jejuExtra: 6000 };
  var CART_KEY = 'enzyme_cart_v1';
  var won = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 제품 데이터 ─────────────────────────────────────── */
  function productData() {
    var el = document.getElementById('productData');
    if (!el) return [];
    try { return JSON.parse(el.textContent); } catch (e) { return []; }
  }
  var byId = function (id) {
    return productData().filter(function (p) { return p.id === id; })[0] || null;
  };

  /* ── 토스트 ──────────────────────────────────────────── */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-open'); }, 2600);
  }

  /* ── 헤더 / 모바일 메뉴 / 현재 페이지 ───────────────── */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 6); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var menuToggle = $('[data-menu-toggle]');
  var mobileMenu = $('#mobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var page = document.body.getAttribute('data-page');
  if (page) {
    $$('[data-path]').forEach(function (a) {
      if (a.getAttribute('data-path') === page) a.setAttribute('aria-current', 'page');
    });
  }

  /* ── 등장 효과 ───────────────────────────────────────── */
  var reveals = $$('[data-reveal]');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* ── 카카오톡 채널 상담 링크 ──────────────────────── */
  $$('[data-kakao]').forEach(function (a) {
    if (CFG.kakaoChannelUrl) {
      a.setAttribute('href', CFG.kakaoChannelUrl);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      a.setAttribute('href', '#');
      a.setAttribute('title', '카카오톡 채널 주소를 준비 중입니다');
    }
  });

  // 동적으로 그린(상세 보기 모달 등) 카카오 링크도 항상 동작하도록 위임 처리
  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-kakao]');
    if (!k) return;
    if (!CFG.kakaoChannelUrl) { e.preventDefault(); return; }
    if (k.tagName === 'A') {
      k.setAttribute('href', CFG.kakaoChannelUrl);
      k.setAttribute('target', '_blank');
      k.setAttribute('rel', 'noopener');
    } else {
      e.preventDefault();
      window.open(CFG.kakaoChannelUrl, '_blank', 'noopener');
    }
  });

  /* ── 장바구니 ───────────────────────────────────────── */
  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    renderCart();
  }
  function cartTotal(items) {
    return items.reduce(function (sum, it) {
      var p = byId(it.id);
      return sum + (p && p.price ? p.price * it.qty : 0);
    }, 0);
  }
  function itemCount(items) {
    return items.reduce(function (n, it) { return n + it.qty; }, 0);
  }
  function shippingFee(subtotal) {
    if (!subtotal) return 0;
    return subtotal >= SHIP.freeOver ? 0 : SHIP.fee;
  }

  function renderCart() {
    var items = readCart();
    var count = itemCount(items);
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });

    var body = $('#cartBody');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<p class="cart-empty">장바구니가 비어 있습니다.<br>제품을 담아 주문서를 만들어 보세요.</p>';
    } else {
      body.innerHTML = items.map(function (it) {
        var p = byId(it.id);
        if (!p) return '';
        return '<div class="cart-line" data-line="' + p.id + '">' +
          '<img src="' + p.image + '" alt="' + p.name + '">' +
          '<div><b>' + p.name + '</b>' +
          '<span class="tiny">' + p.option + '</span>' +
          '<div class="row mt-8"><span class="qty">' +
          '<button type="button" data-qty="-1" data-id="' + p.id + '" aria-label="수량 줄이기">−</button>' +
          '<span>' + it.qty + '</span>' +
          '<button type="button" data-qty="1" data-id="' + p.id + '" aria-label="수량 늘리기">+</button>' +
          '</span></div></div>' +
          '<div style="text-align:right"><b class="mono-num">' + won((p.price || 0) * it.qty) + '원</b>' +
          '<button type="button" class="tiny" data-remove="' + p.id + '" style="background:none;border:0;color:#8d938f;padding:4px 0">삭제</button></div>' +
          '</div>';
      }).join('');
    }

    var subtotal = cartTotal(items);
    var ship = shippingFee(subtotal);
    ['', 'Page'].forEach(function (suffix) {
      var sumSub = document.getElementById('sumSubtotal' + suffix);
      var sumShip = document.getElementById('sumShipping' + suffix);
      var sumTotal = document.getElementById('sumTotal' + suffix);
      if (sumSub) sumSub.textContent = won(subtotal) + '원';
      if (sumShip) sumShip.textContent = subtotal === 0 ? '—' : (ship ? won(ship) + '원' : '무료');
      if (sumTotal) sumTotal.textContent = won(subtotal + ship) + '원';
    });

    var checkoutBtn = $('#checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = items.length === 0;
  }

  function priceText(p) {
    if (p && p.price) return won(p.price) + '원';
    return '가격 문의';
  }

  function addToCart(id, qty) {
    var prod = byId(id);
    if (prod && !prod.price) {
      toast('가격 문의 상품입니다. 카카오톡 채널로 문의해 주세요');
      if (CFG.kakaoChannelUrl) window.open(CFG.kakaoChannelUrl, '_blank', 'noopener');
      return;
    }
    var items = readCart();
    var found = items.filter(function (it) { return it.id === id; })[0];
    if (found) found.qty = Math.min(found.qty + (qty || 1), 20);
    else items.push({ id: id, qty: qty || 1 });
    writeCart(items);
    var p = byId(id);
    toast((p ? p.name : '상품') + '을(를) 장바구니에 담았습니다');
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add-cart]');
    if (add) { addToCart(add.getAttribute('data-id'), 1); openCart(); return; }

    var qbtn = e.target.closest('[data-qty]');
    if (qbtn) {
      var id = qbtn.getAttribute('data-id');
      var delta = Number(qbtn.getAttribute('data-qty'));
      var items = readCart().map(function (it) {
        if (it.id === id) it.qty = Math.max(1, Math.min(20, it.qty + delta));
        return it;
      });
      writeCart(items); return;
    }

    var rm = e.target.closest('[data-remove]');
    if (rm) {
      var rid = rm.getAttribute('data-remove');
      writeCart(readCart().filter(function (it) { return it.id !== rid; }));
      return;
    }

    if (e.target.closest('[data-open-cart]')) { openCart(); }
    if (e.target.closest('[data-close-cart]') || e.target.id === 'overlay') { closeCart(); }
    if (e.target.closest('[data-close-modal]') || e.target.id === 'overlay') { closeModal(); }
  });

  var drawer = $('#cartDrawer');
  var overlay = $('#overlay');
  function openCart() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    drawer.removeAttribute('aria-hidden');
    renderCart();
  }
  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (overlay && !$('.modal.is-open')) overlay.classList.remove('is-open');
  }

  /* ── 제품 상세 보기 ─────────────────────────────────── */
  var modal = $('#quickView');
  function openModal(id) {
    var p = byId(id);
    if (!p || !modal) return;
    var bags = modal.querySelector('[data-modal-body]');
    var priceBlock = p.price
      ? '<div class="price-row"><span class="price">' + won(p.price) + '원</span>' +
        (p.listPrice ? '<span class="price-was">' + won(p.listPrice) + '원</span>' : '') + '</div>'
      : '<div class="price-row"><span class="price-quote">가격 문의</span></div>' +
        (p.listPrice ? '<p class="tiny" style="margin-top:-6px">제조사 표시 소비자가 ' + won(p.listPrice) + '원 · 판매가는 카카오톡 채널로 문의해 주세요</p>' : '');
    var actionBlock = p.price
      ? '<button type="button" class="btn btn-primary" data-add-cart data-id="' + p.id + '">장바구니 담기</button>'
      : '<a class="btn btn-kakao" data-kakao href="' + (CFG.kakaoChannelUrl || '#') + '" target="_blank" rel="noopener">카카오톡 채널로 가격 문의</a>';
    bags.innerHTML =
      '<div class="product-meta"><span>' + p.brand + '</span><span>' + p.code + '</span></div>' +
      '<h3 class="h2" style="font-size:26px">' + p.name + '</h3>' +
      '<p class="lead" style="font-size:15px">' + p.summary + '</p>' +
      priceBlock +
      '<dl class="spec-list">' + p.spec.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="notice info"><span><b>섭취 방법</b>' + p.usage + '</span></div>' +
      '<div class="row mt-8">' + actionBlock +
      '<a class="btn btn-line" href="order.html">주문 안내 보기</a></div>';
    var img = modal.querySelector('[data-modal-img]');
    img.src = p.image; img.alt = p.name;
    modal.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    if (overlay && !(drawer && drawer.classList.contains('is-open'))) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quick-view]');
    if (q) { e.preventDefault(); openModal(q.getAttribute('data-id')); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeCart(); closeModal(); }
  });

  /* ── 제품 필터 · 검색 · 정렬 ────────────────────────── */
  var grid = $('#productGrid');
  if (grid) {
    var cards = $$('[data-product]', grid);
    var state = { cat: 'all', q: '', sort: 'order' };

    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var okCat = state.cat === 'all' || c.getAttribute('data-category') === state.cat;
        var name = (c.getAttribute('data-name') || '') + ' ' + (c.getAttribute('data-keywords') || '');
        var okQ = !state.q || name.toLowerCase().indexOf(state.q) > -1;
        var ok = okCat && okQ;
        c.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      var empty = $('#emptyState');
      if (empty) empty.classList.toggle('hide', shown > 0);
      var cnt = $('#resultCount');
      if (cnt) cnt.textContent = shown;

      var sorted = cards.slice().sort(function (a, b) {
        var pa = Number(a.getAttribute('data-price')), pb = Number(b.getAttribute('data-price'));
        var oa = Number(a.getAttribute('data-order')), ob = Number(b.getAttribute('data-order'));
        if (state.sort === 'price-asc') return pa - pb;
        if (state.sort === 'price-desc') return pb - pa;
        return oa - ob;
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
    }

    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-filter]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.cat = btn.getAttribute('data-filter');
        apply();
      });
    });
    var searchInput = $('#productSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        state.q = searchInput.value.trim().toLowerCase();
        apply();
      });
    }
    var sortSel = $('#productSort');
    if (sortSel) {
      sortSel.addEventListener('change', function () { state.sort = sortSel.value; apply(); });
    }
    apply();
  }

  /* ── 주문서 ─────────────────────────────────────────── */
  function orderSummary(form) {
    var items = readCart();
    var subtotal = cartTotal(items);
    var ship = shippingFee(subtotal);
    var d = new FormData(form);
    var lines = [];
    lines.push('[효소세상 주문서]');
    items.forEach(function (it) {
      var p = byId(it.id);
      if (p) lines.push('· ' + p.name + ' / ' + p.option + ' / ' + it.qty + '개 / ' + won((p.price || 0) * it.qty) + '원');
    });
    lines.push('상품금액 ' + won(subtotal) + '원 / 배송비 ' + (ship ? won(ship) + '원' : '무료') + ' / 합계 ' + won(subtotal + ship) + '원');
    lines.push('받는 분 ' + (d.get('name') || ''));
    lines.push('연락처 ' + (d.get('phone') || ''));
    lines.push('주소 ' + (d.get('address') || ''));
    if (d.get('memo')) lines.push('요청사항 ' + d.get('memo'));
    lines.push('※ ' + (SHIP.note || ''));
    return lines.join('\n');
  }

  $$('form[data-order-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!readCart().length) { toast('장바구니가 비어 있습니다'); return; }
      var out = form.querySelector('.form-result');
      var text = orderSummary(form);
      if (out) {
        out.textContent = text + '\n\n위 내용을 복사해 카카오톡 채널(' + (CFG.kakaoChannelUrl || '') + ')로 보내주시면 확인 후 결제 방법을 안내드립니다.';
        out.classList.add('is-open');
      }
      var copyBtn = form.querySelector('[data-copy-summary]');
      if (copyBtn) {
        copyBtn.hidden = false;
        copyBtn.onclick = function () {
          if (navigator.clipboard) navigator.clipboard.writeText(text);
          toast('주문 내용을 복사했습니다');
        };
      }
      try { out && out.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    });
  });

  /* ── 일반 문의 폼 ───────────────────────────────────── */
  $$('form[data-contact-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var text = '[효소세상 문의]\n' + Array.prototype.map.call(form.elements, function (el) {
        return el.name ? el.name + ': ' + (el.value || '') : '';
      }).filter(Boolean).join('\n');
      var out = form.querySelector('.form-result');
      if (out) {
        out.textContent = (d.get('name') ? d.get('name') + ' 님, 문의 내용이 준비되었습니다.\n\n' : '') + text +
          '\n\n카카오톡 채널(' + (CFG.kakaoChannelUrl || '') + ')로 보내주시면 순서대로 답변드립니다.';
        out.classList.add('is-open');
        try { out.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
      form.reset();
    });
  });

  /* ── 이메일 표기 ──────────────────────────────────── */
  $$('[data-email]').forEach(function (el) { el.textContent = CFG.email || ''; });

  renderCart();
})();
