---
title: 'Bouwlog fase 1: netwerk'
description: Firewall, managed switch en VLAN's werkend krijgen.
sidebar:
  order: 5.1
---

## Doel

Het doel van deze log is het aantonen van het inrichten van een netwerk doormiddel van VLAN tagging/trunking, managed switch en het gebruik maken van OPNsense.

:::note[Stand van zaken]
Fase 1 is klaar. De trunk tussen OPNsense en de switch werkt, en VLAN 10 t/m 40 staan op
beide apparaten. De beheer-VM in VLAN 10 bereikt OPNsense, de switch en internet. In
VLAN 20 is de hele keten getest: een VM achter Ethernet3 krijgt een adres via DHCP en
pingt OPNsense. DHCP en regels voor Clients en DMZ komen in de fase waarin die VLAN's hun
eerste machines krijgen, samen met de echte regels tussen de VLAN's.
:::

## Wat ik gebouwd heb

VMware Workstation heeft geen managed switch. Daarom draait de switch als VM: Arista
vEOS. De bekabeling doe ik met LAN segments in Workstation. Elk segment is een losse
virtuele kabel zonder eigen instellingen; de VLAN's zelf bestaan alleen op OPNsense en
op de switch.

| Segment | Verbindt | Verkeer |
|---|---|---|
| `Trunk` | OPNsense `em0` met switch Ethernet1 | VLAN 10 t/m 40, getagd |
| Eén per VLAN, zoals `VLAN-10` | Switch Ethernet2 t/m 4 met de VM's in dat VLAN | Ongetagd |
| NAT | OPNsense `em1` met het netwerk van de host | Internet |

**OPNsense 26.7**

- WAN op `em1`, adres via DHCP van het NAT-netwerk van Workstation.
- VLAN 10 als `em0_vlan10` op `em0`, toegewezen als LAN, met 10.10.10.1/24.
- VLAN 20, 30 en 40 als `em0_vlan20` t/m `em0_vlan40` (OPT1 t/m OPT3), met 10.10.20.1,
  10.10.30.1 en 10.10.40.1 (/24).
- Elke interface heeft een description gelijk aan de VLAN-naam: Management (`lan`),
  Servers (`opt1`), Clients (`opt2`) en DMZ (`opt3`). Alleen de description is aan te
  passen; regels en DHCP verwijzen naar de interne naam tussen haakjes.
- `em0` zelf heeft geen adres; die draagt alleen de VLAN's.
- DHCP via Dnsmasq op Management en Servers. Servers deelt 10.10.20.100 t/m
  10.10.20.200 uit; de adressen daaronder blijven vrij voor de servers met een vast adres.
- Op Servers één tijdelijke regel: ICMP van `Servers net` naar `This Firewall`, voor de
  test in VLAN 20. Die gaat weg zodra de echte regels tussen de VLAN's er staan.

**Arista vEOS-lab 4.36.1F (32-bit)**

- Opstartlader Aboot 8.0.3 als IDE-cd-rom, het image als IDE-schijf.
- Zero Touch Provisioning uitgezet, hostnaam `sw01`.
- VLAN 10 (management), 20 (servers), 30 (clients) en 40 (dmz) aangemaakt.
- Ethernet1 als trunk voor VLAN 10 t/m 40.
- Ethernet2 als access-poort in VLAN 10, voor de beheer-VM.
- Ethernet3 als access-poort in VLAN 20.
- VLAN 999 (`ongebruikt`) als native VLAN op Ethernet1. Er zitten geen poorten in en het
  heeft geen adres; zie [Beslissingen](/verbeek-logistiek/beslissingen/).
- Ethernet2 heeft de description `beheer-vm`. Ethernet4 is niet in gebruik en staat uit.
- `interface Vlan10` met 10.10.10.2/24 als beheeradres.
- De eerste netwerkkaart van de VM is Management1 en hangt niet aan de trunk.

