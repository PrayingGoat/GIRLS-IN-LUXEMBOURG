# Girls in Luxembourg — direction visuelle

## Référence actuelle

Refonte du 16 octobre 2026 inspirée de [Lonely Girls Club](https://www.llgc.co.uk/). La référence a été examinée sur ordinateur et mobile : typographie, proportions, carrousel, collages inclinés et boutons à ombre décalée.

La palette rose fournie est conservée. L’accueil partage la largeur entre texte et photo. Sur mobile, la photo précède le texte. La navigation conserve son verre translucide.

## Typographie

- Instrument Serif : titres légers, environ 64 px dans l’accueil sur ordinateur, 44–49 px sur téléphone, 42–52 px pour les sections.
- Wix Madefor Text : corps de texte, comme sur la référence.
- Montserrat : navigation, boutons et légendes, comme sur la référence.
- La référence utilise Eighties Comeback Light pour ses titres. Instrument Serif est une alternative libre, pas cette police exacte.
- Polices WOFF2 locales, licences SIL OFL dans assets/. Aucun appel externe pour les polices des visiteurs.

## Images

Les huit photos de photos/ sont utilisées dans l’accueil, le récit, les clubs, les valeurs, la galerie et l’invitation. Les originaux restent inchangés. scripts/prepare-community-photos.cjs exporte deux tailles WebP (640 et 1400 px maximum), sans agrandissement.

Les portraits nominatifs, le logo, le drapeau et l’illustration « Community is strength » sont conservés. Les anciennes photos d’ambiance ne figurent plus dans la page principale.

## Interactions

- Trois photos : fondu automatique toutes les 2 secondes, avec commandes suivant/pr?c?dent. Le survol et le focus ne suspendent pas la lecture.
- Bandeau des valeurs en boucle continue, conformément à la demande précédente.
- Entrées dans le viewport, zoom au survol des cartes, rotations des tirages photo et boutons à ombre décalée.
- Animation au défilement de l’illustration conservée.
- Cinq cofondatrices en ligne sur ordinateur, grille adaptée sur tablette/mobile, sans carrousel pour l’équipe.
- Neuf fenêtres en verre conservées : fermeture à la croix, Échap et clic extérieur ; restauration du focus et de la position de défilement.
- Formulaires Notion intégrés à la demande, liens originaux disponibles en secours.

## Vérifications

scripts/check.cjs : huit largeurs, filtres, FAQ, menu, images, ancres, verre et contenu sans JavaScript.

scripts/check-gallery.cjs : lecture automatique, commandes, boucle, pause et mouvement réduit.

scripts/check-panels.cjs : ordre, contenu, clavier, focus, défilement, quatre largeurs et URL des formulaires. Le contrôle externe s’active avec TEST_LIVE_FORMS=1 ; aucune réponse n’est envoyée.
