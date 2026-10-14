// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// Repository heet SamSlaats.github.io, dus de site staat op de hoofdmap van dit adres.
// Kies je later een andere reponaam (bijv. "projecten"), voeg dan toe: base: '/projecten'
export default defineConfig({
  site: 'https://samslaats.github.io',
  integrations: [
    mermaid(),
    starlight({
      title: 'Sam Slaats',
      description: 'Infrastructuurprojecten: ontwerpkeuzes, bouwstappen en storingen.',
      locales: {
        root: { label: 'Nederlands', lang: 'nl' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/SamSlaats' },
      ],
      lastUpdated: true,
      // Eén donker thema: de keuze licht/donker van Starlight is uitgezet.
      components: {
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      customCss: ['@fontsource-variable/archivo/wdth.css', './src/styles/thema.css'],
      sidebar: [
        { label: 'Start', link: '/' },
        {
          label: 'Medica+ (enterprise wifi)',
          items: [{ autogenerate: { directory: 'medica-plus' } }],
        },
        {
          label: 'Microsoft 365-tenant (stage)',
          items: [{ autogenerate: { directory: 'm365-stage' } }],
        },
        {
          label: 'Verbeek Logistiek (VMware-lab)',
          // Volgorde: per pagina via `sidebar: order:` bovenin het bestand.
          // Conceptpagina's (draft: true) verdwijnen vanzelf bij publicatie.
          items: [{ autogenerate: { directory: 'verbeek-logistiek' } }],
        },
      ],
    }),
  ],
});
