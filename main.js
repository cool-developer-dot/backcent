/* Backcent · landing page interactions
   Vanilla JS, no dependencies. Every animation is transform/opacity based and
   only runs while its section is on screen. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches;

  /* ---------- Split headings into words for the reveal ---------- */
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'w';
            outer.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--wi', i++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- Reveal on scroll ---------- */
  const onReveal = new Map();
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      const cb = onReveal.get(el);
      if (cb) cb(el);
      revealIO.unobserve(el);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });

  $$('[data-stagger]').forEach((group) => {
    $$(':scope > [data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${i * 90}ms`));
  });
  // The hero plays its entrance on load, whatever the viewport height.
  $$('.hero [data-reveal]').forEach((el) => el.classList.add('is-in'));
  $$('[data-reveal]:not(.is-in), [data-split]').forEach((el) => revealIO.observe(el));

  /* ---------- Pause looping illustrations when off screen ---------- */
  const liveIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting));
  }, { rootMargin: '80px 0px' });
  $$('[data-live]').forEach((el) => liveIO.observe(el));

  /* ---------- Count-up numbers ---------- */
  function runCounters(scope) {
    $$('[data-to]', scope).forEach((el, i) => {
      const to = parseFloat(el.dataset.to);
      const dec = parseInt(el.dataset.dec || '0', 10);
      if (reduce) { el.textContent = to.toFixed(dec); return; }
      const dur = 1500 + i * 140;
      const t0 = performance.now() + i * 90;
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  $$('[data-counters]').forEach((el) => {
    if (!reduce) $$('[data-to]', el).forEach((n) => { n.textContent = (0).toFixed(parseInt(n.dataset.dec || '0', 10)); });
    onReveal.set(el, runCounters);
    revealIO.observe(el);
  });

  /* ---------- Nav: mobile menu ---------- */
  const nav = $('[data-nav]');
  const toggle = $('[data-menu-toggle]');
  const menu = $('#menu');
  function setMenu(open) {
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.toggleAttribute('inert', !open);
  }
  toggle.addEventListener('click', () => setMenu(!root.classList.contains('nav-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Nav: active section ---------- */
  const navLinks = $$('[data-navlink]');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const hash = `#${e.target.id}`;
      if (e.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === hash));
      } else {
        navLinks.forEach((a) => { if (a.getAttribute('href') === hash) a.classList.remove('is-active'); });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => sectionIO.observe(s));

  /* ---------- Timeline progress (scroll-linked) ---------- */
  const tl = $('[data-timeline]');
  const tlFill = tl && $('.tl__fill', tl);
  const tlNodes = tl ? $$('.tl__node', tl) : [];
  const verticalMQ = window.matchMedia('(max-width: 899px)');
  let tlActive = false;
  let tlStart = 0;
  let tlLen = 1;

  function measureTimeline() {
    if (!tl) return;
    const r = tl.getBoundingClientRect();
    const a = tlNodes[0].getBoundingClientRect();
    const b = tlNodes[tlNodes.length - 1].getBoundingClientRect();
    if (verticalMQ.matches) {
      tlStart = a.top + a.height / 2 - r.top;
      tlLen = (b.top + b.height / 2) - (a.top + a.height / 2);
      tl.style.setProperty('--tl-x', `${a.left + a.width / 2 - r.left - 1}px`);
    } else {
      tlStart = a.left + a.width / 2 - r.left;
      tlLen = (b.left + b.width / 2) - (a.left + a.width / 2);
      tl.style.setProperty('--tl-y', `${a.top + a.height / 2 - r.top - 1}px`);
    }
    tl.style.setProperty('--tl-start', `${tlStart}px`);
    tl.style.setProperty('--tl-len', `${Math.max(1, tlLen)}px`);
    updateTimeline();
  }

  function updateTimeline() {
    if (!tl) return;
    const r = tl.getBoundingClientRect();
    const vh = window.innerHeight;
    const vertical = verticalMQ.matches;
    let p = vertical
      ? (vh * 0.62 - (r.top + tlStart)) / tlLen
      : (vh * 0.82 - r.top) / (vh * 0.42);
    p = reduce ? 1 : clamp(p, 0, 1);
    tlFill.style.transform = vertical ? `scaleY(${p})` : `scaleX(${p})`;
    const n = tlNodes.length - 1;
    tlNodes.forEach((node, i) => node.parentElement.classList.toggle('is-active', p >= i / n - 0.015));
  }

  if (tl) {
    new IntersectionObserver(([e]) => { tlActive = e.isIntersecting; if (tlActive) updateTimeline(); }, { rootMargin: '120px 0px' }).observe(tl);
  }

  /* ---------- Scroll: progress bar, nav state, mobile dock ---------- */
  const bar = $('[data-progress]');
  const hero = $('#top');
  const scanSec = $('#scan');
  const dock = $('[data-dock]');
  const dockMQ = window.matchMedia('(max-width: 767px)');
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    nav.classList.toggle('is-scrolled', y > 8);
    if (dock && dockMQ.matches) {
      const heroOut = hero.getBoundingClientRect().bottom < 60;
      const beforeForm = scanSec.getBoundingClientRect().top > window.innerHeight * 0.85;
      dock.classList.toggle('is-on', heroOut && beforeForm);
    }
    if (tlActive) updateTimeline();
  }
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
  window.addEventListener('scroll', requestFrame, { passive: true });

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { measureTimeline(); requestFrame(); });
  }, { passive: true });

  /* ---------- Pointer spotlight on cards (desktop only) ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0;
    let last = null;
    document.addEventListener('pointermove', (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = last.target instanceof Element ? last.target.closest('[data-spot]') : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${last.clientX - r.left}px`);
        el.style.setProperty('--my', `${last.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  /* ---------- Leakage calculator ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const range = $('[data-c-range]', calc);
    const out = (key) => $(`[data-c="${key}"]`, calc);
    const MIN = 50;
    const MAX = 2000;
    const trim = (n, dp) => n.toFixed(dp).replace(/\.?0+$/, '');
    const spendAt = (v) => {
      const m = MIN * Math.pow(MAX / MIN, v / 1000);
      if (m < 100) return Math.round(m / 5) * 5;
      if (m < 1000) return Math.round(m / 10) * 10;
      return Math.round(m / 50) * 50;
    };
    const fmtSpend = (m) => (m >= 1000 ? `$${trim(m / 1000, 2)}B` : `$${m}M`);
    const fmtCash = (d) => (d >= 995e3 ? `$${trim(d / 1e6, d >= 1e7 ? 1 : 2)}M` : `$${Math.round(d / 1e3)}k`);

    const render = () => {
      const v = Number(range.value);
      const m = spendAt(v);
      const d = m * 1e6;
      range.style.setProperty('--p', `${v / 10}%`);
      out('spend').textContent = fmtSpend(m) + (v >= 1000 ? '+' : '');
      out('low').textContent = fmtCash(d * 0.001);
      out('high').textContent = fmtCash(d * 0.003);
      out('keepLow').textContent = fmtCash(d * 0.001 * 0.8);
      out('keepHigh').textContent = fmtCash(d * 0.003 * 0.8);
      range.setAttribute('aria-valuetext', `${fmtSpend(m)} annual supplier spend`);
    };
    range.addEventListener('input', render);
    render();
  }

  /* ---------- FAQ accordion ---------- */
  $$('.qa__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.qa');
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Scan request form ---------- */
  const form = $('[data-form]');
  if (form) {
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const validate = (field) => {
      const input = $('input, select', field);
      if (!input || !input.required) return true;
      const v = input.value.trim();
      const ok = input.type === 'email' ? emailOk(v) : v.length > 0;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    $$('.field', form).forEach((field) => {
      const input = $('input, select', field);
      if (!input) return;
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'blur', () => { if (input.value) validate(field); });
      input.addEventListener('input', () => { if (field.classList.contains('is-invalid')) validate(field); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = $$('.field', form);
      const results = fields.map(validate);
      if (results.includes(false)) {
        const first = fields[results.indexOf(false)];
        $('input, select', first).focus();
        return;
      }
      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      btn.disabled = true;
      // Set data-endpoint on the form (Formspree, HubSpot, your API…) to post for real.
      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          await new Promise((r) => setTimeout(r, 900));
        }
        const name = (form.elements.name.value || '').trim().split(/\s+/)[0];
        $('[data-form-name]', form).textContent = name ? `, ${name}` : '';
        $('.form__body', form).hidden = true;
        $('.form__done', form).hidden = false;
      } catch (err) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        $('.btn__label', btn).textContent = 'Something went wrong. Try again';
      }
    });
  }

  /* ---------- Footer year ---------- */
  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ==========================================================================
     Hero engine: ledger vs. statement reconciliation, three illustrative cases
     ========================================================================== */
  const engine = $('[data-engine]');
  if (engine) initEngine(engine);

  function initEngine(box) {
    const SCENARIOS = [
      {
        supplier: 'Riverside Office Supply',
        left: { title: 'Your ledger', sub: 'Paid invoices', icon: 'doc', rows: [
          ['A4 copy paper', '$52.00', 'INV-10471 · Apr 01'],
          ['Desk chairs', '$420.00', 'INV-10478 · Apr 03'],
          ['Monitor stands', '$240.00', 'INV-10493 · Apr 12'],
          ['Monitor stands', '$240.00', 'INV-1O493 · Apr 15'],
        ] },
        right: { title: 'Supplier statement', sub: 'Statement · Apr 30', icon: 'building', rows: [
          ['A4 copy paper', '$52.00', 'INV-10471'],
          ['Desk chairs', '$420.00', 'INV-10478'],
          ['Monitor stands', '$240.00', 'INV-10493'],
          ['Unapplied cash', '$240.00 CR', 'Received Apr 15'],
        ] },
        flag: [3, 3],
        finding: {
          title: 'Duplicate payment', tag: 'Duplicate', icon: 'copy', amount: 240,
          desc: 'INV-10493 was keyed twice, once with a letter O. The supplier is holding the second payment as unapplied cash.',
        },
      },
      {
        supplier: 'Northline Industrial',
        left: { title: 'Your ledger', sub: 'Paid invoices', icon: 'doc', rows: [
          ['Steel brackets', '$3,450.00', 'INV-88120 · Mar 04'],
          ['Fasteners', '$1,180.00', 'INV-88134 · Mar 11'],
          ['Freight', '$640.00', 'INV-88152 · Mar 18'],
          ['No credit applied', '—', 'Ledger · Mar 31'],
        ] },
        right: { title: 'Supplier statement', sub: 'Statement · Mar 31', icon: 'building', rows: [
          ['Steel brackets', '$3,450.00', 'INV-88120'],
          ['Fasteners', '$1,180.00', 'INV-88134'],
          ['Freight', '$640.00', 'INV-88152'],
          ['Credit note', '−$1,860.00', 'CN-32817 · Mar 21'],
        ] },
        flag: [3, 3],
        finding: {
          title: 'Unused vendor credit', tag: 'Credit', icon: 'receipt', amount: 1860,
          desc: 'Credit note CN-32817 for a short shipment was issued on Mar 21 and never applied to a payment.',
        },
      },
      {
        supplier: 'Harbor Packaging Co.',
        left: { title: 'Contract', sub: 'Agreed price list', icon: 'doc', rows: [
          ['Stretch film', '$18.40', 'Per roll'],
          ['Corrugated box 24in', '$0.52', 'Per unit · Contract HP-24'],
          ['Pallet labels', '$0.09', 'Per unit'],
          ['Packing tape', '$2.10', 'Per roll'],
        ] },
        right: { title: 'Invoiced price', sub: 'Last 12 months', icon: 'receipt', rows: [
          ['Stretch film', '$18.40', '12 invoices'],
          ['Corrugated box 24in', '$0.57', '48,000 units'],
          ['Pallet labels', '$0.09', '12 invoices'],
          ['Packing tape', '$2.10', '12 invoices'],
        ] },
        flag: [1, 1],
        finding: {
          title: 'Price above contract', tag: 'Pricing', icon: 'alert', amount: 2400,
          desc: 'Billed $0.57 per box against an agreed $0.52, across 48,000 boxes in 12 months.',
        },
      },
    ];
    const DURATION = 8200;

    const q = (attr) => $(`[${attr}]`, box);
    const el = {
      status: q('data-e-status'), supplier: q('data-e-supplier'), panes: q('data-e-panes'),
      lPane: q('data-e-lpane'), rPane: q('data-e-rpane'),
      lTitle: q('data-e-ltitle'), lSub: q('data-e-lsub'), lIcon: q('data-e-licon'), lRows: q('data-e-lrows'),
      rTitle: q('data-e-rtitle'), rSub: q('data-e-rsub'), rIcon: q('data-e-ricon'), rRows: q('data-e-rrows'),
      wires: q('data-e-wires'), finding: q('data-e-finding'),
      fTitle: q('data-e-ftitle'), fTag: q('data-e-ftag'), fDesc: q('data-e-fdesc'), fIcon: q('data-e-ficon'), fAmt: q('data-e-famt'),
      tabs: $$('[data-e-tab]', box),
    };
    const paths = $$('path', el.wires);
    const nodes = $$('circle', el.wires);

    let idx = 0;
    let timers = [];
    let running = false;
    let visible = false;
    let countRaf = 0;

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(countRaf); };
    const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rowsHTML = (rows) => rows.map(([d, a, m], i) => (
      `<li class="row" style="--r:${i}"><span class="row__desc">${esc(d)}</span><span class="row__amt">${esc(a)}</span><span class="row__meta">${esc(m)}</span><span class="row__mark" aria-hidden="true"></span></li>`
    )).join('');

    function render(s) {
      el.supplier.textContent = s.supplier;
      el.lTitle.textContent = s.left.title;
      el.lSub.textContent = s.left.sub;
      el.lIcon.setAttribute('href', `#i-${s.left.icon}`);
      el.rTitle.textContent = s.right.title;
      el.rSub.textContent = s.right.sub;
      el.rIcon.setAttribute('href', `#i-${s.right.icon}`);
      el.lRows.innerHTML = rowsHTML(s.left.rows);
      el.rRows.innerHTML = rowsHTML(s.right.rows);
      el.fTitle.textContent = s.finding.title;
      el.fTag.textContent = s.finding.tag;
      el.fDesc.textContent = s.finding.desc;
      el.fIcon.setAttribute('href', `#i-${s.finding.icon}`);
      el.fAmt.textContent = money(0);
      el.tabs.forEach((t, i) => {
        const on = i === idx;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('is-done', i < idx);
        t.classList.remove('is-running', 'is-static');
      });
    }

    function markRow(row, flagged) { if (row) row.classList.add(flagged ? 'is-flag' : 'is-ok'); }

    function measureBeam() {
      const p = el.panes.getBoundingClientRect();
      const r = el.lRows.getBoundingClientRect();
      el.panes.style.setProperty('--beam-top', `${r.top - p.top}px`);
      el.panes.style.setProperty('--beam-dist', `${r.height}px`);
    }

    function layoutWires() {
      const s = SCENARIOS[idx];
      const b = box.getBoundingClientRect();
      const ox = b.left + box.clientLeft;
      const oy = b.top + box.clientTop;
      const lr = el.lRows.children[s.flag[0]].getBoundingClientRect();
      const rr = el.rRows.children[s.flag[1]].getBoundingClientRect();
      const lp = el.lPane.getBoundingClientRect();
      const rp = el.rPane.getBoundingClientRect();
      const pp = el.panes.getBoundingClientRect();
      const xL = lr.right - ox;
      const yL = lr.top + lr.height / 2 - oy;
      const xR = rr.left - ox;
      const yR = rr.top + rr.height / 2 - oy;
      const xc = (lp.right + rp.left) / 2 - ox;
      const yJ = pp.bottom - oy + 16;
      const yF = el.finding.offsetTop;
      const rad = Math.max(2, Math.min(10, xc - xL - 2));
      paths[0].setAttribute('d', `M${xL} ${yL}H${xc - rad}Q${xc} ${yL} ${xc} ${yL + rad}V${yJ}`);
      paths[1].setAttribute('d', `M${xR} ${yR}H${xc + rad}Q${xc} ${yR} ${xc} ${yR + rad}V${yJ}`);
      paths[2].setAttribute('d', `M${xc} ${yJ}V${yF}`);
      [[xL, yL], [xR, yR], [xc, yJ], [xc, yF]].forEach(([x, y], i) => {
        nodes[i].setAttribute('cx', x);
        nodes[i].setAttribute('cy', y);
      });
    }

    function countTo(target) {
      const t0 = performance.now();
      const dur = 1000;
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        el.fAmt.textContent = money(Math.round(target * (1 - Math.pow(1 - p, 3)) * 100) / 100);
        if (p < 1) countRaf = requestAnimationFrame(tick);
      };
      countRaf = requestAnimationFrame(tick);
    }

    function finalState() {
      const s = SCENARIOS[idx];
      box.classList.remove('is-leaving', 'is-scanning');
      box.classList.add('is-shown', 'is-scanned', 'is-found');
      [el.lRows, el.rRows].forEach((list, side) => {
        Array.from(list.children).forEach((row, k) => markRow(row, s.flag[side] === k));
      });
      el.status.textContent = '1 finding';
      layoutWires();
      box.classList.add('is-wired');
      el.fAmt.textContent = money(s.finding.amount);
      el.tabs[idx].classList.add('is-static');
    }

    function play(i, animate = true) {
      clearTimers();
      const wasShown = box.classList.contains('is-shown');
      if (wasShown && animate) box.classList.add('is-leaving');

      const start = () => {
        idx = i;
        const s = SCENARIOS[i];
        box.classList.remove('is-leaving', 'is-shown', 'is-scanning', 'is-scanned', 'is-wired', 'is-found');
        render(s);
        if (!animate) { finalState(); return; }

        void box.offsetWidth;
        box.classList.add('is-shown');
        el.status.textContent = 'Scanning';
        const tab = el.tabs[i];
        tab.style.setProperty('--dur', `${DURATION}ms`);
        void tab.offsetWidth;
        tab.classList.add('is-running');

        later(() => { measureBeam(); box.classList.add('is-scanning'); }, 450);
        for (let k = 0; k < 4; k += 1) {
          later(() => {
            markRow(el.lRows.children[k], s.flag[0] === k);
            markRow(el.rRows.children[k], s.flag[1] === k);
          }, 700 + k * 380);
        }
        later(() => {
          box.classList.add('is-scanned');
          el.status.textContent = '1 finding';
          layoutWires();
          box.classList.add('is-wired');
        }, 2300);
        later(() => { box.classList.add('is-found'); countTo(s.finding.amount); }, 2850);
        later(() => { if (running) play((idx + 1) % SCENARIOS.length); }, DURATION);
      };

      if (wasShown && animate) later(start, 280);
      else start();
    }

    function sync() {
      const should = visible && !document.hidden && !reduce;
      if (should && !running) {
        running = true;
        play(idx);
      } else if (!should && running) {
        running = false;
        clearTimers();
        el.tabs.forEach((t) => t.classList.remove('is-running'));
        finalState();
      }
    }

    el.tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        if (reduce) { play(i, false); return; }
        running = true;
        play(i);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + el.tabs.length) % el.tabs.length;
        el.tabs[next].focus();
        el.tabs[next].click();
      });
    });

    let wireRaf = 0;
    window.addEventListener('resize', () => {
      if (!box.classList.contains('is-wired')) return;
      cancelAnimationFrame(wireRaf);
      wireRaf = requestAnimationFrame(layoutWires);
    }, { passive: true });

    render(SCENARIOS[0]);
    if (reduce) play(0, false);

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(box);
    document.addEventListener('visibilitychange', sync);
    reduceMQ.addEventListener('change', (e) => { reduce = e.matches; if (reduce) { running = false; clearTimers(); play(idx, false); } else { sync(); } });
  }

  /* ---------- Initial measurements once fonts are in ---------- */
  const settle = () => { measureTimeline(); onScrollFrame(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  settle();
})();
