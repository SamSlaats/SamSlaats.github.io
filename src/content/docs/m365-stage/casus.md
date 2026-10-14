---
title: Casus en eisen
description: Waarom het stagebedrijf een eigen testtenant wilde, en welke eisen we meekregen.
sidebar:
  order: 2
---

Het stagebedrijf, een IT-dienstverlener, had geen eigen omgeving meer om Microsoft
365-configuraties te testen. Een eigen tenant, vanaf nul ingericht als een gewoon bedrijf,
lost dat op: nieuwe instellingen kunnen eerst daar, en pas daarna bij een klant.

## Aanpak

1. **Intake.** Met drie medewerkers van het stagebedrijf hebben we het fictieve bedrijf
   uitgewerkt: afdelingen, apparaten, buitenlandse medewerkers, eisen aan beveiliging en
   logging.
2. **Plan van aanpak.** Taakverdeling, welke portals we inrichten, risico's en planning.
   De uren hielden we bij in ClickUp.
3. **Tenant en domein.** Een ontwikkeltenant via het Microsoft 365 Developer Program, en
   een eigen domein met de DNS bij Cloudflare.
4. **Inrichten per portal**, elk voor de eigen afdelingen.

## Eisen

- Acht afdelingen, verdeeld over ons tweeën. Mijn deel: Engineering, Facilitair, HR en Sales.
- Iedere medewerker heeft een Windows-laptop en een werktelefoon.
- MFA voor alle gebruikers.
- Inloggen alleen vanuit tien toegestane landen.
- Laptops moeten beheerd zijn, bijgewerkt, en antivirus aan hebben om bij bedrijfsgegevens te komen.
- Geen externe opslag op de laptops.
- Mislukte en geslaagde inlogpogingen worden gelogd.
- Een testomgeving op een virtuele machine in Azure.

## Wensen

- Toegang met een MacBook en met privételefoons
- Azure Virtual Desktop
- Inloggen met een YubiKey
- Bedrijfsapplicaties alleen bereikbaar via VPN of vanaf kantoor
- Accounts automatisch blokkeren na 20 dagen inactiviteit, met een herinnering na 15 dagen

Deze wensen zijn niet uitgevoerd.
