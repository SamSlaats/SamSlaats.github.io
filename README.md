# Projecten

Bron van https://samslaats.github.io, gebouwd met Astro Starlight.

- `npm install` eenmalig na het klonen
- `npm run dev` start de site lokaal op http://localhost:4321
- `npm run build` bouwt de site zoals GitHub dat doet

Pagina's staan in `src/content/docs/`. Een pagina met `draft: true` is lokaal
zichtbaar maar wordt niet gepubliceerd. Sjablonen staan in `sjablonen/`.

Nieuwe bouwlogpagina: kopieer `sjablonen/bouwlog.md` naar
`src/content/docs/verbeek-logistiek/bouwlog-fase-N-onderwerp.md`.

## Cijfers van het lab

VLAN's, machines, geheugen en de stand per fase staan in `src/data/lab.ts`. De startpagina
en de pagina Ontwerp lezen daaruit, dus je past het op één plek aan. Zet `gebouwd: true`
zodra een machine echt draait en werk `bijgewerkt` bij.

Het uiterlijk staat in `src/styles/thema.css`.
