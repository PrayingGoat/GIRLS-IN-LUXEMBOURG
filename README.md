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

The dedicated `join.html` page submits to `POST /api/membership`. A Node.js server stores validated requests in PostgreSQL. See [database setup](database/README.md) for local configuration and deployment. Run `npm run db:migrate` after setting `DATABASE_URL` in `.env`. Vercel is optional; its preview cannot access PostgreSQL on your local computer. The administrator page is available directly at `/admin`, with no public navigation link. Run `npm run admin:setup` locally to configure its password, and run database migrations before signing in.


## Page structure

The homepage now contains the hero, moving values ribbon, editable community counts,
three page links and a short membership invitation. Detailed content lives on:

- story.html: history, mission and values
- community.html: the nine groups, shared moments and community guidelines
- team.html: the team photograph and names
- faq.html: questions grouped by topic
- contact.html: contact, volunteering and feedback
- partnerships.html and policy.html: partnerships and privacy/refund information
- events.html: upcoming events (calendar connection still pending)
- join.html: membership form

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

Open `/admin`, sign in, and use **Website images**. The 31 image locations are grouped into shared brand assets, Home, Our story, Find your circle, The team, and Upcoming events. Every current `<img>` element is mapped through `data-media-slot`; logo and flag share global slots. The favicon and SVG interface icons are not photographs and are not edited here.

For each location: expand **Change image**, select a library photo or upload a JPG/PNG/WebP (15 MB maximum before browser optimisation), adjust the description and focus sliders, then click **Save image**. Changes only publish on saving. **Restore original** removes that location's override. Reload the public page to view updates. A repeated photo in different sections has separate slots, so replacing one does not replace the others.

Run `npm run db:migrate` on each target database to create `site_images` (migration 004). Raster uploads are decoded, stripped of metadata, resized to at most 2000px and encoded as WebP on the server; a maximum 2 MB per image is stored as PostgreSQL bytea. Built-in library choices only store an asset path. This works on local Node and Vercel without writing uploads to an ephemeral filesystem, provided DATABASE_URL points to a reachable PostgreSQL database with the migration installed. Back up the database to preserve uploaded photos. Storage counts towards your database provider's quota.

`/api/admin?action=images` and PATCH `action=image` require the existing admin session; writes require the same origin. `/api/site-images` exposes public display metadata or the public image bytes, not admin data. Defaults remain visible if the database or a replacement image cannot be loaded. No external image URLs, SVG uploads, videos or animated images are accepted. New photo placements should be added to `assets/media-slots.json` and tagged in their HTML.

Validation: `node --env-file-if-exists=.env scripts/check-media.cjs` against a disposable/local database and server (`TEST_BASE_URL`, default 5188). The integration test temporarily modifies the first Home slide, restores its previous record in finally, and removes its temporary administrator session. Run outside active editing sessions.
