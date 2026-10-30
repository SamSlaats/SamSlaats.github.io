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
De forest `verbeek.internal` staat op DC01, en DNS stuurt namen buiten het domein door naar
OPNsense. DC01 haalt zijn tijd van OPNsense. `dcdiag` op DC01 slaagt op alle tests. Open
op DC01: een waarschuwing van WinRM (10154) die niet verklaard is
([storing 5](/verbeek-logistiek/storingen/)), en beheer met RSAT vanaf een andere machine
is nog niet getest. Daarna DC02 bouwen, VLAN 30 en 40 inrichten, de regels voor Clients
invoeren, accounts en Group Policy.
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

**DC01**

- Netwerkkaart `00:0C:29:B3:DF:2F` op LAN segment `VLAN-20`, achter Ethernet3 van de switch.
  Op MAC-adres gecontroleerd. De test-VM hangt aan hetzelfde segment: in Workstation werkt
  een LAN segment als een hub, dus meerdere VM's delen één switchpoort.
- Vast adres 10.10.20.10/24 op `Ethernet0`.
- DNS-server van DC01 zelf: 127.0.0.1, door de promotie ingesteld. Daarvoor 10.10.20.1.
- VMware Tools geïnstalleerd. Alle tijdsynchronisatie van VMware staat uit in het
  `.vmx`-bestand, ook de eenmalige bij opstarten, hervatten en het terugzetten van een
  snapshot. Volgens beslissing 8 haalt DC01 zijn tijd alleen van OPNsense; VMware mag de
  klok niet tussendoor bijstellen.
- Tijdbron 10.10.20.1 (OPNsense), ingesteld met `w32tm /config /manualpeerlist:10.10.20.1
  /syncfromflags:manual /reliable:yes /update`. `/reliable:yes` maakt DC01 de betrouwbare
  tijdbron van het domein.
- Tijdzone `W. Europe Standard Time` (stond op Pacific, de standaard van de installatie).
- Forest en domein `verbeek.internal` (NetBIOS `VERBEEK`), aangemaakt met
  `Install-ADDSForest`, met DNS-rol. DC01 is Global Catalog en heeft de FSMO-rollen.
- Functioneel niveau van forest en domein: Windows Server 2016 (`WinThreshold`). Er bestaat
  geen niveau 2019 of 2022; 2016 is het hoogste dat Server 2022 kent.
- DNS-forwarder 10.10.20.1, door de wizard overgenomen van de DNS-instelling van vóór de
  promotie. Root hints uit (`Set-DnsServerForwarder -UseRootHint $false`): als OPNsense niet
  antwoordt, gaat de DC niet zelf naar internet. Zo loopt alle DNS via één punt (beslissing 6).

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
| 29 okt 2026 | `Install-ADDSForest` gaf een fout op `-DomainMode Win22` en `-ForestMode Win22`: die waarde bestaat niet. De foutmelding noemt de geldige waarden; het hoogste is `WinThreshold` (Server 2016). Daarmee opnieuw uitgevoerd en DC01 gepromoveerd tot eerste DC van `verbeek.internal`. |
| 29 okt 2026 | Root hints uitgezet op de DNS van DC01 en tijdbron ingesteld op 10.10.20.1. `w32tm /resync` meldde "no time data was available"; `w32tm /stripchart` naar 10.10.20.1 gaf wel antwoord met een afwijking van microseconden, dus NTP en de firewallregel werken. De tijdservice had nog geen meting gedaan. |
| 29 okt 2026 | `dcdiag`: SystemLog en DFSREvent failed. In het systeemlog stond dat de tijdservice de klok 32394 seconden (ongeveer 9 uur) had verzet, en de tijden in de logs liepen 8 uur achter: de tijdzone stond op Pacific. Tijdzone naar `W. Europe Standard Time`. Beide fouten komen waarschijnlijk van de tijdsprong en het opzetten van SYSVOL; `dcdiag` wordt na 24 uur opnieuw gedraaid om dat te bevestigen. |
| 30 okt 2026 | `dcdiag` faalt nog op SystemLog en DFSREvent. `dcdiag` kijkt naar de laatste 24 uur, dus oude fouten blijven meetellen. Events uit het systeemlog en DFS Replication bekeken: ze komen in twee groepen, gelijk met een opstart (29 okt 22:31 en 30 okt 21:27; `LastBootUpTime` 21:27:20). Zie het bewijs onder "Events na opstart" en [storing 5](/verbeek-logistiek/storingen/). |
| 30 okt 2026 | DNS-server van DC01 antwoordt op `_ldap._tcp.dc._msdcs.verbeek.internal` (SRV naar `dc01`, 10.10.20.10). De 1014-events horen daarmee bij de opstartvolgorde: DC01 gebruikt zichzelf als DNS en die service is net na de start nog niet klaar. |
| 30 okt 2026 | WinRM-waarschuwing 10154: de SPN `WSMAN/DC01` ontbreekt in `setspn -L DC01`. Na `Restart-Service WinRM` kwam de waarschuwing opnieuw, nu met foutcode 8344 in plaats van 1355. Oorzaak niet vastgesteld. `Test-WSMan DC01 -Authentication Kerberos` werkt lokaal. Bewust niet met `setspn` omzeild: een workaround verklaart niet waarom WinRM het zelf niet mag. Open punt. |
| 30 okt 2026 | `dcdiag` opnieuw: geen enkele test faalt. SystemLog en DFSREvent slagen, ook met 1014 en 10154 in het venster: dat zijn waarschuwingen, en daar faalt de test niet op. Welk event de tests eerder liet falen, is niet vastgesteld; het viel inmiddels buiten het venster. In de uitvoer staat ook een waarschuwing van de tijdservice om 21:31:57, vier minuten na de opstart: peer 10.10.20.1 onbereikbaar na 8 pogingen. Niet verklaard. |
| 30 okt 2026 | Na een suspend van de VM's liep DC01 1,5 uur achter (stripchart `+5455 s` naar OPNsense). `w32tm /resync` gaf "no time data was available"; om 23:31:09 heeft de tijdservice de klok zelf via NTP gecorrigeerd. Zie [storing 6](/verbeek-logistiek/storingen/). |

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

