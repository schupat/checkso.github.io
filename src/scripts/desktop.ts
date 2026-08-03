/* ============================================================
   /desktop/ — window manager, file manager and a shell that
   actually runs against the posts on this site.
   ============================================================ */

type FsFile = {
  name: string; dir: string; title: string; url: string;
  date: string; iso: string; year: string;
  tags: string[]; categories: string[];
  age: string; fresh: boolean; stale: boolean;
  size: number; lines: number; body: string;
};

const HOME = '/home/patrick';
const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

let FILES: FsFile[] = [];
let cwd = HOME;

/* ============================================================
   Window manager
   ============================================================ */

let zTop = 10;
const wins = new Map<string, HTMLElement>();

function focusWin(id: string) {
  const w = wins.get(id);
  if (!w) return;
  w.classList.remove('min');
  w.style.zIndex = String(++zTop);
  wins.forEach((el) => el.classList.toggle('focus', el === w));
  paintDock();
}

function makeWindow(opts: {
  id: string; title: string; sub?: string;
  x: number; y: number; w: number; h: number;
  body: string; cls?: string;
}) {
  const existing = wins.get(opts.id);
  if (existing) { focusWin(opts.id); return existing; }

  const el = document.createElement('section');
  el.className = 'win';
  el.dataset.id = opts.id;
  el.style.cssText = `left:${opts.x}px;top:${opts.y}px;width:${opts.w}px;height:${opts.h}px;z-index:${++zTop}`;
  el.innerHTML =
    `<header class="win-head">
       <span class="dots"><i class="c" title="Close"></i><i class="m" title="Minimise"></i><i class="z" title="Maximise"></i></span>
       <span class="win-title"><b>${esc(opts.title)}</b>${opts.sub ? ' — ' + esc(opts.sub) : ''}</span>
     </header>
     <div class="win-body ${opts.cls ?? ''}"></div>
     <div class="win-rz"></div>`;
  (el.querySelector('.win-body') as HTMLElement).innerHTML = opts.body;
  document.getElementById('desk')!.appendChild(el);
  wins.set(opts.id, el);

  el.addEventListener('mousedown', () => focusWin(opts.id), true);
  (el.querySelector('.dots .c') as HTMLElement).onclick = () => closeWin(opts.id);
  (el.querySelector('.dots .m') as HTMLElement).onclick = () => { el.classList.add('min'); paintDock(); };
  (el.querySelector('.dots .z') as HTMLElement).onclick = () => toggleMax(el);

  dragBy(el.querySelector('.win-head') as HTMLElement, el, 'move');
  dragBy(el.querySelector('.win-rz') as HTMLElement, el, 'resize');
  (el.querySelector('.win-head') as HTMLElement).addEventListener('dblclick', () => toggleMax(el));

  focusWin(opts.id);
  return el;
}

function closeWin(id: string) {
  wins.get(id)?.remove();
  wins.delete(id);
  paintDock();
}

function toggleMax(el: HTMLElement) {
  if (el.classList.toggle('max')) {
    el.dataset.prev = `${el.style.left}|${el.style.top}|${el.style.width}|${el.style.height}`;
    const panel = 30, dock = 62;
    Object.assign(el.style, {
      left: '0px', top: panel + 'px',
      width: window.innerWidth + 'px',
      height: window.innerHeight - panel - dock + 'px',
    });
  } else if (el.dataset.prev) {
    const [l, t, w, h] = el.dataset.prev.split('|');
    Object.assign(el.style, { left: l, top: t, width: w, height: h });
  }
}

function dragBy(handle: HTMLElement, win: HTMLElement, mode: 'move' | 'resize') {
  handle.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.dots')) return;
    e.preventDefault();
    if (mode === 'move' && win.classList.contains('max')) return;
    handle.setPointerCapture(e.pointerId);

    const sx = e.clientX, sy = e.clientY;
    const r = win.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') {
        win.style.left = Math.max(0, Math.min(window.innerWidth - 120, r.left + dx)) + 'px';
        win.style.top = Math.max(30, Math.min(window.innerHeight - 60, r.top + dy)) + 'px';
      } else {
        win.style.width = Math.max(300, r.width + dx) + 'px';
        win.style.height = Math.max(160, r.height + dy) + 'px';
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}

