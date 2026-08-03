/* ============================================================
   Client behaviour: theme, search, command palette, copy buttons.
   Without JS the site stays fully readable and navigable.
   ============================================================ */

type Hit = {
  title: string;
  url: string;
  tags: string[];
  categories: string[];
  date: string;
  age: string;
  fresh: boolean;
  text: string;
};

/* ---------- Theme ---------- */
const root = document.documentElement;
const themeBtn = document.getElementById('theme-btn');

function currentTheme(): 'paper' | 'terminal' {
  return root.getAttribute('data-theme') === 'terminal' ? 'terminal' : 'paper';
}
function paintThemeBtn() {
  if (themeBtn) themeBtn.textContent = currentTheme() === 'terminal' ? 'Papier' : 'Terminal';
}
function toggleTheme() {
  const next = currentTheme() === 'terminal' ? 'paper' : 'terminal';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* Private mode — the choice then only applies to this page */
  }
  paintThemeBtn();
}
themeBtn?.addEventListener('click', toggleTheme);
paintThemeBtn();

/* ---------- Search index (fetched once, then kept in memory) ---------- */
let INDEX: Hit[] | null = null;
let indexPromise: Promise<Hit[]> | null = null;

function loadIndex(): Promise<Hit[]> {
  if (INDEX) return Promise.resolve(INDEX);
  if (!indexPromise) {
    indexPromise = fetch('/search.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Hit[]) => {
        INDEX = d;
        return d;
      })
      .catch(() => {
        INDEX = [];
        return INDEX;
      });
  }
  return indexPromise;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function hl(text: string, q: string) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

/** Token-wise AND search: "entra jamf" only matches posts containing both. */
function search(list: Hit[], q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((h) => {
    const hay = (h.title + ' ' + h.tags.join(' ') + ' ' + h.categories.join(' ') + ' ' + h.text).toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

function hitHTML(h: Hit, q: string) {
  const meta = [h.tags.slice(0, 4).join(' · '), h.date].filter(Boolean);
  return (
    `<a class="hit" href="${h.url}"><div class="t">${hl(h.title, q)}</div><div class="m">` +
    meta.map((m) => `<span>${esc(m)}</span>`).join('') +
    `<span class="age${h.fresh ? ' ok' : ''}">${esc(h.age)}</span></div></a>`
  );
}

/* ---------- Homepage search ---------- */
const q = document.getElementById('q') as HTMLInputElement | null;
const results = document.getElementById('results');
const resHead = document.getElementById('res-head');
const serverList = results?.innerHTML ?? '';

if (q && results && resHead) {
  const defaultHead = resHead.textContent ?? '';

  const render = () => {
    const v = q.value.trim();
    if (!v) {
      resHead.textContent = defaultHead;
      results.innerHTML = serverList;
      return;
    }
    loadIndex().then((list) => {
      if (q.value.trim() !== v) return; // user kept typing
      const found = search(list, v);
      resHead.textContent = `${found.length} ${found.length === 1 ? 'result' : 'results'} for \u201c${v}\u201d`;
      results.innerHTML = found.length
        ? found.map((h) => hitHTML(h, v)).join('')
        : `<div class="empty">Nothing found for <b>${esc(v)}</b>.<br>` +
          `Drop me a line — if I have hit the same problem, it may turn into a post.</div>`;
    });
  };

  q.addEventListener('input', render);
  q.addEventListener('focus', () => void loadIndex(), { once: true });

  document.querySelectorAll<HTMLElement>('.chip').forEach((c) => {
    c.addEventListener('click', () => {
      q.value = c.dataset.q ?? '';
      render();
      q.focus();
    });
  });
}

/* ---------- Command palette ---------- */
const scrim = document.getElementById('scrim');
const pal = document.getElementById('palette');
const pq = document.getElementById('pq') as HTMLInputElement | null;
const plist = document.getElementById('plist');

type Cmd = { ic: string; t: string; sub: string; run: () => void };
const CMDS: Cmd[] = [
  { ic: '→', t: 'Go to home', sub: 'g h', run: () => (location.href = '/') },
  { ic: '#', t: 'All topics', sub: 'g t', run: () => (location.href = '/tags/') },
  { ic: '◷', t: 'Archive by year', sub: 'g a', run: () => (location.href = '/archives/') },
  { ic: '☺', t: 'About me', sub: '', run: () => (location.href = '/about/') },
  { ic: '◐', t: 'Switch theme', sub: 't', run: toggleTheme },
  { ic: '⌁', t: 'Open RSS feed', sub: '', run: () => (location.href = '/feed.xml') },
  { ic: '✉', t: 'Report a correction', sub: '', run: () => (location.href = 'mailto:website@schuele.xyz?subject=Correction') },
];

let sel = 0;
let flat: Array<{ run: () => void }> = [];

function pRender() {
  if (!pq || !plist) return;
  const v = pq.value.trim();
  flat = [];
  let html = '';

  const posts = INDEX ? search(INDEX, v) : [];
  // Commands: every term must appear in the command label
  const terms = v.toLowerCase().split(/\s+/).filter(Boolean);
  const cmds = CMDS.filter((c) => terms.every((t) => c.t.toLowerCase().includes(t)));

  // Empty query lists commands first; otherwise posts come first.
  const blocks: Array<[string, string]> = [];

  if (posts.length) {
    let s = '<div class="pgroup">Posts</div>';
    for (const p of posts.slice(0, 8)) {
      flat.push({ run: () => (location.href = p.url) });
      s +=
        `<div class="pitem" role="option" data-i="${flat.length - 1}"><span class="ic">¶</span>` +
        `<span>${hl(p.title, v)}</span><span class="sub">${esc(p.date)}</span></div>`;
    }
    blocks.push([v ? 'a' : 'b', s]);
  }
  if (cmds.length) {
    let s = '<div class="pgroup">Commands</div>';
    for (const c of cmds) {
      flat.push({ run: c.run });
      s +=
        `<div class="pitem" role="option" data-i="${flat.length - 1}"><span class="ic">${c.ic}</span>` +
        `<span>${hl(c.t, v)}</span><span class="sub">${esc(c.sub)}</span></div>`;
    }
    blocks.push([v ? 'b' : 'a', s]);
  }

  html = blocks.sort((x, y) => x[0].localeCompare(y[0])).map((b) => b[1]).join('');
  if (!flat.length) html = '<div class="empty" style="padding:1.3rem 1.15rem">No matches.</div>';

  plist.innerHTML = html;
  if (sel >= flat.length) sel = 0;
  paint();

  plist.querySelectorAll<HTMLElement>('.pitem').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      sel = Number(el.dataset.i);
      paint();
    });
    el.addEventListener('click', go);
  });
}

