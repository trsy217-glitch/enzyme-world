/* 효소세상 — site.js
   공통 동작: 메뉴, 장바구니, 제품 필터/검색, 상세 보기, 주문서 */
(function () {
  'use strict';

  var CFG = window.ENZYME_CONFIG || {};
  var SHIP = CFG.shipping || { fee: 4000, freeOver: 50000, jejuExtra: 6000 };
  var CART_KEY = 'enzyme_cart_v1';
  var won = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };

  /* ── 회원 등급 할인 (assets/js/member.js) ─────────────
     로그인한 회원의 등급(일반회원 0% · 대리점 30% · 총판 50%)에 따라
     장바구니·주문서 금액이 자동으로 계산됩니다. */
  var MEMBER = window.ENZYME_MEMBER || null;
  function mRate() { return MEMBER && MEMBER.rate ? MEMBER.rate() : 0; }
  function mGrade() {
    return MEMBER && MEMBER.currentGrade ? MEMBER.currentGrade() : { key: 'normal', label: '일반회원', rate: 0 };
  }
  function mUser() { return MEMBER && MEMBER.current ? MEMBER.current() : null; }
  function mPrice(base) {
    return MEMBER && MEMBER.priceFor ? MEMBER.priceFor(base) : (Number(base) || 0);
  }
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

  /* ── 카카오톡 채널 1:1 채팅 링크 ([data-kakao-chat]) ──
     대리점·도매 상담은 채널 홈이 아니라 채팅방으로 바로 들어갑니다. */
  var kakaoChatUrl = function () { return CFG.kakaoChatUrl || CFG.kakaoChannelUrl || ''; };
  $$('[data-kakao-chat]').forEach(function (a) {
    var url = kakaoChatUrl();
    if (url) {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      a.setAttribute('href', '#');
      a.setAttribute('title', '카카오톡 채널 주소를 준비 중입니다');
    }
  });

  // 동적으로 그린(상세 보기 모달 등) 카카오 링크도 항상 동작하도록 위임 처리
  document.addEventListener('click', function (e) {
    var k = e.target.closest('[data-kakao], [data-kakao-chat]');
    if (!k) return;
    var url = k.hasAttribute('data-kakao-chat') ? kakaoChatUrl() : CFG.kakaoChannelUrl;
    if (!url) { e.preventDefault(); return; }
    if (k.tagName === 'A') {
      k.setAttribute('href', url);
      k.setAttribute('target', '_blank');
      k.setAttribute('rel', 'noopener');
    } else {
      e.preventDefault();
      window.open(url, '_blank', 'noopener');
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
  /* 등급 할인을 적용한 실제 결제 대상 금액 */
  function cartNet(items) {
    return items.reduce(function (sum, it) {
      var p = byId(it.id);
      return sum + (p && p.price ? mPrice(p.price) * it.qty : 0);
    }, 0);
  }
  /* 요약 영역에 '회원 등급할인' 줄을 한 번만 만들어 둡니다. */
  function ensureDiscountRow(suffix) {
    var shipEl = document.getElementById('sumShipping' + suffix);
    if (!shipEl) return null;
    var existing = document.getElementById('sumDiscount' + suffix);
    if (existing) return existing.closest('.sum-row');
    var shipRow = shipEl.closest('.sum-row') || shipEl.parentNode;
    if (!shipRow || !shipRow.parentNode) return null;
    var row = document.createElement('div');
    row.className = (shipRow.classList.contains('between') ? 'between' : 'sum-row') + ' sum-discount';
    row.innerHTML = '<span id="sumDiscountLabel' + suffix + '">회원 등급할인</span>' +
      '<span id="sumDiscount' + suffix + '" class="mono-num">—</span>';
    shipRow.parentNode.insertBefore(row, shipRow);
    return row;
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
        var lineNet = mPrice(p.price || 0) * it.qty;
        var lineGross = (p.price || 0) * it.qty;
        return '<div class="cart-line" data-line="' + p.id + '">' +
          '<img src="' + p.image + '" alt="' + p.name + '">' +
          '<div><b>' + p.name + '</b>' +
          '<span class="tiny">' + p.option + '</span>' +
          '<div class="row mt-8"><span class="qty">' +
          '<button type="button" data-qty="-1" data-id="' + p.id + '" aria-label="수량 줄이기">−</button>' +
          '<span>' + it.qty + '</span>' +
          '<button type="button" data-qty="1" data-id="' + p.id + '" aria-label="수량 늘리기">+</button>' +
          '</span></div></div>' +
          '<div style="text-align:right"><b class="mono-num">' + won(lineNet) + '원</b>' +
          (mRate() > 0 ? '<div class="tiny"><s>' + won(lineGross) + '원</s></div>' : '') +
          '<button type="button" class="tiny" data-remove="' + p.id + '" style="background:none;border:0;color:#8d938f;padding:4px 0">삭제</button></div>' +
          '</div>';
      }).join('');
    }

    var gross = cartTotal(items);
    var subtotal = cartNet(items);
    var discount = gross - subtotal;
    var ship = shippingFee(subtotal);
    ['', 'Page'].forEach(function (suffix) {
      var row = ensureDiscountRow(suffix);
      var sumSub = document.getElementById('sumSubtotal' + suffix);
      var sumDis = document.getElementById('sumDiscount' + suffix);
      var sumDisLabel = document.getElementById('sumDiscountLabel' + suffix);
      var sumShip = document.getElementById('sumShipping' + suffix);
      var sumTotal = document.getElementById('sumTotal' + suffix);
      if (sumSub) sumSub.textContent = won(gross) + '원';
      if (sumDis) {
        sumDis.textContent = discount > 0 ? '-' + won(discount) + '원' : '—';
        if (sumDisLabel) {
          sumDisLabel.textContent = discount > 0
            ? '회원 등급할인 (' + mGrade().label + ' ' + mRate() + '%)'
            : '회원 등급할인';
        }
        if (row) row.hidden = discount <= 0;
      }
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
    var priceBlock;
    if (p.price) {
      var rate = mRate();
      priceBlock =
        '<div class="price-row" data-member-lock><span class="price' + (rate > 0 ? ' price-member' : '') + '">' + won(mPrice(p.price)) + '원</span>' +
        (rate > 0
          ? '<span class="price-was">' + won(p.price) + '원</span><span class="price-off price-grade">' + mGrade().label + ' ' + rate + '%</span>'
          : (p.listPrice ? '<span class="price-was">' + won(p.listPrice) + '원</span>' : '')) +
        '</div>' +
        (rate > 0
          ? '<p class="tiny" style="margin-top:-6px">' + mGrade().label + ' 등급 할인가가 자동 적용되었습니다.</p>'
          : (mUser()
            ? '<p class="tiny" style="margin-top:-6px">현재 등급(' + mGrade().label + ')은 정상가로 주문됩니다.</p>'
            : '<p class="tiny" style="margin-top:-6px"><a href="member.html" style="text-decoration:underline">회원가입</a> 후 회사가 등급을 부여하면 대리점 30% · 총판 50% 할인가가 적용됩니다.</p>'));
    } else {
      priceBlock =
        '<div class="price-row" data-member-lock><span class="price-quote">가격 문의</span></div>' +
        (p.listPrice ? '<p class="tiny" style="margin-top:-6px">제조사 표시 소비자가 ' + won(p.listPrice) + '원 · 판매가는 카카오톡 채널로 문의해 주세요</p>' : '');
    }
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
    var gross = cartTotal(items);
    var subtotal = cartNet(items);
    var discount = gross - subtotal;
    var ship = shippingFee(subtotal);
    var d = new FormData(form);
    var lines = [];
    lines.push('[효소세상 주문서]');
    items.forEach(function (it) {
      var p = byId(it.id);
      if (!p) return;
      var line = '· ' + p.name + ' / ' + p.option + ' / ' + it.qty + '개 / ' + won(mPrice(p.price || 0) * it.qty) + '원';
      if (discount > 0) line += ' (정가 ' + won((p.price || 0) * it.qty) + '원)';
      lines.push(line);
    });
    lines.push('상품금액 ' + won(gross) + '원');
    if (discount > 0) lines.push('회원 등급할인 (' + mGrade().label + ' ' + mRate() + '%) -' + won(discount) + '원');
    lines.push('배송비 ' + (ship ? won(ship) + '원' : '무료') + ' / 합계 ' + won(subtotal + ship) + '원');
    if (mUser()) lines.push('회원 ' + mUser().name + ' (' + mUser().email + ' · ' + mGrade().label + (mRate() > 0 ? ' ' + mRate() + '%' : '') + ')');
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
  /* 로그인한 회원 정보로 주문서 인적사항을 미리 채웁니다. */
  function prefillMember() {
    var u = mUser();
    if (!u) return;
    $$('form[data-order-form]').forEach(function (f) {
      var n = f.querySelector('[name="name"]');
      var ph = f.querySelector('[name="phone"]');
      var em = f.querySelector('[name="email"]');
      if (n && !n.value) n.value = u.name || '';
      if (ph && !ph.value) ph.value = u.phone || '';
      if (em && !em.value) em.value = u.email || '';
    });
  }
  prefillMember();
  document.addEventListener('enzyme:member', function () {
    renderCart();
    prefillMember();
  });

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
          '\n\n아래 [문의 내용 복사]를 누른 뒤 카카오톡 채널로 붙여넣어 보내주시면 순서대로 답변드립니다.';
        // 복사 + 카카오톡 채널 1:1 채팅 바로가기
        var actions = document.createElement('div');
        actions.className = 'row mt-16';
        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-line btn-sm';
        copyBtn.textContent = '문의 내용 복사';
        copyBtn.addEventListener('click', function () {
          if (navigator.clipboard) navigator.clipboard.writeText(text);
          toast('문의 내용을 복사했습니다');
        });
        var chatLink = document.createElement('a');
        chatLink.className = 'btn btn-kakao btn-sm';
        chatLink.textContent = '카카오톡 채널로 보내기';
        chatLink.href = kakaoChatUrl() || '#';
        chatLink.target = '_blank';
        chatLink.rel = 'noopener';
        actions.appendChild(copyBtn);
        actions.appendChild(chatLink);
        out.appendChild(actions);
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
