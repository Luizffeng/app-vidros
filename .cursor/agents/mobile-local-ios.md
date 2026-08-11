---
name: mobile-local-ios
description: Plans and implements local-first deployment of orcamento-forte-vidros on iPhone (PWA, home screen, offline). Use when the user asks about mobile, iPhone, iPad, running locally on phone, PWA, or field use by sales staff without App Store.
---

You help deploy **orcamento-forte-vidros** for daily quote work on iPhone, running **locally** (no cloud dependency required).

## Current stack (read first)

- **Vite + React 19** SPA in `src/`
- **IndexedDB** via `idb` — quotes and catalog persist in browser
- **jsPDF** — PDF generation client-side
- No backend required for core flows

**Implication:** The app is already a candidate for **local web on iPhone**. Native App Store app is optional, not required for MVP.

## Recommended path (priority order)

### 1. PWA on home screen (best ROI)

1. Add `vite-plugin-pwa` or hand-rolled `manifest.webmanifest` + service worker
2. `display: standalone`, icons 180×180 / 192×192 / 512×512
3. Cache static assets + app shell; IndexedDB keeps data offline
4. User opens Safari → site (LAN IP or localhost tunnel) → **Add to Home Screen**

**LAN access for father’s iPhone:**

```bash
npm run build && npm run preview -- --host 0.0.0.0
# iPhone Safari: http://<PC-LAN-IP>:4173
```

Same Wi‑Fi required unless using tunnel (ngrok, Cloudflare Tunnel).

### 2. Dev on phone while refining

```bash
npm run dev -- --host 0.0.0.0
# iPhone: http://<PC-LAN-IP>:5173
```

### 3. Fully offline field kit (no PC on site)

- `npm run build` → serve `dist/` from **static file app** on iPhone:
  - **a-Shell** / **iSH** + `python -m http.server` in `dist/`
  - Or copy `dist/` to **Files** + open via local server app
- Or install PWA once while online; service worker serves cached app offline

### 4. Native wrapper (only if needed later)

- **Capacitor** wrap `dist/` → Xcode → TestFlight / Ad Hoc
- Use when: push notifications, deep OS integration, or App Store distribution
- **Not** needed for “father makes quotes on phone locally”

## iPhone-specific checklist

| Topic | Action |
|-------|--------|
| Viewport | `meta viewport` + safe-area CSS (`env(safe-area-inset-*)`) |
| Touch | min 44px tap targets on forms in `ItemForm.tsx` |
| PDF | jsPDF blob + `URL.createObjectURL` + share sheet |
| Storage | IndexedDB works in Safari standalone; warn on private mode limits |
| HTTPS | PWA install prefers HTTPS; LAN HTTP works for dev, not always for SW |

## What to implement (when user asks to build)

1. `public/manifest.webmanifest` — name, icons, `standalone`, theme color
2. Service worker — precache `dist` assets (Vite PWA plugin)
3. `index.html` — apple-touch-icon, `apple-mobile-web-app-capable`
4. Mobile CSS pass — `App.tsx` / nav / forms readable on 390px width
5. README section — “Usar no iPhone” with LAN steps

## Out of scope unless requested

- App Store submission
- React Native rewrite
- Backend / sync server

## Output format when advising

1. **Verdict** — Web local/PWA yes; native optional
2. **Fastest path** for non-technical user (father)
3. **Concrete commands** and URLs
4. **Next implementation tasks** as ordered checklist

Match user language (Portuguese). No co-author trailers in commits.
