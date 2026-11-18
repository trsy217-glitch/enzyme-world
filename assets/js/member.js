/* 효소세상 — member.js
   회원가입·로그인·회원 등급(일반회원 / 대리점 / 총판)과 등급별 할인가 계산.

   ⚠ 현재 버전은 서버 없이 브라우저 localStorage에 회원 정보를 저장하는 시험 운영용 구현입니다.
     - 가입한 브라우저에서만 로그인·등급 확인·할인가 적용이 됩니다.
     - 회사(관리자) 화면도 "그 브라우저에 저장된 회원"만 보여 줍니다.
     - 실제 운영(여러 기기·여러 회원)에는 서버 DB(Firebase Firestore, Supabase 등)와
       서버 측 등급 검증이 필요합니다. README의 "회원 등급" 항목을 참고하세요. */
(function () {
  'use strict';

  var CFG = window.ENZYME_CONFIG || {};
  var MCFG = CFG.member || {};
  var KEYS = {
    members: 'enzyme_members_v1',
    session: 'enzyme_session_v1',
    admin: 'enzyme_admin_v1'
  };
  /* 관리자 입장 코드 — config.js의 member.adminCode에서 바꿀 수 있습니다.
     화면에 전달되는 값이므로 실제 보안 수단이 아닙니다(시험 운영용). */
  var ADMIN_CODE = String(MCFG.adminCode || 'enzyme2026admin');

  var GRADES = [
    { key: 'normal', label: '일반회원', short: '일반회원', rate: 0, desc: '회원가입 시 기본 등급' },
    { key: 'dealer', label: '대리점', short: '대리점 30%', rate: 30, desc: '회사가 자격을 부여한 대리점' },
    { key: 'master', label: '총판', short: '총판 50%', rate: 50, desc: '회사가 자격을 부여한 총판' }
  ];

  var won = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nowISO = function () { return new Date().toISOString(); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function uid() {
    return 'mb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── 등급 ─────────────────────────────────────────────── */
  function gradeByKey(key) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].key === key) return GRADES[i];
    return GRADES[0];
  }

  /* ── 회원 저장소 ──────────────────────────────────────── */
  function allMembers() {
    var list = readJSON(KEYS.members, []);
    return Array.isArray(list) ? list : [];
  }
  function saveMembers(list) { writeJSON(KEYS.members, list); }

  function session() {
    var s = readJSON(KEYS.session, null);
    return s && s.email ? s : null;
  }
  function current() {
    var s = session();
    if (!s) return null;
    var list = allMembers();
    for (var i = 0; i < list.length; i++) if (list[i].email === s.email) return list[i];
    return null;
  }
  function currentGrade() {
    var u = current();
    return u ? gradeByKey(u.grade) : GRADES[0];
  }
  function rate() { return currentGrade().rate; }

  /* 등급 할인가 — 가격이 있는 제품에만 적용합니다. 10원 단위로 내림. */
  function priceFor(base) {
    base = Number(base) || 0;
    var r = rate();
    if (!r || !base) return base;
    return Math.floor(base * (100 - r) / 100 / 10) * 10;
  }

  /* ── 비밀번호 해시 ────────────────────────────────────── */
  function bufHex(buf) {
    var out = '';
    for (var i = 0; i < buf.length; i++) out += ('0' + buf[i].toString(16)).slice(-2);
    return out;
  }
  function randomSalt() {
    var a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return bufHex(a);
  }
  /* crypto.subtle이 없는 환경(비보안 컨텍스트)에서만 쓰는 대체 해시 — 보안용이 아닙니다. */
  function weakHash(str) {
    var h1 = 0x811c9dc5, h2 = 0x1000193, i;
    for (i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = (Math.imul(h2 ^ str.charCodeAt(i), 0x85ebca6b)) >>> 0;
    }
    return 'weak$' + h1.toString(16) + h2.toString(16);
  }
  function hashPassword(pw, salt) {
    var msg = 'enzyme:' + salt + ':' + pw;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      var enc = new TextEncoder();
      return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
        .then(function (key) {
          return crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: enc.encode('enzyme:' + salt), iterations: 120000, hash: 'SHA-256' },
            key, 256);
        })
        .then(function (bits) { return 'pbkdf2$120000$' + bufHex(new Uint8Array(bits)); })
        .catch(function () { return weakHash(msg); });
    }
    return Promise.resolve(weakHash(msg));
  }

  /* ── 가입 · 로그인 · 로그아웃 ─────────────────────────── */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function digits(v) { return String(v || '').replace(/[^0-9]/g, ''); }

  function register(input) {
    input = input || {};
    var name = String(input.name || '').trim();
    var email = String(input.email || '').trim().toLowerCase();
    var phone = String(input.phone || '').trim();
    var pw = String(input.password || '');

    if (name.length < 2) return Promise.reject(new Error('이름을 2자 이상 입력해 주세요.'));
    if (!EMAIL_RE.test(email)) return Promise.reject(new Error('이메일 주소를 확인해 주세요.'));
    if (digits(phone).length < 10) return Promise.reject(new Error('연락처를 확인해 주세요. (예: 010-0000-0000)'));
    if (pw.length < 8) return Promise.reject(new Error('비밀번호는 8자 이상으로 정해 주세요.'));
    if (!input.agree) return Promise.reject(new Error('개인정보 수집·이용에 동의해 주세요.'));

    var list = allMembers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].email === email) {
        return Promise.reject(new Error('이미 가입된 이메일입니다. 로그인해 주세요.'));
      }
    }
    var salt = randomSalt();
    var at = nowISO();
    return hashPassword(pw, salt).then(function (hash) {
      var user = {
        id: uid(),
        email: email,
        name: name,
        phone: phone,
        grade: 'normal',            /* 가입 시 기본 등급 = 일반회원 (할인 0%) */
        salt: salt,
        hash: hash,
        joinedAt: at,
        updatedAt: at,
        history: [{ at: at, grade: 'normal', by: '회원가입' }]
      };
      var latest = allMembers();
      latest.push(user);
      saveMembers(latest);
      writeJSON(KEYS.session, { email: email, at: at });
      emit();
      return user;
    });
  }

  function login(email, pw) {
    var target = String(email || '').trim().toLowerCase();
    var password = String(pw || '');
    if (!target || !password) return Promise.reject(new Error('이메일과 비밀번호를 입력해 주세요.'));
    var list = allMembers();
    var found = null;
    for (var i = 0; i < list.length; i++) if (list[i].email === target) found = list[i];
    if (!found) return Promise.reject(new Error('이메일 또는 비밀번호가 맞지 않습니다.'));
    return hashPassword(password, found.salt).then(function (hash) {
      if (hash !== found.hash) throw new Error('이메일 또는 비밀번호가 맞지 않습니다.');
      writeJSON(KEYS.session, { email: found.email, at: nowISO() });
      emit();
      return found;
    });
  }

  function logout() {
    try { localStorage.removeItem(KEYS.session); } catch (e) {}
    emit();
  }

  /* ── 관리자(회사) 등급 관리 ───────────────────────────── */
  function isAdmin() {
    try { return sessionStorage.getItem(KEYS.admin) === '1'; } catch (e) { return false; }
  }
  function unlockAdmin(code) {
    if (String(code || '').trim() === ADMIN_CODE) {
      try { sessionStorage.setItem(KEYS.admin, '1'); } catch (e) {}
      return true;
    }
    return false;
  }
  function lockAdmin() {
    try { sessionStorage.removeItem(KEYS.admin); } catch (e) {}
  }
  function getMembers() {
    return allMembers().slice().sort(function (a, b) {
      return String(b.joinedAt || '').localeCompare(String(a.joinedAt || ''));
    });
  }
  function setGrade(email, gradeKey) {
    if (!isAdmin()) throw new Error('관리자 확인이 필요합니다.');
    var g = null;
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].key === gradeKey) g = GRADES[i];
    if (!g) throw new Error('알 수 없는 등급입니다.');
    var list = allMembers();
    var target = null;
    for (var j = 0; j < list.length; j++) if (list[j].email === email) target = list[j];
    if (!target) throw new Error('회원을 찾을 수 없습니다.');
    var at = nowISO();
    target.grade = g.key;
    target.updatedAt = at;
    target.history = (Array.isArray(target.history) ? target.history : []).concat([{ at: at, grade: g.key, by: '회사 관리자' }]);
    if (target.history.length > 20) target.history = target.history.slice(-20);
    saveMembers(list);
    emit();
    return target;
  }

  /* ── 화면 반영 ────────────────────────────────────────── */
  var listeners = [];
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function emit() {
    renderHeader();
    applyPrices();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](current()); } catch (e) {}
    }
    try {
      document.dispatchEvent(new CustomEvent('enzyme:member', {
        detail: { user: current(), grade: currentGrade(), rate: rate() }
      }));
    } catch (e) {}
  }

  function mountHeader() {
    var actions = $('.header-actions');
    if (actions && !$('[data-member-link]', actions)) {
      var a = document.createElement('a');
      a.className = 'member-btn';
      a.href = 'member.html';
      a.setAttribute('data-member-link', '');
      var cart = $('.cart-btn', actions);
      actions.insertBefore(a, cart || actions.firstChild);
    }
    var menu = $('#mobileMenu');
    if (menu && !$('[data-member-link-mobile]', menu)) {
      var m = document.createElement('a');
      m.href = 'member.html';
      m.setAttribute('data-member-link-mobile', '');
      menu.appendChild(m);
    }
    renderHeader();
  }

  function renderHeader() {
    var user = current();
    var g = currentGrade();
    $$('[data-member-link]').forEach(function (a) {
      if (user) {
        a.innerHTML = '<span class="member-grade" data-grade="' + g.key + '">' + esc(g.short) + '</span>' +
          '<span class="member-name">' + esc(user.name) + ' 님</span>';
        a.setAttribute('aria-label', user.name + ' 님 · ' + g.label + ' · 내 회원정보');
      } else {
        a.innerHTML = '<span class="member-login">로그인</span><span class="member-join">회원가입</span>';
        a.setAttribute('aria-label', '회원 로그인 · 회원가입');
      }
      a.setAttribute('href', 'member.html');
    });
    $$('[data-member-link-mobile]').forEach(function (a) {
      a.textContent = user ? ('내 회원정보 · ' + g.label + (g.rate ? ' ' + g.rate + '%' : '')) : '로그인 · 회원가입';
    });
  }

  function parseWon(text) {
    var n = Number(String(text || '').replace(/[^0-9]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /* 화면에 표시된 판매가(.price)에 등급 할인가를 적용/원복합니다.
     '가격 문의'(.price-quote) 상품은 건드리지 않습니다. */
  function applyPrices() {
    var r = rate();
    var g = currentGrade();
    $$('.price-row').forEach(function (row) {
      /* 상세 보기 창은 site.js가 등급가를 직접 그리므로 다시 계산하지 않습니다. */
      if (row.hasAttribute('data-member-lock') || row.closest('.modal')) return;
      var priceEl = $('.price', row);
      if (!priceEl) return;
      if (!row.getAttribute('data-member-init')) {
        row.setAttribute('data-member-init', '1');
        var was0 = $('.price-was', row);
        var off0 = $('.price-off', row);
        row.setAttribute('data-base-price', String(parseWon(priceEl.textContent)));
        row.setAttribute('data-was-text', was0 ? was0.textContent : '');
        row.setAttribute('data-off-text', off0 ? off0.textContent : '');
      }
      var base = Number(row.getAttribute('data-base-price')) || 0;
      if (!base) return;

      var was = $('.price-was', row);
      var off = $('.price-off:not(.member-price-badge)', row);
      var badge = $('.member-price-badge', row);

      if (r > 0) {
        priceEl.textContent = won(priceFor(base)) + '원';
        priceEl.classList.add('price-member');
        if (!was) {
          was = document.createElement('span');
          was.className = 'price-was';
          row.insertBefore(was, priceEl.nextSibling);
        }
        was.textContent = won(base) + '원';
        was.hidden = false;
        if (off) off.hidden = true;
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'price-off price-grade member-price-badge';
          row.appendChild(badge);
        }
        badge.textContent = g.label + ' ' + g.rate + '%';
        badge.hidden = false;
      } else {
        priceEl.textContent = won(base) + '원';
        priceEl.classList.remove('price-member');
        if (was) {
          var wasText = row.getAttribute('data-was-text') || '';
          was.textContent = wasText;
          was.hidden = !wasText;
        }
        if (off) {
          off.hidden = false;
          var offText = row.getAttribute('data-off-text') || '';
          if (offText) off.textContent = offText;
        }
        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
      }
    });
  }

  function boot() {
    mountHeader();
    applyPrices();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('storage', function (e) {
    if (!e || e.key === KEYS.members || e.key === KEYS.session) emit();
  });

  window.ENZYME_MEMBER = {
    GRADES: GRADES,
    won: won,
    esc: esc,
    gradeByKey: gradeByKey,
    current: current,
    currentGrade: currentGrade,
    rate: rate,
    priceFor: priceFor,
    register: register,
    login: login,
    logout: logout,
    onChange: onChange,
    isAdmin: isAdmin,
    unlockAdmin: unlockAdmin,
    lockAdmin: lockAdmin,
    members: getMembers,
    setGrade: setGrade,
    refresh: emit
  };
})();
