# schuele.xyz

Patrick Schüle's blog — field notes on Microsoft infrastructure, Entra ID, Azure,
containers and the home lab. Built with [Astro](https://astro.build), hosted on GitHub Pages.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

Node 22 or newer. No Ruby, no Bundler, no submodules.

## Writing a post

Add a file under `src/content/posts/`. **The file name becomes the URL** —
`My-Post.md` is served at `/posts/My-Post/`. No date prefix in the file name.

```markdown
---
title: "Title of the post"
date: 2026-08-03
categories: ["Microsoft", "Entra ID"]
tags: ["Entra ID", "Conditional Access"]
# Optional:
# description: "Custom teaser instead of the first paragraph"
# verified: 2026-08-03
# testedAgainst: "Entra admin center + Graph PowerShell 2.3"
# effort: "~20 min"
# draft: true
---

Text …
```

`title` and `date` are required. If either is missing **the build fails** — the post
does not silently disappear the way it could under Jekyll.

### Verified seal and age notice

Without `verified`, a post shows an age notice once it passes 12 months.
Set `verified` to the date you last checked the walkthrough against the real
product UI and a green seal appears instead — and the listing shows
"verified MM/YY" rather than "3 yrs old". The threshold lives in
`src/lib/site.ts` as `staleAfterMonths`.

## Layout

```
src/content/posts/    posts as Markdown
src/content.config.ts schema — validates frontmatter at build time
src/lib/posts.ts      sorting, freshness, related posts
src/lib/site.ts       title, navigation, analytics, thresholds
src/pages/            routes (home, posts, topics, archive, feed, search index)
src/styles/global.css design system: two themes via CSS variables
src/scripts/app.ts    theme, search, command palette, copy buttons
```

## Search

`/search.json` is generated at build time and fetched the first time you type —
no server, no third-party service. The homepage lists every post without
JavaScript; search is an enhancement, not a requirement.

Keyboard: `⌘K` / `Ctrl+K` opens the command palette, `/` focuses the search
field, `t` switches the theme.

## Deploying

Pushing to `main` runs `.github/workflows/pages-deploy.yml`: `npm ci`,
`astro check`, `astro build`, then upload to GitHub Pages. The custom domain
comes from `public/CNAME`.