/* ---------- Dock ---------- */
const DOCK = [
  { id: 'term', gl: '▮', label: 'Terminal', run: () => openTerminal() },
  { id: 'files', gl: '▤', label: 'Files', run: () => openFiles() },
  { id: 'about', gl: '☺', label: 'About', run: () => openAbout() },
  { id: 'sysinfo', gl: '◆', label: 'Sysinfo', run: () => openSysinfo() },
];

function paintDock() {
  const d = document.getElementById('dock');
  if (!d) return;
  d.innerHTML =
    DOCK.map((a) => {
      const w = wins.get(a.id);
      const live = w && !w.classList.contains('min') ? ' live' : '';
      return `<button data-app="${a.id}" class="${live.trim()}" title="${a.label}"><span class="gl">${a.gl}</span>${a.label}</button>`;
    }).join('') +
    `<span class="div"></span><button data-app="__blog" title="Back to the blog"><span class="gl">←</span>Blog</button>`;

  d.querySelectorAll<HTMLElement>('button').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.app!;
      if (id === '__blog') { location.href = '/'; return; }
      const w = wins.get(id);
      if (w && !w.classList.contains('min')) { w.classList.add('min'); paintDock(); }
      else DOCK.find((a) => a.id === id)!.run();
    };
  });
}

/* ============================================================
   Virtual filesystem
   ============================================================ */

const years = () => [...new Set(FILES.map((f) => f.year))].sort().reverse();

function dirsOf(path: string): string[] {
  if (path === HOME) return ['posts'];
  if (path === `${HOME}/posts`) return years();
  return [];
}
function filesOf(path: string): FsFile[] {
  return FILES.filter((f) => f.dir === path);
}
function extraFilesOf(path: string): string[] {
  return path === HOME ? ['about.txt', 'README'] : [];
}
function isDir(path: string) {
  return path === HOME || path === `${HOME}/posts` || years().some((y) => path === `${HOME}/posts/${y}`);
}
function resolve(arg: string, base = cwd): string {
  if (!arg || arg === '.') return base;
  if (arg === '~') return HOME;
  let p = arg.startsWith('/') ? arg : arg.startsWith('~/') ? HOME + arg.slice(1) : base + '/' + arg;
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return '/' + out.join('/');
}
const short = (p: string) => (p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p);

/** Find a post by name, allowing a trailing * and case-insensitive prefixes. */
function findFile(arg: string): FsFile | undefined {
  const target = resolve(arg);
  const base = target.slice(target.lastIndexOf('/') + 1);
  const dir = target.slice(0, target.lastIndexOf('/'));
  const pool = isDir(dir) ? FILES.filter((f) => f.dir === dir) : FILES;
  const norm = base.replace(/\.md$/i, '').toLowerCase();
  return (
    pool.find((f) => f.name.toLowerCase() === base.toLowerCase()) ??
    pool.find((f) => f.name.replace(/\.md$/, '').toLowerCase() === norm) ??
    (norm.endsWith('*')
      ? pool.find((f) => f.name.toLowerCase().startsWith(norm.slice(0, -1)))
      : pool.find((f) => f.name.toLowerCase().startsWith(norm)))
  );
}

const ABOUT_TXT = `Patrick Schüle — Munich, Germany.

Microsoft technologies at metafinanz by day, freelance for small
businesses by night. This blog collects the notes I would otherwise
have to work out twice.

Hiking and mountain biking around Munich, and on the road in a
VW T6 camper whenever the weather allows.

  mail    website@schuele.xyz
  github  github.com/schupat
  web     https://schuele.xyz/about/`;

