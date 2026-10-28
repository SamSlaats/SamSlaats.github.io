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
voor de DC's en de Windows-client zijn ontworpen. De regels voor Servers staan in OPNsense en
zijn getest: DC01 bereikt de gateway en DNS via OPNsense, een machine zonder regel niet.
DC01 heeft een vast adres, maar AD DS staat er nog niet op. Nog te doen: de forest aanmaken,
DC02 bouwen, VLAN 30 en 40 inrichten, de regels voor Clients invoeren, accounts en Group
Policy.
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

De regels voor Servers zijn op 28 okt ingevoerd en getest. De regels voor Clients
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

**DC01** (nog zonder AD DS)

- Netwerkkaart `00:0C:29:B3:DF:2F` op LAN segment `VLAN-20`, achter Ethernet3 van de switch.
  Op MAC-adres gecontroleerd. De test-VM hangt aan hetzelfde segment: in Workstation werkt
  een LAN segment als een hub, dus meerdere VM's delen één switchpoort.
- Vast adres 10.10.20.10/24 op `Ethernet0`.
- DNS-server 10.10.20.1 (Unbound op OPNsense). Bij het aanmaken van de forest wordt dit de
  forwarder; daarna wijst DC01 naar zichzelf.
- VMware Tools geïnstalleerd. Alle tijdsynchronisatie van VMware staat uit in het
  `.vmx`-bestand, ook de eenmalige bij opstarten, hervatten en het terugzetten van een
  snapshot. Volgens beslissing 8 haalt DC01 zijn tijd alleen van OPNsense; VMware mag de
  klok niet tussendoor bijstellen.
- Tijdbron nu nog `Local CMOS Clock`. Na het aanmaken van de forest wordt dat OPNsense.

## Logboek

| Datum | Wat |
|---|---|
| 24 okt 2026 | Ontwerpkeuzes fase 2 vastgelegd als beslissing 3 t/m 8 (#13). |
| 24 okt 2026 | Firewallregels voor de DC's en de Windows-client ontworpen (#14). Ontwerp, nog niet ingevoerd. |
| 28 okt 2026 | Regels voor Servers ingevoerd in OPNsense, per DC een eigen regel: DNS en ICMP naar 10.10.20.1, NTP vanaf DC01, HTTP en HTTPS naar `! Intern`. Nog niet getest. |
| 28 okt 2026 | Bij controle bleek dat de bronpoort ook ingevuld stond (`domain`, `ntp`, `http`, `https`). Een DC verstuurt vanaf een willekeurige hoge poort, dus die regels zouden nooit matchen. Bronpoort op any gezet; alleen de doelpoort is ingevuld. Twee regels stonden niet op richting `in`; gelijkgetrokken. |
| 28 okt 2026 | Tijdelijke regel uit fase 1 (ICMP van `Servers net` naar `This Firewall`) verwijderd. ICMP op Servers mag nu alleen nog van DC01 en DC02 naar 10.10.20.1 (#11). |
| 28 okt 2026 | Getest. De test-VM (DHCP-adres, geen regel) pingt 10.10.20.1 niet meer; DC01 wel. |
| 28 okt 2026 | `Resolve-DnsName google.com` op DC01 liep in een time-out. Met `-Server 10.10.20.1` kwam er wel antwoord, dus de firewall en Unbound werkten. `Get-DnsClientServerAddress` liet zien dat op `Ethernet0` geen DNS-server stond. 10.10.20.1 ingesteld; daarna werkt het. |
| 28 okt 2026 | VMware Tools geïnstalleerd op DC01 en alle tijdsynchronisatie van VMware uitgezet in het `.vmx`-bestand. `w32tm /query /source` geeft `Local CMOS Clock`. |
| 29 okt 2026 | Netwerkkaart van DC01 op MAC-adres gecontroleerd: `000c.29b3.df2f` staat op Ethernet3 in VLAN 20, gelijk aan het MAC-adres in Workstation. |

## Bewijs

Een machine in VLAN 20 zonder eigen regel komt niet meer bij de firewall: de test-VM
(adres via DHCP) pingt 10.10.20.1 zonder antwoord. Daarmee is ook bewezen dat de tijdelijke
regel uit fase 1 weg is.

```txt
root@ubuntu-server:/# ping 10.10.20.1
PING 10.10.20.1 (10.10.20.1) 56(84) bytes of data.
^C
--- 10.10.20.1 ping statistics ---
12 packets transmitted, 0 received, 100% packet loss, time 11242ms
```

DC01 staat op 10.10.20.10 en pingt de gateway wel:

```txt
PS C:\Users\Administrator> Get-NetIPAddress -InterfaceAlias Ethernet0 -AddressFamily IPv4

IPAddress         : 10.10.20.10
InterfaceAlias    : Ethernet0
PrefixLength      : 24
PrefixOrigin      : Manual

PS C:\Users\Administrator> ping 10.10.20.1
Reply from 10.10.20.1: bytes=32 time=1ms TTL=64
Reply from 10.10.20.1: bytes=32 time=1ms TTL=64
Reply from 10.10.20.1: bytes=32 time=1ms TTL=64
Reply from 10.10.20.1: bytes=32 time=2ms TTL=64
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
```

DNS van DC01 via OPNsense, na het instellen van de DNS-server:

```txt
PS C:\Users\Administrator> Get-DnsClientServerAddress -AddressFamily IPv4
InterfaceAlias               Interface Address ServerAddresses
                             Index     Family
--------------               --------- ------- ---------------
Ethernet0                            6 IPv4    {10.10.20.1}

PS C:\Users\Administrator> Resolve-DnsName google.com
Name                                           Type   TTL   Section    IPAddress
----                                           ----   ---   -------    ---------
google.com                                     AAAA   186   Answer     2a00:1450:400e:808::200e
google.com                                     A      186   Answer     142.251.209.238
```

De netwerkkaart van DC01 (`00:0C:29:B3:DF:2F` in Workstation) staat op Ethernet3 in VLAN 20,
naast de test-VM:

```txt
Vlan    Mac Address       Type        Ports      Moves   Last Move
----    -----------       ----        -----      -----   ---------
  20    000c.29b3.df2f    DYNAMIC     Et3        1       0:15:20 ago
  20    000c.29cb.bff4    DYNAMIC     Et3        1       0:15:49 ago
```

Tijdsynchronisatie van VMware uit, in het `.vmx`-bestand van DC01:

```txt
tools.syncTime = "FALSE"
time.synchronize.continue = "FALSE"
time.synchronize.restore = "FALSE"
time.synchronize.resume.disk = "FALSE"
time.synchronize.shrink = "FALSE"
time.synchronize.tools.startup = "FALSE"
```

## Wat niet in één keer werkte

Nog niets.
