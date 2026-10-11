---
title: Casus en eisen
description: De uitgangssituatie van Verbeek Logistiek en de eisen aan de nieuwe omgeving.
sidebar:
  order: 2
---

## Uitgangssituatie

Verbeek Logistiek (fictief) heeft 40 medewerkers op twee locaties. Alles draait op
één oude server: bestanden, accounts en de interne applicatie. Er is geen back-up
en geen scheiding tussen servers, werkplekken en gasten.

## Eisen

1. **Segmentatie**: management, servers, clients en DMZ zijn gescheiden netwerken
   met firewallregels ertussen.
2. **Identiteit**: centrale accounts en beleid, zonder afhankelijkheid van één server.
3. **Applicatie**: de interne webapplicatie is via TLS bereikbaar; de database is
   niet rechtstreeks vanaf de werkplekken te benaderen.
4. **Back-up**: er is een back-up waarvan de restore getest en de hersteltijd gemeten is.
5. **Monitoring**: uitval van een server of dienst geeft een melding.
6. **Herhaalbaarheid**: servers worden uitgerold en geconfigureerd met code, niet met de hand.

## Buiten scope

Het lab draait op VMware Workstation en niet op ESXi met vCenter. Daardoor vallen
vMotion, HA en distributed switches af. Met 32 GB RAM kunnen bovendien niet alle
VM's tegelijk draaien; de back-upserver en de Windows-client staan alleen aan
wanneer ze nodig zijn.