Workstation noemt de netwerkkaarten Network Adapter 1 t/m 5, vEOS noemt ze Management1
en Ethernet1 t/m 4. Omdat Management1 de eerste kaart is, schuift alles één op. De
vertaling, gecontroleerd op MAC-adres (`show interfaces | include ^Eth|address` tegen
Advanced in Workstation):

| Workstation | MAC | vEOS | LAN segment |
|---|---|---|---|
| Network Adapter 1 | `00:0C:29:64:81:84` | Management1 | geen |
| Network Adapter 2 | `00:0C:29:64:81:8E` | Ethernet1 | `Trunk` |
| Network Adapter 3 | `00:0C:29:64:81:98` | Ethernet2 | `VLAN-10` |
| Network Adapter 4 | `00:0C:29:64:81:A2` | Ethernet3 | `VLAN-20` |
| Network Adapter 5 | `00:0C:29:64:81:AC` | Ethernet4 | losgekoppeld (poort staat uit) |

**Beheer-VM: Ubuntu 26.04 LTS**

- Hostnaam `Beheer`, netwerkkaart `ens33` op LAN segment `VLAN-10` (Ethernet2 van de switch).
- Vast adres 10.10.10.20/24, gateway en DNS-server 10.10.10.1 (Unbound op OPNsense).
- Doel: de webinterface van OPNsense beheren vanuit VLAN 10.

**Test-VM: Ubuntu Server**

- 2 GB RAM, netwerkkaart `ens33` (MAC `00:0C:29:CB:BF:F4`) op LAN segment `VLAN-20`
  (Ethernet3 van de switch).
- Adres via DHCP. Alleen voor tests: hij blijft bestaan zodat de test na een wijziging aan
  switch of firewall te herhalen is. De echte servers in VLAN 20 krijgen een vast adres.

## Logboek

