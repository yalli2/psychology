(function () {
  'use strict';
  const P = window.PSY;
  const LANGS = P.langs.map(l => l.code);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- storage (safe) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  // ---------- language ----------
  function detectLang() {
    const saved = store.get('psy-lang', null);
    if (saved && LANGS.includes(saved)) return saved;
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.includes(q)) return q;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.includes(nav) ? nav : 'en';
  }
  let lang = detectLang();
  const t = o => (o == null ? '' : typeof o === 'string' ? o : (o[lang] != null ? o[lang] : o.en));
  const U = k => t(P.ui[k]);
  function setLang(l) { lang = l; store.set('psy-lang', l); document.documentElement.lang = l; render(); }

  // ---------- data ----------
  const E = P.entries || {};
  const partOf = {};
  P.parts.forEach(p => p.ids.forEach(id => { partOf[id] = p; }));
  const available = id => !!E[id];

  const scores = () => store.get('psy-scores', {});
  function saveScore(id, got, total) {
    const s = scores(); const prev = s[id];
    if (!prev || got / total >= prev.got / prev.total) s[id] = { got, total };
    store.set('psy-scores', s);
  }
  const tests = () => store.get('psy-tests', {});
  function saveTest(n, pct) { const s = tests(); if (!s[n] || pct > s[n]) s[n] = pct; store.set('psy-tests', s); }

  function chLabel(p) { return lang === 'zh' || lang === 'ja' ? `${U('chapterN')}${p.n}${U('chapterSuffix')}` : `${U('chapterN')} ${p.n}`; }

  // ---------- header ----------
  function header(isHome) {
    const cur = P.langs.find(l => l.code === lang);
    return `<header class="top"><div class="wrap">
      <a class="brand" href="index.html"><span class="logo">Ψ</span><span><b>${esc(U('siteTitle'))}</b><small>${esc(U('siteSub'))}</small></span></a>
      <nav>${isHome ? '' : `<a class="home" href="index.html">← ${esc(U('home'))}</a>`}
        <div class="lang" id="lang"><button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Language">🌐 <span>${esc(cur.label)}</span> ▾</button>
          <ul>${P.langs.map(l => `<li><button type="button" data-lang="${l.code}" aria-current="${l.code === lang}">${esc(l.label)}</button></li>`).join('')}</ul></div>
      </nav></div></header>`;
  }
  function bindHeader() {
    const box = $('#lang'); if (!box) return;
    const btn = box.querySelector('button');
    btn.onclick = e => { e.stopPropagation(); box.classList.toggle('open'); btn.setAttribute('aria-expanded', box.classList.contains('open')); };
    box.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
    document.addEventListener('click', () => box.classList.remove('open'), { once: true });
  }
  const footer = () => `<footer class="foot"><div class="wrap">${esc(U('footer'))}<br><button type="button" id="reset">${esc(U('reset'))}</button></div></footer>`;
  function bindFooter() { const r = $('#reset'); if (r) r.onclick = () => { if (confirm(U('resetConfirm'))) { store.set('psy-scores', {}); store.set('psy-tests', {}); render(); } }; }

  // ================= HOME =================
  let searchQ = '';
  function renderHome() {
    const s = scores();
    const total = P.parts.reduce((a, p) => a + p.ids.length, 0);
    const done = Object.keys(s).filter(k => partOf[k]).length;
    const qCount = Object.values(E).reduce((a, e) => a + (e.quiz ? e.quiz.length : 0), 0);
    const app = $('#app');
    app.innerHTML = header(true) + `<main class="wrap">
      <section class="hero">
        <div class="eyebrow">${esc(U('siteSub'))} · Big Ideas Simply Explained</div>
        <h1>${esc(U('heroTitle'))}</h1>
        <p>${esc(U('heroText'))}</p>
        <div class="stats">
          <div class="stat"><b>${P.parts.length}</b><span>${esc(U('chapters'))}</span></div>
          <div class="stat"><b>${total}</b><span>${esc(U('thinkers'))}</span></div>
          <div class="stat"><b>${qCount}</b><span>${esc(U('questions'))}</span></div>
          <div class="stat progress"><span>${esc(U('myProgress'))} — <b style="display:inline;font-size:16px">${done}/${total}</b> ${esc(U('completed'))}</span><div class="bar"><i style="width:${(done / total * 100).toFixed(1)}%"></i></div></div>
        </div>
        <div class="searchbox"><input id="q" type="search" autocomplete="off" placeholder="${esc(U('search'))}" value="${esc(searchQ)}"></div>
        <div id="res"></div>
      </section>
      <section class="grid">${P.parts.map(p => partCard(p, s)).join('')}</section>
    </main>` + footer();
    bindHeader(); bindFooter();
    const inp = $('#q');
    inp.oninput = () => { searchQ = inp.value; showResults(); };
    showResults();
  }
  function partCard(p, s) {
    const tb = tests()[p.n];
    return `<article class="ch" style="--c:${p.color}">
      <header><span class="ico">${p.icon}</span><div class="num">${esc(chLabel(p))}</div><h2>${esc(t(p.title))}</h2><p>${esc(t(p.sub))}</p></header>
      <div class="meta"><span>👤 ${p.ids.length} ${esc(U('thinkers'))}</span><span>📝 ${p.ids.length * 5} ${esc(U('questions'))}</span><span>📖 p.${p.pages}</span>${tb != null ? `<span>🏆 ${tb}%</span>` : ''}</div>
      <ol>${p.ids.map(id => { const e = E[id]; const sc = s[id];
        return `<li><a href="chapter.html?p=${p.n}#e=${id}"><span class="pg">${e ? e.page : ''}</span><span class="nm">${esc(e ? t(e.name) : id)}<small>${esc(e ? t(e.title) : '')}</small></span><span class="sc">${sc ? `✓ ${sc.got}/${sc.total}` : ''}</span></a></li>`; }).join('')}</ol>
      <a class="go" href="chapter.html?p=${p.n}">${esc(U('open'))} →</a></article>`;
  }
  function showResults() {
    const box = $('#res'); const q = searchQ.trim().toLowerCase();
    if (!q) { box.innerHTML = ''; return; }
    const hits = [];
    for (const p of P.parts) for (const id of p.ids) {
      const e = E[id]; if (!e) continue;
      const hay = LANGS.map(l => [e.name[l], e.title[l], e.approach[l], (e.terms || []).map(x => x.term[l]).join(' ')].join(' ')).join(' ').toLowerCase();
      if (hay.includes(q)) hits.push([p, e]);
    }
    box.innerHTML = `<div class="results">${hits.length ? hits.slice(0, 12).map(([p, e]) => `<a href="chapter.html?p=${p.n}#e=${e.id}"><span class="dot" style="background:${p.color}"></span><span><b>${esc(t(e.name))}</b> — ${esc(t(e.title))} <small>· ${esc(t(p.title))}</small></span></a>`).join('') : `<a>${esc(U('noResults'))}</a>`}</div>`;
  }

  // ================= CHAPTER =================
  const params = new URLSearchParams(location.search);
  const part = P.parts.find(p => String(p.n) === params.get('p')) || P.parts[0];
  const qState = {};      // per entry: {sel:[], checked:false}
  let testState = null;   // {n, items:[{id,qi}], sel:[], checked}
  let matchState = null;
  let cardState = null;

  function route() {
    const h = location.hash.replace('#', '');
    if (h === 'test' || h === 'match' || h === 'cards') return { view: h };
    const m = h.match(/^e=(\w+)/);
    const id = m && part.ids.includes(m[1]) ? m[1] : part.ids.find(available) || part.ids[0];
    return { view: 'learn', id };
  }

  function renderChapter() {
    const r = route(); const s = scores();
    const idx = P.parts.indexOf(part);
    const prevP = P.parts[idx - 1], nextP = P.parts[idx + 1];
    document.title = `${t(part.title)} · ${U('siteTitle')}`;
    const tabs = [['learn', U('learn') + ' · ' + U('practice'), `#e=${r.id || part.ids[0]}`], ['test', U('chapterTest'), '#test'], ['match', U('match'), '#match'], ['cards', U('cards'), '#cards']];
    $('#app').innerHTML = header(false) + `<div style="--c:${part.color}">
      <section class="band"><div class="wrap">
        <div class="pager">${prevP ? `<a href="chapter.html?p=${prevP.n}">← ${esc(t(prevP.title))}</a>` : '<span></span>'}${nextP ? `<a href="chapter.html?p=${nextP.n}">${esc(t(nextP.title))} →</a>` : ''}</div>
        <div class="num">${part.icon} ${esc(chLabel(part))} · p.${part.pages}</div>
        <h1>${esc(t(part.title))}</h1><div class="sub">${esc(t(part.sub))}</div>
        <p class="intro">${esc(t(part.intro))}</p>
        <div class="chnav" role="tablist">${tabs.map(([k, l, h]) => `<button role="tab" aria-selected="${r.view === k}" data-h="${h}">${esc(l)}</button>`).join('')}</div>
      </div></section>
      <div class="wrap layout">
        <aside class="side">${part.ids.map((id, i) => { const e = E[id]; const sc = s[id];
          return `<a href="#e=${id}" aria-current="${r.view === 'learn' && r.id === id}"><span class="i">${i + 1}</span><span>${esc(e ? t(e.name) : id)}</span><span class="st">${sc ? sc.got + '/' + sc.total : ''}</span></a>`; }).join('')}</aside>
        <main id="main"></main>
      </div></div>` + footer();
    bindHeader(); bindFooter();
    document.querySelectorAll('.chnav button').forEach(b => b.onclick = () => { location.hash = b.dataset.h; });
    const main = $('#main');
    if (r.view === 'learn') renderEntry(main, r.id);
    else if (r.view === 'test') renderTest(main);
    else if (r.view === 'match') renderMatch(main);
    else renderCards(main);
  }

  function mobilePick(cur) {
    return `<div class="mobilepick"><select id="mpick">${part.ids.map((id, i) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${i + 1}. ${esc(E[id] ? t(E[id].name) : id)}</option>`).join('')}</select></div>`;
  }

  function renderEntry(main, id) {
    const e = E[id];
    if (!e) { main.innerHTML = mobilePick(id) + `<div class="card">${esc(U('loading'))}</div>`; bindPick(); return; }
    const i = part.ids.indexOf(id);
    const prev = part.ids[i - 1], next = part.ids[i + 1];
    const st = qState[id] || (qState[id] = { sel: Array(e.quiz.length).fill(null), checked: false });
    const best = scores()[id];
    main.innerHTML = mobilePick(id) + `
      <article class="card entry-head">
        <div class="who"><span class="chip">${esc(t(P.ui.approach))}: ${esc(t(e.approach))}</span><span>📖 ${esc(U('page'))}${e.page}${lang === 'zh' ? '页' : ''}</span></div>
        <h2>${esc(t(e.title))}</h2>
        <div class="name">${esc(t(e.name))}<span>${esc(e.years)}</span></div>
        <p class="summary">${esc(t(e.summary))}</p>
        <h3 class="sec">${esc(U('keyPoints'))}</h3>
        <ul class="kp">${(e.keyPoints[lang] || e.keyPoints.en).map(k => `<li>${esc(k)}</li>`).join('')}</ul>
        <h3 class="sec">${esc(U('inContext'))}</h3>
        <div class="tl">${e.timeline.map(x => `<div><b>${esc(x.year)}</b>${esc(t(x.text))}</div>`).join('')}</div>
        <h3 class="sec">${esc(U('keyTerms'))}</h3>
        <div class="terms">${e.terms.map(x => `<div><b>${esc(t(x.term))}</b><span>${esc(t(x.def))}</span></div>`).join('')}</div>
        <div class="think"><b>💬 ${esc(U('discuss'))}</b>${esc(t(e.think))}</div>
      </article>
      <section class="card" id="quiz">
        <div class="qhead"><h3>✏️ ${esc(U('practice'))} — ${esc(t(e.name))}</h3>${best ? `<span class="best">🏆 ${esc(U('best'))}: ${best.got}/${best.total}</span>` : ''}</div>
        <div id="qs"></div>
      </section>
      <nav class="navrow">${prev ? `<a href="#e=${prev}"><small>← ${esc(U('prev'))}</small>${esc(E[prev] ? t(E[prev].name) : prev)}</a>` : ''}${next ? `<a class="nx" href="#e=${next}"><small>${esc(U('next'))} →</small>${esc(E[next] ? t(E[next].name) : next)}</a>` : ''}</nav>`;
    bindPick();
    const items = e.quiz.map((q, qi) => ({ id, qi }));
    quizBlock($('#qs'), items, st, (got, total) => { saveScore(id, got, total); refreshSide(); });
  }
  function bindPick() { const s = $('#mpick'); if (s) s.onchange = () => { location.hash = 'e=' + s.value; }; }
  function refreshSide() {
    const s = scores();
    document.querySelectorAll('.side a').forEach(a => { const id = a.getAttribute('href').slice(3); const sc = s[id]; a.querySelector('.st').textContent = sc ? sc.got + '/' + sc.total : ''; });
  }

  // generic quiz renderer: items [{id, qi}], st {sel, checked}
  function quizBlock(box, items, st, onScore, showFrom) {
    const draw = (warn) => {
      const letters = 'ABCD';
      box.innerHTML = items.map((it, k) => {
        const q = E[it.id].quiz[it.qi]; const tx = q.t[lang] || q.t.en; const sel = st.sel[k];
        const isRight = st.checked && (q.type === 'tf' ? sel === q.answer : sel === q.answer);
        let opts;
        if (q.type === 'tf') {
          opts = `<div class="opts tf">${[true, false].map(v => {
            let c = 'opt'; if (sel === v) c += ' sel';
            if (st.checked) { if (v === q.answer) c += ' right'; else if (sel === v) c += ' wrongsel'; }
            return `<button type="button" class="${c}" data-k="${k}" data-v="${v}"><span class="l">${v ? 'O' : 'X'}</span>${esc(U(v ? 'true' : 'false'))}</button>`; }).join('')}</div>`;
        } else {
          opts = `<div class="opts">${tx.o.map((o, oi) => {
            let c = 'opt'; if (sel === oi) c += ' sel';
            if (st.checked) { if (oi === q.answer) c += ' right'; else if (sel === oi) c += ' wrongsel'; }
            return `<button type="button" class="${c}" data-k="${k}" data-v="${oi}"><span class="l">${letters[oi]}</span><span>${esc(o)}</span></button>`; }).join('')}</div>`;
        }
        const ansText = q.type === 'tf' ? U(q.answer ? 'true' : 'false') : `${letters[q.answer]}. ${tx.o[q.answer]}`;
        const fb = st.checked ? `<div class="fb ${isRight ? 'ok' : 'no'}"><b>${esc(isRight ? U('correct') : U('wrong'))}</b>${isRight ? '' : `${esc(U('answerIs'))}: <b>${esc(ansText)}</b><br>`}${esc(tx.e)}</div>` : '';
        const from = showFrom ? `<div class="from">— ${esc(t(E[it.id].name))}</div>` : '';
        return `<div class="q ${st.checked ? 'locked' : ''}" id="q${k}"><div class="qt"><span class="n">${k + 1}</span><span>${esc(tx.q)}</span><span class="tag">${q.type === 'tf' ? 'O / X' : 'A–D'}</span></div>${from}${opts}${fb}</div>`;
      }).join('') + scoreHtml() + `<div class="actions">${st.checked ? `<button class="btn c" id="retry">↻ ${esc(U('retry'))}</button><button class="btn ghost" id="prt">🖨 ${esc(U('print'))}</button>` : `<button class="btn c" id="chk">✔ ${esc(U('check'))}</button>`}${warn ? `<span class="warn">${esc(U('unanswered'))}</span>` : ''}</div>`;
      box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (st.checked) return; const k = +b.dataset.k; const v = b.dataset.v;
        st.sel[k] = v === 'true' ? true : v === 'false' ? false : +v; draw();
      });
      const chk = $('#chk', box); if (chk) chk.onclick = () => {
        const miss = st.sel.findIndex(x => x === null);
        if (miss > -1) { draw(true); const el = $('#q' + miss, box); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        st.checked = true; const [got, total] = tally(); onScore && onScore(got, total); draw();
        const sb = $('.scorebox', box); if (sb) sb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      const rt = $('#retry', box); if (rt) rt.onclick = () => { st.sel = st.sel.map(() => null); st.checked = false; draw(); box.scrollIntoView({ behavior: 'smooth' }); };
      const pr = $('#prt', box); if (pr) pr.onclick = () => window.print();
    };
    const tally = () => { let got = 0; items.forEach((it, k) => { if (st.sel[k] === E[it.id].quiz[it.qi].answer) got++; }); return [got, items.length]; };
    const scoreHtml = () => {
      if (!st.checked) return '';
      const [got, total] = tally(); const pct = Math.round(got / total * 100);
      const msg = pct >= 90 ? U('great') : pct >= 60 ? U('good') : U('keep');
      return `<div class="scorebox"><div class="ring" style="--p:${pct}"><b>${pct}</b></div><div class="msg"><b>${esc(U('score'))}: ${got} / ${total}</b>${esc(msg)}</div></div>`;
    };
    draw();
  }

  // ---------- chapter test ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function renderTest(main) {
    const pool = []; part.ids.filter(available).forEach(id => E[id].quiz.forEach((q, qi) => pool.push({ id, qi })));
    const best = tests()[part.n];
    if (!testState) {
      main.innerHTML = `<section class="card"><div class="qhead"><h3>🏁 ${esc(U('chapterTest'))}</h3>${best != null ? `<span class="best">🏆 ${esc(U('best'))}: ${best}%</span>` : ''}</div>
        <p>${esc(U('testIntro'))}</p><div><b>${esc(U('numQ'))}</b></div>
        <div class="setup" id="setup">${[10, 20, 30].filter(n => n < pool.length).map(n => `<button aria-pressed="${n === 10}" data-n="${n}">${n}</button>`).join('')}<button aria-pressed="false" data-n="${pool.length}">${esc(U('all'))} (${pool.length})</button></div>
        <div class="actions"><button class="btn c" id="go">▶ ${esc(U('start'))}</button></div></section>`;
      let n = Math.min(10, pool.length);
      main.querySelectorAll('#setup button').forEach(b => b.onclick = () => { n = +b.dataset.n; main.querySelectorAll('#setup button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
      $('#go').onclick = () => { const items = shuffle(pool).slice(0, n); testState = { items, st: { sel: Array(items.length).fill(null), checked: false } }; renderTest(main); };
      return;
    }
    main.innerHTML = `<section class="card"><div class="qhead"><h3>🏁 ${esc(U('chapterTest'))} — ${esc(t(part.title))}</h3><button class="btn ghost" id="newt">${esc(U('newRound'))}</button></div><div id="qs"></div></section>`;
    $('#newt').onclick = () => { testState = null; renderTest(main); };
    quizBlock($('#qs'), testState.items, testState.st, (got, total) => saveTest(part.n, Math.round(got / total * 100)), true);
  }

  // ---------- matching ----------
  function renderMatch(main) {
    const ids = part.ids.filter(available);
    if (!matchState) { const pick = shuffle(ids).slice(0, Math.min(6, ids.length)); matchState = { left: pick, right: shuffle(pick), done: [], sel: null, tries: 0 }; }
    const m = matchState;
    const win = m.done.length === m.left.length;
    main.innerHTML = `<section class="card"><div class="qhead"><h3>🧩 ${esc(U('match'))}</h3><span class="best">${esc(U('moves'))}: ${m.tries} · ${esc(U('done'))}: ${m.done.length}/${m.left.length}</span></div>
      <p>${esc(U('matchHelp'))}</p>
      ${win ? `<div class="scorebox"><div class="ring" style="--p:${Math.round(m.left.length / m.tries * 100)}"><b>🎉</b></div><div class="msg"><b>${esc(U('allMatched'))}</b>${esc(U('moves'))}: ${m.tries}</div></div>` : ''}
      <div class="mgrid"><div class="mcol">${m.left.map(id => `<button class="mi ${m.done.includes(id) ? 'done' : ''} ${m.sel === id ? 'sel' : ''}" data-l="${id}"><b>${esc(t(E[id].name))}</b></button>`).join('')}</div>
      <div class="mcol">${m.right.map(id => `<button class="mi ${m.done.includes(id) ? 'done' : ''}" data-r="${id}">“${esc(t(E[id].title))}”</button>`).join('')}</div></div>
      <div class="actions"><button class="btn c" id="newm">↻ ${esc(U('newRound'))}</button></div></section>`;
    main.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { if (m.done.includes(b.dataset.l)) return; m.sel = b.dataset.l; renderMatch(main); });
    main.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      const r = b.dataset.r; if (!m.sel || m.done.includes(r)) return; m.tries++;
      if (r === m.sel) { m.done.push(r); m.sel = null; renderMatch(main); }
      else { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); $('.best', main).textContent = `${U('moves')}: ${m.tries} · ${U('done')}: ${m.done.length}/${m.left.length}`; }
    });
    $('#newm').onclick = () => { matchState = null; renderMatch(main); };
  }

  // ---------- flashcards ----------
  function renderCards(main) {
    if (!cardState) {
      const deck = [];
      part.ids.filter(available).forEach(id => { deck.push({ kind: 'who', id }); E[id].terms.forEach((x, i) => deck.push({ kind: 'term', id, i })); });
      cardState = { deck, i: 0, flip: false };
    }
    const c = cardState; const it = c.deck[c.i]; const e = E[it.id];
    const front = it.kind === 'who' ? `<b>${esc(t(e.name))}</b><small>${esc(e.years)} · ${esc(t(e.approach))}</small>` : `<b>${esc(t(e.terms[it.i].term))}</b><small>${esc(t(e.name))}</small>`;
    const back = it.kind === 'who' ? `<b style="font-size:22px">“${esc(t(e.title))}”</b><small>${esc((e.keyPoints[lang] || e.keyPoints.en)[0])}</small>` : `<p>${esc(t(e.terms[it.i].def))}</p>`;
    main.innerHTML = `<section class="card"><div class="qhead"><h3>🃏 ${esc(U('cards'))}</h3><span class="best">${c.i + 1} / ${c.deck.length}</span></div>
      <div class="fc ${c.flip ? 'flip' : ''}" id="fc" tabindex="0" role="button" aria-label="${esc(U('flip'))}"><div class="in"><div class="face">${front}</div><div class="face back">${back}</div></div></div>
      <p style="text-align:center;color:var(--muted);font-size:13px">${esc(U('flip'))}</p>
      <div class="fcbar"><button class="btn ghost" id="pv">← ${esc(U('prev'))}</button><button class="btn ghost" id="sh">🔀 ${esc(U('shuffle'))}</button><button class="btn c" id="nx">${esc(U('next'))} →</button></div></section>`;
    const fc = $('#fc');
    const flip = () => { c.flip = !c.flip; fc.classList.toggle('flip', c.flip); };
    fc.onclick = flip; fc.onkeydown = ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); flip(); } };
    $('#pv').onclick = () => { c.i = (c.i - 1 + c.deck.length) % c.deck.length; c.flip = false; renderCards(main); };
    $('#nx').onclick = () => { c.i = (c.i + 1) % c.deck.length; c.flip = false; renderCards(main); };
    $('#sh').onclick = () => { c.deck = shuffle(c.deck); c.i = 0; c.flip = false; renderCards(main); };
  }

  // ---------- boot ----------
  const isChapter = document.body.dataset.page === 'chapter';
  function render() { document.documentElement.lang = lang; if (isChapter) renderChapter(); else renderHome(); }
  window.addEventListener('hashchange', () => { if (isChapter) { renderChapter(); window.scrollTo({ top: $('.layout').offsetTop - 70, behavior: 'smooth' }); } });
  render();
})();
