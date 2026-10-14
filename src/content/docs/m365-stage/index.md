---
title: Microsoft 365-tenant vanaf nul
description: Een volledige Microsoft 365-omgeving ingericht voor een fictief bedrijf, als stageopdracht. Identiteit, Exchange, Intune, Defender en Azure.
sidebar:
  label: Overzicht
  order: 1
---

Tijdens mijn stage bij een IT-dienstverlener heb ik samen met een medestudent een
Microsoft 365-omgeving vanaf nul ingericht. Het stagebedrijf wilde een omgeving waarin
het nieuwe configuraties kon uitproberen zonder de omgeving van een klant te raken. Het
bedrijf in de tenant, IctiCorp, is fictief; de tenant zelf was een echte
ontwikkeltenant uit het Microsoft 365 Developer Program, met E5-licenties.

| | |
|---|---|
| **Status** | Afgerond, de tenant is inmiddels verlopen |
| **Periode** | Voorjaar 2026, 180 uur |
| **Herkomst** | Stageopdracht, samen met een medestudent |
| **Mijn deel** | Afdelingen Engineering, Facilitair, HR en Sales, en de onderdelen hieronder |

## Wat ik heb ingericht

| Onderdeel | Wat | Aangetoond |
|---|---|---|
| Entra ID | 12 gebruikers in 4 afdelingsgroepen, MFA voor iedereen, licenties via een groep | Alle gebruikers op MFA *enforced* met de Authenticator-app |
| Exchange Online | Gedeelde mailbox per afdeling, 4 vergaderruimtes met boekingsregels | Testmail kwam binnen in de gedeelde mailbox; ruimte weigert afspraken die buiten de regels vallen |
| SharePoint en Teams | Per afdeling een site met een gekoppeld team | Sites en teams aangemaakt |
| Azure | Lijst met toegestane landen voor geo-blocking; een intern dashboard als App Service, alleen bereikbaar met een bedrijfsaccount | Dashboard draaide en vroeg om inloggen |
| Intune en Autopilot | Office, Bedrijfsportal, VMware Tools en een vaste achtergrond uitgerold; Autopilot met voortgangsscherm | Laptops ingericht met alleen inloggen |
| Defender en beveiliging | Apparaten aangesloten op Defender for Endpoint, aanbevelingen doorgevoerd, BitLocker verplicht, USB-opslag geblokkeerd | Apparaten zichtbaar in Defender |

## Wat buiten mijn bouw viel

Een deel van de wensen is niet uitgevoerd: toegang met een MacBook of privételefoon,
Azure Virtual Desktop, YubiKeys, toegang alleen via VPN, en het automatisch blokkeren van
inactieve accounts. Ook de afdelingen van mijn medestudent beschrijf ik hier niet.

Begin bij de [casus en eisen](/m365-stage/casus/).
