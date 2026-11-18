/* 효소세상 — member.js
   회원가입·로그인·회원 등급(일반회원 / 대리점 / 총판)과 등급별 할인가 계산.

   백엔드: Firebase Authentication(이메일·비밀번호, Google) + Cloud Firestore
     - members/{uid} 문서에 이름·연락처·등급·변경 이력을 저장합니다.
     - 등급은 회원이 직접 바꿀 수 없고, Firestore 보안 규칙(firestore.rules)이
       '회사 관리자'의 변경만 허용합니다. 관리자 여부는 config/admin 문서의
       emails 목록에 있고 이메일 인증이 끝난 계정만 인정됩니다.
   Firebase SDK(compat)는 각 페이지에서 member.js보다 먼저 불러옵니다. */
(function () {
  'use strict';

  var CFG = window.ENZYME_CONFIG || {};
  var FBCFG = CFG.firebase || {};
  var SDK = { ok: false, auth: null, db: null, error: '' };
  var COL = { members: 'members', config: 'config', admin: 'admin' };

  var GRADES = [
    { key: 'normal', label: '일반회원', short: '일반회원', rate: 0, desc: '회원가입 시 기본 등급' },
    { key: 'dealer', label: '대리점', short: '대리점 30%', rate: 30, desc: '회사가 자격을 부여한 대리점' },
    { key: 'master', label: '총판', short: '총판 50%', rate: 50, desc: '회사가 자격을 부여한 총판' }
  ];

  var won = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nowISO = function () { return new Date().toISOString(); };
  var lower = function (v) { return String(v == null ? '' : v).toLowerCase(); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 상태 ─────────────────────────────────────────────── */
  var state = {
    user: null,        /* Firebase Auth 사용자 */
    profile: null,     /* members/{uid} 문서 + uid */
    admin: false,      /* 회사 관리자 여부 */
    error: ''
  };
  var listeners = [];
  var creating = false;   /* 가입 처리 중에는 onAuthStateChanged가 프로필을 먼저 만들지 않도록 합니다. */
  var createdUser = null;
  var readyResolve = null;
  var isReady = false;
  var readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
  function finishReady() {
    if (isReady) return;
    isReady = true;
    if (readyResolve) readyResolve(true);
  }

  /* ── 등급 ─────────────────────────────────────────────── */
  function gradeByKey(key) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].key === key) return GRADES[i];
    return GRADES[0];
  }
  function current() { return state.profile; }
  function currentGrade() {
    return state.profile ? gradeByKey(state.profile.grade) : GRADES[0];
  }
  function rate() { return currentGrade().rate; }

  /* 등급 할인가 — 가격이 있는 제품에만 적용합니다. 10원 단위로 내림. */
  function priceFor(base) {
    base = Number(base) || 0;
    var r = rate();
    if (!r || !base) return base;
    return Math.floor(base * (100 - r) / 100 / 10) * 10;
  }

  /* ── 오류 메시지 ──────────────────────────────────────── */
  var MESSAGES = {
    'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/invalid-email': '이메일 주소를 확인해 주세요.',
    'auth/weak-password': '비밀번호는 8자 이상으로 정해 주세요.',
    'auth/user-not-found': '이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/user-disabled': '사용이 정지된 계정입니다. 회사에 문의해 주세요.',
    'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
    'auth/popup-closed-by-user': '로그인 창을 닫으셨습니다. 다시 시도해 주세요.',
    'auth/popup-blocked': '로그인 창이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.',
    'auth/cancelled-popup-request': '로그인 창이 취소되었습니다. 다시 시도해 주세요.',
    'auth/operation-not-allowed': '이 로그인 방법이 아직 사용 설정되지 않았습니다. 회사에 문의해 주세요.',
    'auth/unauthorized-domain': '이 사이트 주소가 Firebase에 등록되어 있지 않습니다. 회사에 문의해 주세요.',
    'auth/account-exists-with-different-credential': '같은 이메일로 다른 방법(비밀번호)으로 가입된 계정이 있습니다. 이메일·비밀번호로 로그인해 주세요.',
    'permission-denied': '회원 정보를 읽거나 저장할 권한이 없습니다. 회사에 문의해 주세요.',
    'unavailable': '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  };
  function msgOf(err) {
    if (!err) return '알 수 없는 오류가 발생했습니다.';
    var code = String(err.code || '');
    if (MESSAGES[code]) return MESSAGES[code];
    if (code.indexOf('auth/') === 0) return '로그인 처리 중 문제가 생겼습니다. (' + code + ')';
    return err.message || '처리하지 못했습니다.';
  }
  function fail(err) {
    var e = new Error(msgOf(err));
    e.code = (err && err.code) || '';
    return e;
  }

  /* ── Firebase 초기화 ──────────────────────────────────── */
  /* Firebase SDK(compat)는 필요한 페이지만 골라 부을 수 있게 여기서 불러옵니다.
     (이미 페이지에 <script>로 들어 있으면 그대로 사용합니다.) */
  var SDK_BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var SDK_FILES = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
  var sdkPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(true); };
      s.onerror = function () { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadSdk() {
    if (window.firebase && window.firebase.auth && window.firebase.firestore) return Promise.resolve(true);
    if (sdkPromise) return sdkPromise;
    sdkPromise = SDK_FILES.reduce(function (seq, file) {
      return seq.then(function () { return loadScript(SDK_BASE + file); });
    }, Promise.resolve(true)).then(function () { return true; }, function () {
      SDK.error = 'Firebase SDK를 불러오지 못했습니다.';
      return false;
    });
    return sdkPromise;
  }

  function initFirebase() {
    if (!window.firebase || !FBCFG.apiKey || !FBCFG.projectId) {
      SDK.error = 'Firebase 설정을 찾지 못했습니다.';
      return false;
    }
    try {
      SDK.app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(FBCFG);
      SDK.auth = firebase.auth();
      SDK.db = firebase.firestore();
      /* 로그인 상태를 이 기기에 유지합니다(다음 방문 시 자동 로그인). */
      try { SDK.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
      SDK.ok = true;
      return true;
    } catch (e) {
      SDK.error = e && e.message ? e.message : String(e);
      return false;
    }
  }

  function memberRef(uid) { return SDK.db.collection(COL.members).doc(uid); }

  /* Firebase SDK 준비 보장 — 필요할 때 불러오고 앱을 초기화합니다. */
  function ensureSdk() {
    return loadSdk().then(function (ok) {
      if (!ok) throw new Error('회원 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      if (!SDK.ok && !initFirebase()) {
        throw new Error('회원 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      subscribeAuth();
      return SDK;
    });
  }  function cleanProfile(uid, data) {
    var p = {};
    data = data || {};
    p.uid = uid;
    p.email = data.email || '';
    p.name = data.name || '';
    p.phone = data.phone || '';
    p.grade = data.grade || 'normal';
    p.joinedAt = data.joinedAt || '';
    p.updatedAt = data.updatedAt || data.joinedAt || '';
    p.history = Array.isArray(data.history) ? data.history : [];
    return p;
  }

  /* 가입 직후·Google 로그인처럼 members 문서가 아직 없을 때 기본 등급으로 만듭니다. */
  function createProfile(user, extra) {
    extra = extra || {};
    var at = nowISO();
    var doc = {
      email: lower(user.email || extra.email || ''),
      name: String(extra.name || user.displayName || (user.email || '').split('@')[0] || '회원').slice(0, 40),
      phone: String(extra.phone || '').slice(0, 30),
      grade: 'normal',
      joinedAt: at,
      updatedAt: at,
      history: [{ at: at, grade: 'normal', by: extra.by || '회원가입' }]
    };
    return memberRef(user.uid).set(doc).then(function () {
      return cleanProfile(user.uid, doc);
    }, function (err) {
      /* 동시에 문서가 만들어졌다면(이미 있음) 읽어서 사용합니다. */
      return memberRef(user.uid).get().then(function (snap) {
        if (snap.exists) return cleanProfile(user.uid, snap.data());
        throw fail(err);
      }, function () { throw fail(err); });
    });
  }

  function loadProfile(user, createIfMissing) {
    return memberRef(user.uid).get().then(function (snap) {
      if (snap.exists) return cleanProfile(user.uid, snap.data());
      if (createIfMissing === false) return null;
      return createProfile(user, { by: '로그인' });
    });
  }

  function loadAdminFlag(user) {
    if (!user || !SDK.ok) { state.admin = false; return Promise.resolve(false); }
    return SDK.db.collection(COL.config).doc(COL.admin).get().then(function (snap) {
      var emails = (snap.exists && snap.data() && snap.data().emails) || [];
      var list = Array.isArray(emails) ? emails.map(lower) : [];
      state.admin = !!user.emailVerified && list.indexOf(lower(user.email)) > -1;
      return state.admin;
    }).catch(function () {
      state.admin = false;
      return false;
    });
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
    if (!SDK.ok) return ensureSdk().then(function () { return register(input); });
    creating = true;

    return SDK.auth.createUserWithEmailAndPassword(email, pw).then(function (cred) {
      var user = cred.user;
      createdUser = user;
      var done = function () {
        return createProfile(user, { name: name, phone: phone, by: '회원가입' }).then(function (profile) {
          creating = false;
          state.user = user;
          state.profile = profile;
          return loadAdminFlag(user).then(function () {
            finishReady();
            emit();
            return profile;
          });
        });
      };
      var named = user.updateProfile ? user.updateProfile({ displayName: name }) : Promise.resolve();
      return named.catch(function () { return null; }).then(done);
    }).catch(function (err) {
      creating = false;
      /* 가입은 됐는데 회원 문서 저장이 실패한 경우: 계정을 남기지 않습니다. */
      if (createdUser && !state.profile) {
        try { SDK.auth.signOut(); } catch (e) {}
      }
      createdUser = null;
      throw fail(err);
    });
  }

  function login(email, pw) {
    var target = String(email || '').trim();
    var password = String(pw || '');
    if (!target || !password) return Promise.reject(new Error('이메일과 비밀번호를 입력해 주세요.'));
    if (!SDK.ok) return ensureSdk().then(function () { return login(email, pw); });

    return SDK.auth.signInWithEmailAndPassword(target, password).then(function (cred) {
      return loadProfile(cred.user, true).then(function (profile) {
        state.user = cred.user;
        state.profile = profile;
        return loadAdminFlag(cred.user).then(function () {
          finishReady();
          emit();
          return profile;
        });
      });
    }).catch(function (err) { throw fail(err); });
  }

  /* Google 계정 로그인 — 회사 관리자(이메일 인증 완료 계정)가 쓰는 방법입니다. */
  function signInWithGoogle() {
    if (!SDK.ok) return ensureSdk().then(function () { return signInWithGoogle(); });
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return SDK.auth.signInWithPopup(provider).then(function (cred) {
      return loadProfile(cred.user, true).then(function (profile) {
        state.user = cred.user;
        state.profile = profile;
        return loadAdminFlag(cred.user).then(function () {
          finishReady();
          emit();
          return { profile: profile, admin: state.admin };
        });
      });
    }).catch(function (err) { throw fail(err); });
  }

  function resetPassword(email) {
    var target = String(email || '').trim();
    if (!EMAIL_RE.test(target)) return Promise.reject(new Error('이메일 주소를 확인해 주세요.'));
    if (!SDK.ok) return ensureSdk().then(function () { return resetPassword(email); });
    return SDK.auth.sendPasswordResetEmail(target).then(function () { return true; }, function (err) { throw fail(err); });
  }

  function logout() {
    state.error = '';
    if (!SDK.ok) { state.user = null; state.profile = null; state.admin = false; emit(); return Promise.resolve(); }
    return SDK.auth.signOut().then(function () {
      state.user = null;
      state.profile = null;
      state.admin = false;
      emit();
    }, function (err) { throw fail(err); });
  }

  /* ── 관리자(회사) 등급 관리 ───────────────────────────── */
  function isAdmin() { return !!state.admin; }
  function user() { return state.user; }

  function listMembers() {
    if (!SDK.ok) return ensureSdk().then(function () { return listMembers(); });
    if (!state.admin) return Promise.reject(new Error('관리자만 회원 목록을 볼 수 있습니다.'));
    return SDK.db.collection(COL.members).orderBy('joinedAt', 'desc').get().then(function (qs) {
      var out = [];
      qs.forEach(function (doc) { out.push(cleanProfile(doc.id, doc.data())); });
      return out;
    }).catch(function (err) { throw fail(err); });
  }

  function setGrade(uid, gradeKey) {
    if (!SDK.ok) return ensureSdk().then(function () { return setGrade(uid, gradeKey); });
    if (!state.admin) return Promise.reject(new Error('관리자 확인이 필요합니다.'));
    var g = null;
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].key === gradeKey) g = GRADES[i];
    if (!g) return Promise.reject(new Error('알 수 없는 등급입니다.'));
    var ref = memberRef(uid);
    return ref.get().then(function (snap) {
      if (!snap.exists) throw new Error('회원을 찾을 수 없습니다.');
      var cur = snap.data() || {};
      if (cur.grade === g.key) return cleanProfile(uid, cur);
      var at = nowISO();
      var entry = { at: at, grade: g.key, by: '회사 관리자' };
      return ref.update({
        grade: g.key,
        updatedAt: at,
        history: firebase.firestore.FieldValue.arrayUnion(entry)
      }).then(function () {
        var history = (Array.isArray(cur.history) ? cur.history : []).concat([entry]);
        var trimmed = history.slice(-20);
        if (trimmed.length !== history.length) {
          return ref.update({ history: trimmed }).catch(function () { return null; });
        }
        return null;
      }).then(function () {
        return cleanProfile(uid, {
          email: cur.email, name: cur.name, phone: cur.phone,
          grade: g.key, joinedAt: cur.joinedAt, updatedAt: at,
          history: (Array.isArray(cur.history) ? cur.history : []).concat([entry]).slice(-20)
        });
      });
    }).catch(function (err) { throw fail(err); });
  }

  /* ── 화면 반영 ────────────────────────────────────────── */
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function emit() {
    renderHeader();
    applyPrices();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](current()); } catch (e) {}
    }
    try {
      document.dispatchEvent(new CustomEvent('enzyme:member', {
        detail: { user: current(), grade: currentGrade(), rate: rate(), admin: state.admin, ready: isReady }
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
    var u = current();
    var g = currentGrade();
    $$('[data-member-link]').forEach(function (a) {
      if (u) {
        a.innerHTML = '<span class="member-grade" data-grade="' + g.key + '">' + esc(g.short) + '</span>' +
          '<span class="member-name">' + esc(u.name) + ' 님</span>';
        a.setAttribute('aria-label', u.name + ' 님 · ' + g.label + ' · 내 회원정보');
      } else {
        a.innerHTML = '<span class="member-login">로그인</span><span class="member-join">회원가입</span>';
        a.setAttribute('aria-label', '회원 로그인 · 회원가입');
      }
      a.setAttribute('href', 'member.html');
    });
    $$('[data-member-link-mobile]').forEach(function (a) {
      a.textContent = u ? ('내 회원정보 · ' + g.label + (g.rate ? ' ' + g.rate + '%' : '')) : '로그인 · 회원가입';
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

  /* ── 시작 ─────────────────────────────────────────────── */
  var subscribed = false;
  function subscribeAuth() {
    if (subscribed || !SDK.ok) return;
    subscribed = true;
    SDK.auth.onAuthStateChanged(function (fbUser) {
      state.user = fbUser || null;
      if (!fbUser) {
        state.profile = null;
        state.admin = false;
        finishReady();
        emit();
        return;
      }
      /* 가입 처리 중: register()가 프로필을 만든 뒤 직접 화면을 갱신합니다. */
      if (creating) return;
      loadProfile(fbUser, true).then(function (profile) {
        state.profile = profile;
        return loadAdminFlag(fbUser);
      }).catch(function (err) {
        state.profile = null;
        state.error = msgOf(err);
      }).then(function () {
        finishReady();
        emit();
      });
    }, function (err) {
      state.error = msgOf(err);
      finishReady();
      emit();
    });
  }

  function start() {
    mountHeader();
    applyPrices();
    loadSdk().then(function (ok) {
      if (!ok || !initFirebase()) {
        finishReady();
        emit();
        return;
      }
      subscribeAuth();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.ENZYME_MEMBER = {
    GRADES: GRADES,
    won: won,
    esc: esc,
    gradeByKey: gradeByKey,
    ready: function () { return readyPromise; },
    available: function () { return !!(FBCFG.apiKey && FBCFG.projectId); },
    sdkError: function () { return SDK.error; },
    current: current,
    currentGrade: currentGrade,
    rate: rate,
    priceFor: priceFor,
    register: register,
    login: login,
    signInWithGoogle: signInWithGoogle,
    resetPassword: resetPassword,
    logout: logout,
    onChange: onChange,
    isAdmin: isAdmin,
    authUser: user,
    error: function () { return state.error; },
    members: listMembers,
    setGrade: setGrade,
    refresh: function () {
      if (!SDK.ok) { emit(); return Promise.resolve(); }
      var fbUser = SDK.auth.currentUser;
      if (!fbUser) { state.profile = null; state.admin = false; emit(); return Promise.resolve(); }
      return loadProfile(fbUser, true).then(function (profile) {
        state.profile = profile;
        return loadAdminFlag(fbUser);
      }).then(function () { emit(); });
    }
  };
})();
