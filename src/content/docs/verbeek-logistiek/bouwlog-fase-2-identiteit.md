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
Fase 2 is begonnen. De ontwerpkeuzes staan vast (beslissing 3 t/m 9) en de firewallregels
voor de DC's en de Windows-client zijn ontworpen. De regels voor Servers staan in OPNsense,
maar zijn nog niet getest: daarvoor moet DC01 er eerst zijn. Nog te doen: DC01 en DC02
bouwen, VLAN 30 en 40 inrichten, de regels voor Clients invoeren, accounts en Group Policy.
:::

## Ontwerp

De keuzes staan bij [Beslissingen](/verbeek-logistiek/beslissingen/), beslissing 3 t/m 9.
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

De regels voor Servers zijn op 28 okt ingevoerd, nog niet getest. De regels voor Clients
zijn nog alleen ontwerp. Elke regel staat op het interface waar het verkeer
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

**OPNsense: regels op Servers**

| Bron | Protocol | Doel | Doelpoort | Description |
|---|---|---|---|---|
| 10.10.20.10 | TCP/UDP | 10.10.20.1 | domain (53) | DC01 -> fw01 DNS |
| 10.10.20.20 | TCP/UDP | 10.10.20.1 | domain (53) | DC02 -> fw01 DNS |
| 10.10.20.10 | UDP | 10.10.20.1 | ntp (123) | DC01 -> fw01 NTP |
| 10.10.20.10 | TCP | `! Intern` | http (80) | DC01 -> WAN HTTP |
| 10.10.20.20 | TCP | `! Intern` | http (80) | DC02 -> WAN HTTP |
| 10.10.20.10 | TCP | `! Intern` | https (443) | DC01 -> WAN HTTPS |
| 10.10.20.20 | TCP | `! Intern` | https (443) | DC02 -> WAN HTTPS |
| 10.10.20.10 | ICMP | 10.10.20.1 | | DC01 -> fw01 ICMP |
| 10.10.20.20 | ICMP | 10.10.20.1 | | DC02 -> fw01 ICMP |

Alle regels: IPv4, richting `in`, bronpoort any.

## Logboek

| Datum | Wat |
|---|---|
| 24 okt 2026 | Ontwerpkeuzes fase 2 vastgelegd als beslissing 3 t/m 8 (#13). |
| 24 okt 2026 | Firewallregels voor de DC's en de Windows-client ontworpen (#14). Ontwerp, nog niet ingevoerd. |
| 28 okt 2026 | Regels voor Servers ingevoerd in OPNsense, per DC een eigen regel: DNS en ICMP naar 10.10.20.1, NTP vanaf DC01, HTTP en HTTPS naar `! Intern`. Nog niet getest. |
| 28 okt 2026 | Bij controle bleek dat de bronpoort ook ingevuld stond (`domain`, `ntp`, `http`, `https`). Een DC verstuurt vanaf een willekeurige hoge poort, dus die regels zouden nooit matchen. Bronpoort op any gezet; alleen de doelpoort is ingevuld. Twee regels stonden niet op richting `in`; gelijkgetrokken. |

## Bewijs

Nog niets: de regels voor Servers zijn ingevoerd, maar worden pas getest als DC01 draait.

## Wat niet in één keer werkte

Nog niets.