| Datum | Wat |
|---|---|
| 12 okt 2026 | vEOS-lab gedownload (`.vmdk` plus Aboot-ISO). Eerste start mislukt: Aboot vindt de schijf niet. Opgelost door de schijf als IDE aan te sluiten. |
| 13 okt 2026 | Switch ingericht: ZTP uit, VLAN's, trunk op Ethernet1, Vlan10 met 10.10.10.2. |
| 13 okt 2026 | OPNsense en switch kunnen elkaar niet pingen. Zoektocht gestart; drie oorzaken gevonden en opgelost, maar nog steeds geen verbinding. |
| 14 okt 2026 | Echte oorzaak gevonden: Ethernet1 en Management1 zaten in Workstation op elkaars segment. Omgezet; de switch pingt OPNsense. |
| 14 okt 2026 | VLAN 20, 30 en 40 op OPNsense toegevoegd. Beide machines herstart: de configuratie blijft bewaard. |
| 15 okt 2026 | VLAN-interfaces willen benoemen (OPT1 t/m OPT3 naar Servers, Clients en DMZ). Het consolemenu van OPNsense heeft daar geen optie voor; het kan alleen in de webinterface. Die is vanaf de host niet bereikbaar, omdat de firewall de webinterface op WAN blokkeert. |
| 15 okt 2026 | Begonnen aan een beheer-VM in VLAN 10: Ubuntu, `beheer`. Vanaf hier beheer ik OPNsense via de browser. Ethernet2 op de switch als access-poort in VLAN 10 gezet. |
| 15 okt 2026 | Beheer-VM draait. Ping naar 10.10.10.1 (OPNsense), 10.10.10.2 (switch) en 8.8.8.8 lukt; de webinterface van OPNsense opent. Ping naar `google.com` mislukt: naamomzetting werkt nog niet. |
| 15 okt 2026 | Oorzaak: op de beheer-VM stond geen DNS-server ingesteld. 10.10.10.1 (Unbound op OPNsense) ingesteld; ping naar `google.com` lukt. Bewust niet 8.8.8.8: alle machines vragen namen op via OPNsense, en in fase 2 via de DC's. |
| 15 okt 2026 | MAC-adres van de beheer-VM gecontroleerd: de netwerkkaart hing aan segment `VLAN-40` in plaats van `VLAN-10`. Omgezet. Switchconfiguratie opgeslagen met `write memory`. |
| 15 okt 2026 | Beheer-VM van DHCP-lease (10.10.10.194) omgezet naar vast adres 10.10.10.20, zodat de beheerplek ook werkt als DHCP niet werkt. |
| 17 okt 2026 | Via de webinterface vanaf de beheer-VM de descriptions ingesteld: Management, Servers, Clients en DMZ. LAN als laatste, omdat de beheer-VM daaraan hangt. De webinterface bleef daarna bereikbaar. |
| 23 okt 2026 | Switch opgeschoond: VLAN 999 `ongebruikt` aangemaakt en als native VLAN op Ethernet1 gezet, Ethernet4 uitgezet. Ethernet2 bleef aan: daar zit de beheer-VM. Doorgevoerd met een config session met `commit timer`; daarna bevestigd en opgeslagen met `write memory`. Onderbouwing bij [Beslissingen](/verbeek-logistiek/beslissingen/). |
| 23 okt 2026 | DHCP op Servers aangezet in Dnsmasq, met range 10.10.20.100 t/m 10.10.20.200. Tijdelijke regel voor ICMP van `Servers net` naar `This Firewall` gemaakt. Die kwam eerst onder floating rules terecht, zonder interface; omgezet naar alleen Servers, zodat hij straks niet voor de echte regels op Servers gaat. |
| 23 okt 2026 | Test-VM in VLAN 20 krijgt geen DHCP-adres. Op Ethernet3 kwam niets binnen: in Workstation zaten Ethernet3 en Ethernet4 op elkaars segment (adapter 4 op `VLAN-30`, adapter 5 op `VLAN-20`). Ontstaan doordat Management1 bij het ontwerp niet was meegeteld. Adapter 4 op `VLAN-20` gezet, adapter 5 losgekoppeld. |
| 23 okt 2026 | Daarna kwamen de DHCP-aanvragen wel aan op OPNsense (packet capture op `em0` en op Servers), maar er ging geen antwoord terug. Opgelost na een herstart van de VM's; de precieze oorzaak is niet vastgesteld. Zie [Storingen en herstel](/verbeek-logistiek/storingen/). |
| 23 okt 2026 | End-to-end test geslaagd: de test-VM krijgt 10.10.20.184 via DHCP en pingt 10.10.20.1. De switch ziet de VM op Ethernet3 in VLAN 20. |

## Bewijs

De switch: Ethernet1 is een trunk en laat VLAN 10 t/m 40 toe.

```txt
sw01>show interfaces trunk
Port          Mode         Status         Native vlan
Et1           trunk        trunking       1

Port          Vlans allowed
Et1           10,20,30,40

Port          Vlans allowed and active in management domain
Et1           10,20,30,40
```

Na het opschonen op 23 okt is de native VLAN van Ethernet1 VLAN 999. De toegestane
VLAN's zijn niet veranderd:

```txt
sw01#show interfaces Ethernet1 switchport
Name: Et1
Administrative Mode: trunk
Operational Mode: trunk
Trunking Native Mode VLAN: 999 (ongebruikt)
Administrative Native VLAN tagging: disabled
Trunking VLANs Enabled: 10,20,30,40
```

Ethernet4 staat uit, Ethernet2 heeft een description:

```txt
sw01#show interfaces status
Port       Name                    Status       Vlan     Duplex Speed  Type
Et1        trunk naar OPNsense     connected    trunk    full   1G     EbraTestPhyPort
Et2        beheer-vm               connected    10       full   1G     EbraTestPhyPort
Et3        naar servers-segment    connected    20       full   1G     EbraTestPhyPort
Et4                                disabled     1        full   1G     EbraTestPhyPort
Ma1                                notconnect   routed   auto   auto   10/100/1000
```

