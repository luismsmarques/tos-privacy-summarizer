# Landing page — tos.atlasinvencivel.pt

Redesign da landing (design "Calm greens" do Claude). HTML estático, sem build.

## Publicar
Substituir o conteúdo da raiz do site (`tos.atlasinvencivel.pt`) por estes ficheiros.
Mantém: `privacy-policy.html`, `terms-of-service.html`, `manifest.webmanifest`,
`robots.txt`, `sitemap.xml`.

## Notas
- CTAs de instalação apontam para a Chrome Web Store real
  (`…/detail/cknkibclkdgjhmokdnddbbenjlfkbabi`) e têm classe `install-btn`
  para o tracking de `assets/js/install-tracker.js`.
- Favicon e logo: `assets/images/logo.svg` (escudo verde, novo ícone).
- OG image: `assets/images/og-image.png` (promo da store).
- SEO/OG/Twitter/schema.org no `<head>`; canonical `https://tos.atlasinvencivel.pt/`.
- Responsivo (desktop + mobile).
- Idioma: **EN** (o design é em inglês). O i18n multilíngue (PT/ES/FR) do site
  antigo pode ser re-aplicado por cima desta estrutura como passo seguinte.