const README_TXT = `schuele.xyz — desktop mode

This is a toy. The blog itself lives at https://schuele.xyz/ and does not
need any of this to work.

Everything here is real though: the shell reads the same posts the site is
built from, so ls, cat, grep and find operate on actual content rather than
a canned demo. Type 'help' in the terminal for the command list.

Built with Astro. Source: github.com/schupat/checkso.github.io`;

/* ============================================================
   Terminal
   ============================================================ */

/**
 * Startanordnung. Ab 1240px liegen Terminal und Dateimanager nebeneinander,
 * darunter gestaffelt -- nebeneinander wuerde der Dateimanager sonst unter
 * seine Mindestbreite gedrueckt.
 */
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const top = 46, bottom = 74, gap = 18, pad = 34;
  const h = Math.min(470, vh - top - bottom);

  if (vw >= 1240) {
    const usable = vw - pad * 2 - gap;
    const tw = Math.round(Math.min(720, usable * 0.56));
    const fw = Math.min(560, usable - tw);
    return {
      term: { x: pad, y: top, w: tw, h },
      files: { x: pad + tw + gap, y: top, w: fw, h: Math.min(h, 400) },
    };
  }
  return {
    term: { x: pad, y: top, w: Math.min(760, vw - pad * 2), h },
    files: { x: pad + 46, y: top + 58, w: Math.min(620, vw - pad * 2 - 46), h: Math.min(400, vh - top - bottom - 58) },
  };
}

const history: string[] = [];
let hIdx = -1;

function openTerminal() {
  const L = layout();
  const w = makeWindow({
    id: 'term', title: 'patrick@schuele', sub: 'zsh',
    x: L.term.x, y: L.term.y, w: L.term.w, h: L.term.h,
    cls: 'term',
    body: `<div id="term-out"></div>
           <div class="term-in"><span class="ps1" id="ps1"></span><input id="term-cmd" autocomplete="off" spellcheck="false" aria-label="Terminal input" /></div>`,
  });

  const out = w.querySelector('#term-out') as HTMLElement;
  const input = w.querySelector('#term-cmd') as HTMLInputElement;

  if (!out.dataset.ready) {
    out.dataset.ready = '1';
    print(out, `<span class="hint">schuele.xyz desktop — a toy shell over ${FILES.length} real posts.
Type <span class="k">help</span> for commands, <span class="k">ls</span> to look around, <span class="k">exit</span> to go back to the blog.</span>\n`);
    setPs1(w);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const raw = input.value;
        input.value = '';
        print(out, `<span class="ps1">${ps1Text()}</span> <span class="cmd">${esc(raw)}</span>`);
        if (raw.trim()) { history.push(raw); hIdx = history.length; }
        const res = run(raw);
        if (res === '__CLEAR__') out.innerHTML = '';
        else if (res) print(out, res);
        setPs1(w);
        (w.querySelector('.win-body') as HTMLElement).scrollTop = 1e9;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx > 0) input.value = history[--hIdx] ?? '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx < history.length - 1) input.value = history[++hIdx] ?? '';
        else { hIdx = history.length; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        input.value = complete(input.value);
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault(); out.innerHTML = '';
      }
    });
  }

  (w.querySelector('.win-body') as HTMLElement).addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('a')) input.focus();
  });
  setTimeout(() => input.focus(), 30);
  return w;
}

const ps1Text = () => `patrick@schuele ${short(cwd)} $`;
function setPs1(w: HTMLElement) {
  const el = w.querySelector('#ps1');
  if (el) el.innerHTML = `patrick@schuele <span class="p">${esc(short(cwd))}</span> $`;
}
function print(out: HTMLElement, html: string) {
  const d = document.createElement('div');
  d.className = 'line';
  d.innerHTML = html;
  out.appendChild(d);
}