function paint() {
  plist?.querySelectorAll<HTMLElement>('.pitem').forEach((el) => {
    const on = Number(el.dataset.i) === sel;
    el.classList.toggle('sel', on);
    el.setAttribute('aria-selected', String(on));
    if (on) el.scrollIntoView({ block: 'nearest' });
  });
}

function go() {
  const it = flat[sel];
  closePal();
  it?.run();
}

let lastFocus: HTMLElement | null = null;
function openPal() {
  if (!pal || !scrim || !pq) return;
  lastFocus = document.activeElement as HTMLElement;
  scrim.classList.add('on');
  pal.classList.add('on');
  pq.value = '';
  sel = 0;
  pRender();
  pq.focus();
  loadIndex().then(() => pRender());
}
function closePal() {
  scrim?.classList.remove('on');
  pal?.classList.remove('on');
  lastFocus?.focus();
}

scrim?.addEventListener('click', closePal);
pq?.addEventListener('input', () => {
  sel = 0;
  pRender();
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  if ((e.metaKey || e.ctrlKey) && k === 'k') {
    e.preventDefault();
    pal?.classList.contains('on') ? closePal() : openPal();
    return;
  }

  if (pal?.classList.contains('on')) {
    if (k === 'escape') { e.preventDefault(); closePal(); }
    else if (k === 'arrowdown') { e.preventDefault(); sel = Math.min(sel + 1, flat.length - 1); paint(); }
    else if (k === 'arrowup') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
    else if (k === 'enter') { e.preventDefault(); go(); }
    return;
  }

  const el = document.activeElement;
  const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

  if (k === '/') {
    e.preventDefault();
    if (q) q.focus();
    else openPal();
  } else if (k === 't') {
    toggleTheme();
  }
});

/* ---------- Copy button on every code block ---------- */
document.querySelectorAll<HTMLPreElement>('.body pre').forEach((pre) => {
  const wrap = document.createElement('div');
  wrap.className = 'codewrap';
  pre.parentNode?.insertBefore(wrap, pre);
  wrap.appendChild(pre);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText);
    } catch {
      /* Clipboard denied — still give feedback */
    }
    btn.textContent = 'Copied';
    btn.classList.add('ok');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('ok');
    }, 1400);
  });
  wrap.appendChild(btn);
});