De forest na de promotie. Functioneel niveau 2016, DC01 is Global Catalog en houdt de rollen
Schema Master en Domain Naming Master:

```txt
PS C:\Users\Administrator> Get-ADForest

ApplicationPartitions : {DC=DomainDnsZones,DC=verbeek,DC=internal, DC=ForestDnsZones,DC=verbeek,DC=internal}
DomainNamingMaster    : DC01.verbeek.internal
Domains               : {verbeek.internal}
ForestMode            : Windows2016Forest
GlobalCatalogs        : {DC01.verbeek.internal}
Name                  : verbeek.internal
RootDomain            : verbeek.internal
SchemaMaster          : DC01.verbeek.internal
Sites                 : {Default-First-Site-Name}
```

DNS op DC01 stuurt door naar OPNsense:

```txt
PS C:\Users\Administrator> Get-DnsServerForwarder

UseRootHint        : True
Timeout(s)         : 3
EnableReordering   : True
IPAddress          : 10.10.20.1
ReorderedIPAddress : 10.10.20.1
```

DC01 bereikt de NTP-server op OPNsense, met een afwijking van microseconden:

```txt
PS C:\Users\Administrator> w32tm /query /source
10.10.20.1

PS C:\Users\Administrator> w32tm /stripchart /computer:10.10.20.1 /samples:3 /dataonly
Tracking 10.10.20.1 [10.10.20.1:123].
Collecting 3 samples.
The current time is 10/29/2026 12:21:21 AM.
00:21:21, -00.0000110s
00:21:23, +00.0000553s
00:21:25, +00.0000240s
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

### Events na opstart

Systeemlog, laatste 24 uur (Id 1014 en 10154), en DFS Replication:

```txt
10/29/2026 10:31:44 PM  1014
10/29/2026 10:31:44 PM  1014
10/29/2026 10:32:06 PM 10154
10/30/2026 9:27:42 PM   1014
10/30/2026 9:27:43 PM   1014
10/30/2026 9:28:04 PM  10154
DFS Replication: 29 okt 10:32:24 PM  2212 en 2214 (zelfde seconde)
```

De berichten van de laatste groep:

```txt
1014  Name resolution for the name _ldap._tcp.dc._msdcs.verbeek.internal. timed out after none of the configured DNS servers responded.
1014  Name resolution for the name wpad timed out after none of the configured DNS servers responded.
10154 The WinRM service failed to create the following SPNs: WSMAN/DC01.verbeek.internal; WSMAN/DC01.  The error received was 1355
```

Daarna, zonder herstart, antwoordt de SRV-record wel:

```txt
_ldap._tcp.dc._msdcs.verbeek.internal   SRV   600   Answer   dc01.verbeek.internal   0 100 389
```

`setspn -L DC01` toont onder meer `HOST/DC01`, `ldap/DC01` en `DNS/DC01.verbeek.internal`,
maar geen `WSMAN/...`. Na `Restart-Service WinRM` om 21:35:15 kwam 10154 opnieuw, met:

```txt
The error received was 8344
```

`Test-WSMan DC01 -Authentication Kerberos` geeft `OS: 10.0.20348` terug. Dit is een test
van DC01 naar DC01; vanaf een andere machine is het nog niet getest.

### dcdiag slaagt

`dcdiag | Select-String "failed"` geeft alleen de tekst van het WinRM-event terug, geen
`failed test`:

```txt
The WinRM service failed to create the following SPNs: WSMAN/DC01.verbeek.internal; WSMAN/DC01.
The WinRM service failed to create the following SPNs: WSMAN/DC01.verbeek.internal; WSMAN/DC01.
```

### Klok na suspend

```txt
w32tm /stripchart /computer:10.10.20.1 /samples:3 /dataonly
The current time is 10/30/2026 9:50:33 PM.
21:50:33, +5455.1327262s
```

DC01 gaf 21:50 aan terwijl het ongeveer 23:20 was. Na de correctie door de tijdservice:

```txt
Last Successful Sync Time: 10/30/2026 11:31:09 PM
Source: 10.10.20.1
```

De stripchart staat daarna op 0 en `Get-Date` loopt gelijk met de echte tijd.

## Wat niet in één keer werkte

Zie [storingen](/verbeek-logistiek/storingen/): storing 5 en 6 horen bij deze fase.
