---
title: 'Bouwlog fase 2: identiteit'
description: Twee domain controllers, accounts en Group Policy voor verbeek.internal.
draft: true
sidebar:
  order: 5.2
---

## Doel

Eis 2 uit de [casus](/verbeek-logistiek/casus/): centrale accounts en beleid, zonder
afhankelijkheid van één server. Twee domain controllers voor `verbeek.internal`, een
OU-structuur met accounts en groepen, en Group Policy die aantoonbaar wordt toegepast.

:::note[Stand van zaken]
Fase 2 is begonnen. De ontwerpkeuzes staan vast (beslissing 3 t/m 8) en de firewallregels
voor de DC's en de Windows-client zijn ontworpen. Nog niets is ingevoerd of getest. Nog te
doen: de regels invoeren, DC01 en DC02 bouwen, VLAN 30 en 40 inrichten, accounts en Group
Policy.
:::

## Ontwerp

De keuzes staan bij [Beslissingen](/verbeek-logistiek/beslissingen/), beslissing 3 t/m 8.
Kort:

| Onderdeel | Keuze |
|---|---|
| Domein | `verbeek.internal` |
| Domain controllers | Windows Server 2022 Server Core: DC01 op 10.10.20.10, DC02 op 10.10.20.20 |
| Beheer | RSAT op de Windows-client in VLAN 30 |
| DNS | DC's doen `verbeek.internal` en sturen de rest door naar Unbound op OPNsense (10.10.20.1) |
| DHCP | Blijft op OPNsense (Dnsmasq); optie 6 met de DC's op Servers en Clients |
| Tijd | DC01 haalt tijd van OPNsense; de rest volgt het domein |

## Firewallregels

**Ontwerp, nog niet ingevoerd.** Elke regel staat op het interface waar het verkeer
binnenkomt. OPNsense blokkeert alles waar geen pass-regel voor is, dus wat dicht moet
blijven heeft geen eigen regel nodig; dat wordt met een negatieve test aangetoond.

`intern` is een alias voor 10.10.0.0/16, alle VLAN's van het lab. `! intern` betekent alles
behalve die adressen: alleen internet.

**Servers (VLAN 20)**

| Bron | Doel | Protocol/poort | Waarom |
|---|---|---|---|
| DC01 en DC02 | OPNsense | TCP/UDP 53 | DNS voor namen buiten het domein, doorgestuurd naar Unbound |
| DC01 | OPNsense | UDP 123 | NTP: DC01 haalt de tijd voor het hele domein |
| DC01 en DC02 | `! intern` | TCP 80 | HTTP voor Windows-updates |
| DC01 en DC02 | `! intern` | TCP 443 | HTTPS voor Windows-updates |
| DC01 en DC02 | 10.10.20.1 | ICMP | Ping naar de gateway; vervangt de tijdelijke regel naar `This Firewall` (#11) |

Verkeer tussen DC01 en DC02 zit binnen VLAN 20 en komt niet langs de firewall: daar is
geen regel voor nodig.

**Clients (VLAN 30)**

| Bron | Doel | Protocol/poort | Waarom |
|---|---|---|---|
| Clients | DC01 en DC02 | TCP/UDP 88 | Kerberos: aanmelden in het domein |
| Clients | DC01 en DC02 | TCP/UDP 53 | DNS: namen opzoeken, ook de DC's zelf |
| Clients | DC01 en DC02 | TCP/UDP 389 | LDAP: opzoeken in AD (gebruikers, groepen, computers, welke GPO's gelden) |
| Clients | DC01 en DC02 | TCP 445 | SMB: SYSVOL en NETLOGON, waar de GPO's en aanmeldscripts staan |
| Clients | DC01 en DC02 | TCP 135, TCP 49152-65535 | RPC: nodig voor de domain join en de RSAT-tools |
| Clients | DC01 en DC02 | UDP 123 | NTP: clients in het domein halen de tijd van de DC's |
| Clients | DC01 en DC02 | TCP 5985 | WinRM: beheer op afstand met PowerShell en Server Manager |

**Wat dicht moet blijven**

| Van | Naar | Waarom | Test |
|---|---|---|---|
| Clients (VLAN 30) | Management (VLAN 10) | Werkplekken hebben niets te zoeken bij de beheersystemen | Ping en SSH naar de beheer-VM mislukken |
| DMZ (VLAN 40) | Intern (VLAN 10, 20, 30) | Een gehackte DMZ-machine mag niet verder het interne netwerk in | Ping naar een DC en SSH naar de beheer-VM mislukken |

## Wat ik gebouwd heb

Nog niets.

## Logboek

| Datum | Wat |
|---|---|
| 24 okt 2026 | Ontwerpkeuzes fase 2 vastgelegd als beslissing 3 t/m 8 (#13). |
| 24 okt 2026 | Firewallregels voor de DC's en de Windows-client ontworpen (#14). Ontwerp, nog niet ingevoerd. |

## Bewijs

Nog niets: de regels zijn alleen ontworpen.

## Wat niet in één keer werkte

Nog niets.