OPNsense verstuurt de ARP-aanvraag getagd in VLAN 10:

```txt
00:0c:29:86:a5:8c > ff:ff:ff:ff:ff:ff, ethertype 802.1Q (0x8100), length 46: vlan 10, p 0,
ethertype ARP (0x0806), Request who-has 10.10.10.2 tell 10.10.10.1, length 28
```

De switch leert het MAC-adres van OPNsense (`em0`) op Ethernet1, in VLAN 10:

```txt
sw01>show mac address-table
Vlan    Mac Address       Type        Ports      Moves   Last Move
----    -----------       ----        -----      -----   ---------
  10    000c.2986.a58c    DYNAMIC     Et1        1       0:00:24 ago
```

De ontvangsttellers van Ethernet1 lopen op (eerder stonden ze op 0):

```txt
Port      InOctets    InUcastPkts    InMcastPkts    InBcastPkts
Et1            674              6              0              0
```

Na een herstart staan alle VLAN's nog op de switch:

```txt
sw01#show vlan
VLAN  Name          Status    Ports
----- ------------- --------- -------------------------------
1     default       active    Et2, Et4
10    management    active    Cpu, Et1
20    servers       active    Et1, Et3
30    clients       active    Et1
40    dmz           active    Et1
```

De switch pingt OPNsense over de trunk, in VLAN 10:

```txt
sw01#ping 10.10.10.1
PING 10.10.10.1 (10.10.10.1) 72(100) bytes of data.
80 bytes from 10.10.10.1: icmp_seq=1 ttl=64 time=2.16 ms
80 bytes from 10.10.10.1: icmp_seq=2 ttl=64 time=0.653 ms
80 bytes from 10.10.10.1: icmp_seq=3 ttl=64 time=0.609 ms
80 bytes from 10.10.10.1: icmp_seq=4 ttl=64 time=0.587 ms
80 bytes from 10.10.10.1: icmp_seq=5 ttl=64 time=0.737 ms

--- 10.10.10.1 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 8ms
rtt min/avg/max/mdev = 0.587/0.949/2.161/0.607 ms, ipg/ewma 2.062/1.536 ms
```

De interfaces in OPNsense (Interfaces → Overview), met hun nieuwe description. WAN is
weggelaten.

| Interface | Device | VLAN | Type | IPv4 |
|---|---|---|---|---|
| Management (`lan`) | `em0_vlan10` | 10 | static | 10.10.10.1/24 |
| Servers (`opt1`) | `em0_vlan20` | 20 | static | 10.10.20.1/24 |
| Clients (`opt2`) | `em0_vlan30` | 30 | static | 10.10.30.1/24 |
| DMZ (`opt3`) | `em0_vlan40` | 40 | static | 10.10.40.1/24 |

DHCP-ranges in Dnsmasq (Services → Dnsmasq DNS & DHCP → DHCP ranges). Dnsmasq luistert
op Management en Servers.

| Interface | Start | Eind | Description |
|---|---|---|---|
| Servers | 10.10.20.100 | 10.10.20.200 | Servers dynamisch |

De tijdelijke regel op Servers (Firewall → Rules):

| Interface | Richting | Protocol | Bron | Doel | Description |
|---|---|---|---|---|---|
| Servers | in | IPv4 ICMP | `Servers net` | `This Firewall` | TIJDELIJK #2: ICMP-test, opruimen bij inter-VLAN-regels |

De beheer-VM in VLAN 10: adres, DNS-server en bereikbaarheid van OPNsense, de switch en
internet op naam. `ip -br a` en de ping naar `google.com` zijn gemeten na de overstap naar
10.10.10.20; de overige uitvoer is van de eerste DHCP-lease.

