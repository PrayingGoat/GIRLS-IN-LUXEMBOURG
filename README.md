# Girls in Luxembourg

Landing page responsive, conçue à partir du contenu public de Girls in Luxembourg. HTML, CSS et JavaScript natifs ; aucune dépendance en production, aucune requête vers un service externe au chargement.

## Voir la page

Avec Node.js 22 ou supérieur :

```sh
npm run dev
```

Ouvrir http://localhost:5173. Sous PowerShell, si l’exécution des scripts npm est bloquée, utiliser `npm.cmd run dev`. Le fichier `index.html` peut également être ouvert directement dans un navigateur.

## Construire et publier

```sh
npm run build
```

Le dossier `dist/` contient les fichiers statiques à publier chez l’hébergeur choisi. Le serveur de développement est limité à localhost et n’est pas destiné à la production. Aucun déploiement n’a été réalisé.

## Choix éditoriaux et visuels

- Le contenu de [About us](https://big-basket-eb6.notion.site/About-us-3d64509e559180918dbdfbaac318a58d) fournit l’histoire depuis novembre 2025, les valeurs, les chiffres, les noms, les rôles et les portraits de l’équipe.
- Les pages publiques « Explore the community », « FAQ » et « Join and follow us » complètent les neuf clubs, les conditions d’adhésion et les destinations des boutons. L’anglais est conservé comme langue principale de la communauté.
- [The Gather](https://thegather.lu/) a été analysé pour son parcours : accueil, découverte des groupes, présentation de l’équipe, réponses aux questions et adhésion. Son contenu, ses témoignages, son calendrier et ses photos ne sont pas repris.
- `design.jpg` inspire la douceur des formes et la place accordée aux photos. Les couleurs de l’interface reprennent ensuite les dix roses de la palette fournie par le client, avec du texte foncé pour la lisibilité.
- [Lucky Girl](https://luckygirl.com/) inspire la typographie : son utilisation d’EB Garamond et des italiques est adaptée à notre hiérarchie. EB Garamond, en graisse 600 pour les titres et 500 pour les accents italiques, est associée à DM Sans pour les paragraphes et la navigation. Les tailles, interlignes et espacements sont adaptés aux écrans mobiles et aux cartes du projet.
- La refonte actuelle suit la composition de [Golf Club Website Design](https://dribbble.com/shots/27567864-Golf-Club-Website-Design), avec navigation flottante, hero photographique, cartes translucides et mosaïque. Le détail de l’analyse et des adaptations figure dans [DESIGN.md](DESIGN.md). Barlow Condensed complète la typographie pour les très grands titres condensés et les chiffres ; les titres de section restent en EB Garamond.
- Les photos d’ambiance illustrent les activités ; elles ne sont pas présentées comme des photos de vrais événements de Girls in Luxembourg. Les portraits de l’équipe proviennent bien de Notion.

## Fonctionnement

- Filtres locaux pour les neuf clubs ; aucun appel réseau.
- Menu mobile avec état accessible, fermeture par Échap et déplacement du focus vers la section choisie.
- FAQ native accessible au clavier, fonctionnelle sans JavaScript.
- Liens vers le formulaire Notion d’adhésion existant, les réseaux officiels et `hello@girlsinlu.com`. Aucun faux formulaire, aucune inscription simulée.
- Images WebP locales, variantes du visuel principal, chargement différé des images secondaires, dimensions réservées et polices WOFF2 locales.
- Animations CSS limitées aux interactions, respect de `prefers-reduced-motion`.

## Vérifications

```sh
npm install
npm run test:e2e
```

Les vérifications utilisent Playwright et Microsoft Edge installé localement. Elles contrôlent les largeurs 320, 375, 390, 767, 768, 1024, 1440 et 1920 px, les filtres, la FAQ, le menu mobile, les ancres, les images, les erreurs navigateur, la navigation au défilement, le mode mouvement réduit et les contenus sans JavaScript. Les captures sont enregistrées dans `test-results/`. Pour un serveur sur un autre port, définir `TEST_BASE_URL` avant de lancer les tests.

Les outils Playwright et Sharp servent uniquement au développement. Ils ne sont ni chargés par les visiteurs, ni inclus dans `dist/`.

## Mise à jour

Le contenu et les chiffres sont un instantané des sources consultées le 29 septembre 2026. Ils ne se synchronisent pas automatiquement avec Notion. Modifier `index.html` pour actualiser les textes, les chiffres ou les liens ; `styles.css` pour les couleurs et la mise en page ; `app.js` pour les interactions.

### Direction visuelle actuelle

La mise à jour du 16 octobre 2026 s’inspire de https://www.llgc.co.uk/ : accueil en deux colonnes, collages photo, boutons à ombre décalée et fondus. Voir DESIGN.md.

Les huit photos de photos/ sont exportées en WebP responsive avec node scripts/prepare-community-photos.cjs. Le logo, les portraits et l’illustration sont conservés. Les polices locales sont Instrument Serif, Wix Madefor Text et Montserrat (licences SIL OFL dans assets/).

Tests complémentaires : node scripts/check-gallery.cjs et node scripts/check-panels.cjs. Définir TEST_LIVE_FORMS=1 pour vérifier aussi le chargement des formulaires Notion externes, sans soumission.

Les fenêtres reprennent les neuf sources Notion consultées le 9 octobre 2026, sans synchronisation automatique. scripts/build-sections.cjs les régénère depuis les captures locales .research/*-current.json.


## Membership requests

Every "Join us" button links to `/join`, a membership request form (first name, last name, email, WhatsApp number, consent). `join.js` posts it to `/api/membership`, which validates the request and stores it in MongoDB; an administrator then contacts the person on WhatsApp. Submitting does not add anyone to a group automatically. The WhatsApp icons in the top banner and footer remain direct links to the group. The private /admin page manages community numbers and website images using MongoDB Atlas. See [database setup](database/README.md). Set MONGODB_URI and MONGODB_DB in the server environment, run npm run db:migrate, then npm run admin:setup once to choose the administrator password (stored in MongoDB).


## Page structure

The homepage now contains the hero, moving values ribbon, editable community counts,
three page links and a short membership invitation. Detailed content lives on:

- story.html: history, mission and values
- community.html: the nine groups, shared moments and a link to the team
- team.html: six editable team portraits, roles and social links
- faq.html: questions grouped by topic
- contact.html: contact form, volunteering and feedback. The form (name, email, reason:
  General question / Partnership / Volunteering, message) is handled by `contact-form.js`
  and `/api/contact`, saved in the MongoDB `contact_messages` collection and listed in
  /admin under **Messages**. `/contact?reason=volunteering` preselects the reason.
- feedback.html: anonymous feedback form (/feedback, linked from Contact and the footer).
  `feedback-form.js` posts to `/api/feedback`; answers (experience 1-5, groups, what works,
  what could be better, testimony consent, optional name/phone/email) are stored in the
  MongoDB `feedback_responses` collection without IP address, browser data or exact time
  (only the day), and listed in /admin under **Feedback**.
- partnerships.html and policy.html: partnerships and privacy/refund information
- events.html: Luma events and interactive calendar
- join.html: membership request form (saved through /api/membership)

All public pages share the same header: a "Women's Social Club" banner linking to
/community with social icons, then the floating navigation (About, Our community,
Events, FAQ, Contact) and the "Join us" button. When changing it,
update every page so they stay identical.

Below 880px the top bar keeps only the logo and "Join us"; navigation moves to a floating
liquid-glass tab bar at the bottom (Home, About, Community, Events, More). "More" opens a
sheet with FAQ, Contact, Join us and the social links (`.tab-bar` / `#more-sheet` at the end
of each page, behaviour in `app.js`). The active tab is set per page with `aria-current`.

The shared footer has three columns: "Girls in Luxembourg" with the mission text and social
media links, About us (Our story, The Team, Join us, FAQ) and Contact us (email, Partner with us,
Become a volunteer, Feedback). The main call-to-action buttons use the `.btn-pill` style.

/admin remains private and absent from public navigation.
site-pages.cjs defines the files served locally and copied by the build. Public
links are native links and work without JavaScript. Former homepage section links
redirect to their new pages. The historical Notion panel importer is guarded against
overwriting this layout; edit the individual HTML pages directly.

Run npm run test:e2e to verify the pages, responsive layout, links, FAQ and navigation.

### Events calendar

`events.html` contains a responsive monthly calendar in Europe/Luxembourg time. Registration remains on Luma. `/api/events` discovers public events hosted by `usr-5mEZeykJMwDEoUA` using the public profile event listing, paginating both future and past results. Results refresh on requests after a 15-minute server cache expires; failures retain the last successful result or `assets/calendar-events.json` and retry after one minute. Only event display fields are retained, never guest or payment data. Upcoming events precede ongoing projects; past events are in a collapsible history. Sold-out events remain visible and are labelled.

The public-profile listing is the same unauthenticated source used by Luma's website, not a guaranteed official API contract. Private or unlisted events are excluded; only hosted events are imported, not attended events. If Luma changes this interface, the saved-data fallback is shown. An official API integration requires Luma Plus and a private calendar key. Run `node --test scripts/luma-events.test.cjs` for pagination, filtering and malformed-response checks; `node scripts/check-calendar.cjs` validates the calendar UI with TEST_BASE_URL pointing to a current server.

### Image customisation in the administrator workspace

Open `/admin`, sign in, and use **Website images**. The 44 image locations are grouped into shared brand assets, Home, About, Our community, The team, and Events. Every current `<img>` element is mapped through `data-media-slot`; logo and flag share global slots. The favicon and SVG interface icons are not photographs and are not edited here.

For each location: expand **Change image**, select a library photo or upload a JPG/PNG/WebP (15 MB maximum before browser optimisation), adjust the description and focus sliders, then click **Save image**. Changes only publish on saving. **Restore original** removes that location's override. Reload the public page to view updates; on the live site this can take about a minute. A repeated photo in different sections has separate slots, so replacing one does not replace the others.

Run `npm run db:migrate` to initialize the MongoDB collections and indexes. Raster uploads are decoded, stripped of metadata, resized to at most 2000px and encoded as WebP; at most 2 MiB per image is stored as BSON binary data. Built-in library choices store an asset path. Local Node and Vercel use the same data when MONGODB_URI and MONGODB_DB point to the same Atlas database. Back up the database to preserve uploaded photos. Storage counts towards the Atlas quota.

`/api/admin?action=images` and PATCH `action=image` require the existing admin session; writes require the same origin. `/api/site-images` exposes public display metadata or the public image bytes, not admin data. Defaults remain visible if the database or a replacement image cannot be loaded. No external image URLs, SVG uploads, videos or animated images are accepted. New photo placements should be added to `assets/media-slots.json` and tagged in their HTML.

Validation: `node --env-file-if-exists=.env scripts/check-media.cjs` against a disposable/local database and server (`TEST_BASE_URL`, default 5188). The integration test temporarily modifies the first Home slide, restores its previous record in finally, and removes its temporary administrator session. Run outside active editing sessions.

### Clean page URLs

Public navigation uses `/`, `/story`, `/community`, `/team`, `/faq`, `/contact`, `/partnerships`, `/policy`, `/events` and `/admin`. Vercel uses `cleanUrls: true` and no trailing slash; local `server.cjs` mirrors this routing and redirects old `.html` addresses permanently while preserving query strings. HTML filenames remain unchanged internally. `/join` serves the membership request form. Validate with `node scripts/check-routes.cjs` (TEST_BASE_URL defaults to port 5186).

### Speed and availability

Nothing a visitor sees depends on a serverless function waking up:

- Pages, CSS, JavaScript, fonts and all built-in images are static files served by the CDN.
  `build.cjs` copies the images from `assets/` into `dist/`; the `/api/media` rewrites in
  `vercel.json` (images stored in MongoDB) only answer for an image missing from the build.
  When adding an image, keep the file in `assets/` and commit it.
- `/api/site-images`, `/api/community-stats` and `/api/events` are cached by the CDN with
  `stale-while-revalidate`: the CDN answers at once from its copy and refreshes it in the
  background. An image or figure changed in /admin can take about a minute, and one extra
  page load, to appear on the public site.
- The join, contact and feedback pages call `GET /api/...?warm=1` when the visitor focuses
  the form (`lib/warm.cjs`), so the function and database connection are awake before sending.
- The home slideshow downloads only the visible photo and the next one (`app.js`,
  `.hero-slide.is-ready`); it never fades to a photo that is still downloading.
- Internal links are prefetched on hover or touch (speculation rules in each page head).
  The shimmer placeholders in `assets/motion.js` are unchanged.

### Database cleanup and administrator password

In /admin, **Database cleanup** shows the size of the online database and, for each kind of data, how many items it holds and how much space they use: contact messages, feedback answers, membership requests, replaced website images, unused images and photo backups, and expired technical data. Each can be deleted entirely or only when older than 30 days, 3 months, 6 months or 1 year, after typing DELETE. Deletions apply directly to the live MongoDB database and cannot be undone. Messages and feedback can also be deleted one by one (two clicks).

"Unused images" are stored images that the site can no longer request: anything not listed in the vercel.json image rewrites, assets/media-slots.json, assets/community-photos.json or a saved image choice. When adding a new image to the site, add its rewrite to vercel.json so it is never treated as unused.

**Administrator password** changes the password, stored only as an encrypted hash in MongoDB (admin_settings), and signs out every other device. No password is kept in .env or in the hosting settings; only MONGODB_URI and MONGODB_DB are needed.

### Admin layout

After signing in, /admin opens on a welcome page (illustration `assets/admin-welcome.webp`, source in `photos/admin pics/`). A left menu with SVG icons opens one section at a time: Membership requests, Messages, Feedback, Community numbers, Website images, Database cleanup and Password. The open section is kept in the address (`/admin#requests`…), so it survives a reload and can be bookmarked. On narrow screens the menu becomes a horizontal strip.

**Membership requests** lists the requests sent from the Join us form (search, status filter, pagination): WhatsApp number as a wa.me link, email, consent date, a status (Pending, Contacted, Added to the group, Declined) and a two-click Delete. The menu shows the number of pending requests.

Admin interface checks with mocked API responses (no database writes): `node scripts/check-admin.cjs` and `node scripts/check-admin-cleanup.cjs`.

### Photo library

**Photo library** (admin menu) shows every image stored in MongoDB in a grid grouped by month, like the Photos app: filters (All, On the website, Not used), a viewer with size, date and where the photo appears, and a Select mode to delete several photos at once (with "Select all unused").

Photos shown on the website are protected: deleting one opens a warning listing where it is used, with a **Replace it** button that opens that location in Website images. The admin can also delete only the other selected photos. A photo becomes deletable once it is no longer shown (for example after being replaced).

"Shown on the website" comes from `assets/image-usage.json`, generated by `scripts/build-image-usage.cjs` (run by `npm run build`) from the `<img>` tags of the pages, the CSS and `assets/media-slots.json`, combined with the saved choices in Website images. Database cleanup uses the same rule for "Unused images". Thumbnails are generated on request (`/api/admin?action=thumb`, admin session only). Interface check with mocked responses: `node scripts/check-admin-library.cjs`.

## Hosting on Netlify (free plan)

The site runs on Netlify's free plan, which allows commercial use. `netlify.toml` holds the build, headers and redirects; `netlify/functions/*.mjs` expose each `api/*.js` handler at the same `/api/...` address through `netlify/adapter.mjs`, so the API code is shared with Vercel and `server.cjs`. Images are static files on the CDN; `/assets/*` falls back to the `media` function (MongoDB copy) only for an image missing from the deploy (`preferStatic`).

First setup (once, in the Netlify dashboard):

1. Sign up at netlify.com with the GitHub account, then **Add new project → Import an existing project → GitHub** and pick this repository (branch `main`). Build settings are read from `netlify.toml`.
2. **Site configuration → Environment variables**: add `MONGODB_URI` and `MONGODB_DB` (same values as `.env`), scope Functions.
3. **Deploy**. Every push to `main` deploys again.
4. In MongoDB Atlas **Network Access**, allow `0.0.0.0/0`: Netlify functions do not have fixed IP addresses. Access stays protected by the database user and password.
5. Optional: **Domain management** to use your own domain (free HTTPS).

Free plan limits: 300 credits a month (each production deploy, bandwidth and function call uses some); the site is paused if they run out until the next month. Group changes into fewer pushes. Local check of the Netlify version: `npx netlify-cli build --offline` then `node scripts/check-netlify-bundle.cjs` (packages shipped with each function), and `npx netlify-cli serve --offline` (port 8888), then run the tests with `TEST_BASE_URL=http://localhost:8888`.