function complete(v: string): string {
  const parts = v.split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  if (parts.length === 1) {
    const c = Object.keys(COMMANDS).filter((k) => k.startsWith(last));
    return c.length === 1 ? c[0] + ' ' : v;
  }
  const names = [...filesOf(cwd).map((f) => f.name), ...dirsOf(cwd), ...extraFilesOf(cwd)];
  const c = names.filter((n) => n.toLowerCase().startsWith(last.toLowerCase()));
  if (c.length === 1) { parts[parts.length - 1] = c[0]; return parts.join(' '); }
  // Longest common prefix
  if (c.length > 1) {
    let pre = c[0];
    for (const n of c) { while (!n.toLowerCase().startsWith(pre.toLowerCase())) pre = pre.slice(0, -1); }
    if (pre.length > last.length) { parts[parts.length - 1] = pre; return parts.join(' '); }
  }
  return v;
}

/* ---------- Commands ---------- */

type Cmd = { help: string; usage?: string; run: (args: string[], raw: string) => string };

const COMMANDS: Record<string, Cmd> = {
  help: {
    help: 'show this list',
    run: () => {
      const rows = Object.entries(COMMANDS).map(
        ([n, c]) => `  <span class="k">${n.padEnd(9)}</span> <span class="hint">${esc(c.help)}</span>`);
      return `Available commands:\n${rows.join('\n')}\n
<span class="hint">Tab completes, ↑/↓ walks the history, Ctrl+L clears.
Posts live under <span class="d">~/posts/&lt;year&gt;/</span>.</span>`;
    },
  },

  ls: {
    help: 'list directory contents', usage: 'ls [-l] [path]',
    run: (args) => {
      const long = args.includes('-l');
      const rest = args.filter((a) => !a.startsWith('-'));
      const path = resolve(rest[0] ?? '.');
      if (!isDir(path)) {
        const f = findFile(rest[0] ?? '.');
        return f ? f.name : `<span class="err">ls: ${esc(rest[0] ?? '')}: No such file or directory</span>`;
      }
      const ds = dirsOf(path), fs = filesOf(path), xs = extraFilesOf(path);
      if (!ds.length && !fs.length && !xs.length) return '<span class="hint">(empty)</span>';
      if (!long) {
        return [
          ...ds.map((d) => `<span class="d">${d}/</span>`),
          ...xs.map((x) => `<span class="f">${x}</span>`),
          ...fs.map((f) => `<span class="f">${f.name}</span>`),
        ].join('   ');
      }
      const rows = [
        ...ds.map((d) => `drwxr-xr-x  ${String(filesOf(path + '/' + d).length).padStart(3)} items  <span class="d">${d}/</span>`),
        ...xs.map((x) => `-rw-r--r--  ${String((x === 'about.txt' ? ABOUT_TXT : README_TXT).length).padStart(6)}  ${x}`),
        ...fs.map((f) =>
          `-rw-r--r--  ${String(f.size).padStart(6)}  ${f.iso}  <span class="f">${f.name}</span>  <span class="${f.fresh ? 'ok' : 'hint'}">${f.age}</span>`),
      ];
      return rows.join('\n');
    },
  },

  cd: {
    help: 'change directory', usage: 'cd [path]',
    run: (args) => {
      const p = resolve(args[0] ?? '~');
      if (!isDir(p)) return `<span class="err">cd: ${esc(args[0] ?? '')}: Not a directory</span>`;
      cwd = p;
      return '';
    },
  },

  pwd: { help: 'print working directory', run: () => cwd },

  cat: {
    help: 'print a post to the terminal', usage: 'cat <file>',
    run: (args) => {
      if (!args[0]) return '<span class="err">cat: missing operand</span>';
      if (resolve(args[0]) === `${HOME}/about.txt`) return esc(ABOUT_TXT);
      if (resolve(args[0]) === `${HOME}/README`) return esc(README_TXT);
      const f = findFile(args[0]);
      if (!f) return `<span class="err">cat: ${esc(args[0])}: No such file or directory</span>`;
      return `<span class="m">── ${esc(f.title)}</span>
<span class="hint">   ${esc(f.date)} · ${esc(f.tags.join(', '))} · ${esc(f.age)}</span>

${esc(f.body)}

<span class="hint">── read it properly: <a href="${f.url}">${esc(f.url)}</a></span>`;
    },
  },

  head: {
    help: 'print the first lines of a post', usage: 'head [-n N] <file>',
    run: (args) => {
      let n = 12;
      const i = args.indexOf('-n');
      if (i >= 0) { n = parseInt(args[i + 1] ?? '12', 10) || 12; args.splice(i, 2); }
      const f = findFile(args[0] ?? '');
      if (!f) return `<span class="err">head: ${esc(args[0] ?? '')}: No such file or directory</span>`;
      return esc(f.body.split('\n').slice(0, n).join('\n'));
    },
  },

  grep: {
    help: 'search the text of every post', usage: 'grep <pattern> [file]',
    run: (args) => {
      const pat = args[0];
      if (!pat) return '<span class="err">grep: missing pattern</span>';
      const pool = args[1] ? [findFile(args[1])].filter(Boolean) as FsFile[] : FILES;
      const rx = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const out: string[] = [];
      let hits = 0;
      for (const f of pool) {
        const lines = f.body.split('\n');
        lines.forEach((ln, i) => {
          if (rx.test(ln) && hits < 40) {
            hits++;
            const marked = esc(ln.trim()).replace(new RegExp(`(${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
            out.push(`<span class="c">${esc(f.name)}</span><span class="hint">:${i + 1}:</span> ${marked}`);
          }
        });
      }
      if (!out.length) return `<span class="hint">No match for “${esc(pat)}”.</span>`;
      return out.join('\n') + (hits >= 40 ? '\n<span class="hint">… truncated at 40 matches</span>' : '');
    },
  },

  find: {
    help: 'find posts by name, tag or year', usage: 'find <text>',
    run: (args) => {
      const q = (args[0] ?? '').toLowerCase();
      if (!q) return '<span class="err">find: missing operand</span>';
      const hit = FILES.filter((f) =>
        (f.name + ' ' + f.title + ' ' + f.tags.join(' ') + ' ' + f.categories.join(' ') + ' ' + f.year)
          .toLowerCase().includes(q));
      if (!hit.length) return `<span class="hint">Nothing matches “${esc(q)}”.</span>`;
      return hit.map((f) => `<span class="d">${esc(short(f.dir))}/</span><span class="f">${esc(f.name)}</span>`).join('\n');
    },
  },

  tree: {
    help: 'show the post tree',
    run: () => {
      const out = [`<span class="d">~/posts</span>`];
      const ys = years();
      ys.forEach((y, yi) => {
        const last = yi === ys.length - 1;
        out.push(`${last ? '└──' : '├──'} <span class="d">${y}</span>`);
        const fs = filesOf(`${HOME}/posts/${y}`);
        fs.forEach((f, fi) => {
          const flast = fi === fs.length - 1;
          out.push(`${last ? '   ' : '│  '} ${flast ? '└──' : '├──'} <span class="f">${esc(f.name)}</span> <span class="hint">${esc(f.age)}</span>`);
        });
      });
      out.push('', `<span class="hint">${FILES.length} posts across ${ys.length} years</span>`);
      return out.join('\n');
    },
  },

  open: {
    help: 'open a post in a reader window', usage: 'open <file>',
    run: (args) => {
      const f = findFile(args[0] ?? '');
      if (!f) return `<span class="err">open: ${esc(args[0] ?? '')}: No such file or directory</span>`;
      openReader(f);
      return `<span class="ok">Opening ${esc(f.name)}…</span>`;
    },
  },

  www: {
    help: 'open a post on the actual site', usage: 'www <file>',
    run: (args) => {
      const f = findFile(args[0] ?? '');
      if (!f) return `<span class="err">www: ${esc(args[0] ?? '')}: No such file or directory</span>`;
      setTimeout(() => (location.href = f.url), 350);
      return `<span class="ok">→ ${esc(f.url)}</span>`;
    },
  },

  tags: {
    help: 'list every tag with a count',
    run: () => {
      const m = new Map<string, number>();
      for (const f of FILES) for (const t of f.tags) m.set(t, (m.get(t) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([t, n]) => `  <span class="k">${String(n).padStart(2)}</span>  ${esc(t)}`).join('\n');
    },
  },

  stale: {
    help: 'list posts that have not been verified in a while',
    run: () => {
      const old = FILES.filter((f) => f.stale);
      if (!old.length) return '<span class="ok">Everything is current.</span>';
      return old.map((f) => `<span class="k">${f.age.padEnd(10)}</span> <span class="f">${esc(f.name)}</span>`).join('\n')
        + `\n\n<span class="hint">Set a "verified" date in the frontmatter to clear these.</span>`;
    },
  },

  neofetch: {
    help: 'system information, obviously',
    run: () => {
      const ys = years();
      const info = [
        ['patrick@schuele', ''],
        ['───────────────', ''],
        ['OS', 'schuele.xyz desktop (toy)'],
        ['Host', 'GitHub Pages'],
        ['Kernel', 'Astro 5'],
        ['Shell', 'zsh (pretend)'],
        ['Posts', `${FILES.length}`],
        ['Years', `${ys[ys.length - 1]}–${ys[0]}`],
        ['Stale', `${FILES.filter((f) => f.stale).length}`],
        ['Theme', 'wombat-ish'],
      ];
      const logo = [
        '   <span class="k">.--.</span>   ', '  <span class="k">|o_o |</span>  ', '  <span class="k">|:_/ |</span>  ',
        ' <span class="k">//   \\ \\</span> ', '<span class="k">(|     | )</span>', "<span class=\"k\">/'\\_   _/`\\</span>",
        '<span class="k">\\___)=(___/</span>', '          ', '          ', '          ',
      ];
      return info.map((row, i) =>
        `${logo[i] ?? '          '}  ${row[1] ? `<span class="c">${row[0].padEnd(7)}</span> ${esc(row[1])}` : `<span class="m">${row[0]}</span>`}`
      ).join('\n');
    },
  },

  whoami: { help: 'guess', run: () => 'patrick' },
  date: { help: 'current date and time', run: () => new Date().toString() },
  uname: { help: 'system name', run: () => 'schuele.xyz 5.0 static #1 SMP GitHub Pages x86_64 GNU/Astro' },
  echo: { help: 'print text', run: (a) => esc(a.join(' ')) },
  clear: { help: 'clear the screen', run: () => '__CLEAR__' },
  exit: {
    help: 'back to the blog',
    run: () => { setTimeout(() => (location.href = '/'), 400); return '<span class="hint">logout — see you on the blog.</span>'; },
  },
  sudo: {
    help: 'nice try',
    run: (a) => a.length
      ? `<span class="err">patrick is not in the sudoers file. This incident has been reported.</span>`
      : '<span class="err">usage: sudo &lt;command&gt;</span>',
  },
};

function run(raw: string): string {
  const line = raw.trim();
  if (!line) return '';
  const parts = line.match(/"[^"]*"|\S+/g)?.map((s) => s.replace(/^"|"$/g, '')) ?? [];
  const name = parts[0];
  const args = parts.slice(1);
  const cmd = COMMANDS[name];
  if (!cmd) {
    const near = Object.keys(COMMANDS).filter((k) => k.startsWith(name[0] ?? ''));
    return `<span class="err">zsh: command not found: ${esc(name)}</span>` +
      (near.length ? `\n<span class="hint">did you mean: ${near.join(', ')}?</span>` : '') +
      `\n<span class="hint">try <span class="k">help</span></span>`;
  }
  try { return cmd.run(args, raw); }
  catch { return `<span class="err">${esc(name)}: something went sideways</span>`; }
}

/* ============================================================
   File manager, reader, about, sysinfo
   ============================================================ */

let fmPath = `${HOME}/posts`;

function openFiles() {
  const L = layout();
  const w = makeWindow({
    id: 'files', title: 'Files', sub: 'posts',
    x: L.files.x, y: L.files.y, w: L.files.w, h: L.files.h,
    cls: 'fm', body: '<div class="fm-side"></div><div class="fm-main"></div>',
  });
  paintFm(w);
  return w;
}

function paintFm(w: HTMLElement) {
  const side = w.querySelector('.fm-side') as HTMLElement;
  const main = w.querySelector('.fm-main') as HTMLElement;

  side.innerHTML =
    `<div class="grp">Places</div>` +
    `<button data-p="${HOME}/posts" class="${fmPath === HOME + '/posts' ? 'on' : ''}">▤ All posts</button>` +
    `<div class="grp">Years</div>` +
    years().map((y) =>
      `<button data-p="${HOME}/posts/${y}" class="${fmPath === `${HOME}/posts/${y}` ? 'on' : ''}">▸ ${y}</button>`).join('');

  const list = fmPath === `${HOME}/posts` ? FILES : filesOf(fmPath);
  main.innerHTML =
    `<div class="fm-path">${esc(short(fmPath))} — ${list.length} item${list.length === 1 ? '' : 's'}</div>` +
    list.map((f) =>
      `<div class="fm-row" data-f="${esc(f.name)}">
         <span class="ic">▤</span>
         <span class="nm" title="${esc(f.title)}">${esc(f.name)}</span>
         <span class="dt">${esc(f.date)}</span>
         <span class="age${f.fresh ? ' ok' : ''}">${esc(f.age)}</span>
       </div>`).join('');

  side.querySelectorAll<HTMLElement>('button').forEach((b) => {
    b.onclick = () => { fmPath = b.dataset.p!; paintFm(w); };
  });
  main.querySelectorAll<HTMLElement>('.fm-row').forEach((r) => {
    r.onclick = () => {
      const f = FILES.find((x) => x.name === r.dataset.f);
      if (f) openReader(f);
    };
  });
}

function openReader(f: FsFile) {
  const id = 'read:' + f.name;
  closeWin(id);
  makeWindow({
    id, title: f.name.replace(/\.md$/, ''), sub: f.date,
    x: 120 + (wins.size % 4) * 26, y: 118 + (wins.size % 4) * 22,
    w: Math.min(700, window.innerWidth - 120), h: Math.min(470, window.innerHeight - 170),
    cls: 'reader',
    body: `<h1>${esc(f.title)}</h1>
           <p class="meta">${esc(f.date)} · ${esc(f.tags.join(' · '))} · ${esc(f.age)}
             · <a href="${f.url}">open on the site →</a></p>
           <pre>${esc(f.body)}</pre>`,
  });
}

function openAbout() {
  makeWindow({
    id: 'about', title: 'about.txt', sub: 'reader',
    x: 200, y: 190, w: Math.min(520, window.innerWidth - 120), h: 330,
    cls: 'reader', body: `<pre>${esc(ABOUT_TXT)}</pre>`,
  });
}

function openSysinfo() {
  makeWindow({
    id: 'sysinfo', title: 'sysinfo', sub: 'neofetch',
    x: 240, y: 230, w: 520, h: 300, cls: 'term',
    body: `<div class="line">${COMMANDS.neofetch.run([], '')}</div>`,
  });
}

/* ============================================================
   Boot
   ============================================================ */

function clock() {
  const el = document.getElementById('clock');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
      + '  ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}

async function boot() {
  try {
    const r = await fetch('/desktop-fs.json');
    FILES = (await r.json()).files ?? [];
  } catch {
    FILES = [];
  }

  const n = document.getElementById('stat-posts');
  if (n) n.textContent = String(FILES.length);
  const s = document.getElementById('stat-stale');
  if (s) s.textContent = String(FILES.filter((f) => f.stale).length);

  paintDock();
  clock();
  setInterval(clock, 20000);

  if (window.innerWidth > 720 && window.innerHeight > 460) {
    openTerminal();
    openFiles();
    focusWin('term');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !wins.size) location.href = '/';
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); openTerminal(); }
  });
}

boot();

export {};