```txt
gebruiker@Beheer:~$ ip -br a
lo               UNKNOWN        127.0.0.1/8 ::1/128
ens33            UP             10.10.10.20/24 fe80::20c:29ff:fe38:6a7f/64

gebruiker@Beheer:~$ resolvectl
Link 2 (ens33)
    Current Scopes: DNS
Current DNS Server: 10.10.10.1
       DNS Servers: 10.10.10.1
        DNS Domain: internal

gebruiker@Beheer:~$ ping 10.10.10.1
3 packets transmitted, 3 received, 0% packet loss, time 2003ms

gebruiker@Beheer:~$ ping 10.10.10.2
3 packets transmitted, 3 received, 0% packet loss, time 2003ms

gebruiker@Beheer:~$ ping google.com
PING google.com (142.250.27.102) 56(84) bytes of data.
64 bytes from ra-in-f102.1e100.net (142.250.27.102): icmp_seq=1 ttl=127 time=18.9 ms
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
```

De end-to-end test in VLAN 20: de test-VM achter Ethernet3 krijgt een adres via DHCP en
pingt OPNsense. Daarmee werkt de hele keten: VM, access-poort Ethernet3 (VLAN 20), trunk
Ethernet1, OPNsense.

```txt
root@ubuntu-server:/# ip -br a
lo               UNKNOWN        127.0.0.1/8 ::1/128
ens33            UNKNOWN        10.10.20.184/24 metric 100 fe80::20c:29ff:fecb:bff4/64

root@ubuntu-server:/# ip link show ens33
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UNKNOWN mode DEFAULT group default qlen 1000
    link/ether 00:0c:29:cb:bf:f4 brd ff:ff:ff:ff:ff:ff

root@ubuntu-server:/# ping -c 4 10.10.20.1
PING 10.10.20.1 (10.10.20.1) 56(84) bytes of data.
64 bytes from 10.10.20.1: icmp_seq=1 ttl=64 time=3.08 ms
64 bytes from 10.10.20.1: icmp_seq=2 ttl=64 time=3.28 ms
64 bytes from 10.10.20.1: icmp_seq=3 ttl=64 time=3.14 ms
64 bytes from 10.10.20.1: icmp_seq=4 ttl=64 time=3.16 ms

--- 10.10.20.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 3.075/3.164/3.280/0.073 ms
```

De switch leert het MAC-adres van de test-VM op Ethernet3 en dat van OPNsense op
Ethernet1, beide in VLAN 20:

```txt
sw01>show mac address-table
Vlan    Mac Address       Type        Ports      Moves   Last Move
----    -----------       ----        -----      -----   ---------
  10    000c.2938.6a7f    DYNAMIC     Et2        1       0:02:07 ago
  10    000c.2986.a58c    DYNAMIC     Et1        1       0:02:22 ago
  20    000c.2986.a58c    DYNAMIC     Et1        1       0:02:02 ago
  20    000c.29cb.bff4    DYNAMIC     Et3        1       0:02:02 ago
  30    000c.2986.a58c    DYNAMIC     Et1        1       0:01:01 ago
  40    000c.2986.a58c    DYNAMIC     Et1        1       0:01:20 ago
Total Mac Addresses for this criterion: 6
```

## Wat niet in één keer werkte

Vier storingen, uitgewerkt bij [Storingen en herstel](/verbeek-logistiek/storingen/):

1. vEOS startte niet op omdat Aboot de schijf niet vond.
2. OPNsense en de switch bereikten elkaar niet. Daar zaten meerdere oorzaken achter; de
   laatste en belangrijkste zat in de virtuele bekabeling, niet in de configuratie.
3. De test-VM in VLAN 20 kreeg geen adres: Ethernet3 en Ethernet4 zaten in Workstation op
   elkaars segment.
4. Daarna kwamen de DHCP-aanvragen wel aan, maar antwoordde OPNsense niet. Opgelost na een
   herstart; de oorzaak is niet vastgesteld.
