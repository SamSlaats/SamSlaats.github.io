---
title: 'Bouwlog fase 1: netwerk'
description: Firewall, managed switch en VLAN's werkend krijgen.
sidebar:
  order: 5.1
---

## Doel

Het doel van deze log is het aantonen van het inrichten van een netwerk doormiddel van VLAN tagging/trunking, managed switch en het gebruik maken van OPNsense.

:::note[Stand van zaken]
Fase 1 is nog bezig. De trunk tussen OPNsense en de switch werkt: de switch pingt de
router in VLAN 10. VLAN 20, 30 en 40 staan op beide apparaten. De beheer-VM in VLAN 10
draait: hij bereikt OPNsense, de switch en internet, en opent de webinterface van
OPNsense. Nog te doen: DHCP en een eerste firewallregel per VLAN, en een test vanaf een VM in VLAN 20.
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

**Arista vEOS-lab 4.36.1F (32-bit)**

- Opstartlader Aboot 8.0.3 als IDE-cd-rom, het image als IDE-schijf.
- Zero Touch Provisioning uitgezet, hostnaam `sw01`.
- VLAN 10 (management), 20 (servers), 30 (clients) en 40 (dmz) aangemaakt.
- Ethernet1 als trunk voor VLAN 10 t/m 40.
- Ethernet2 als access-poort in VLAN 10, voor de beheer-VM.
- Ethernet3 als access-poort in VLAN 20.
- `interface Vlan10` met 10.10.10.2/24 als beheeradres.
- De eerste netwerkkaart van de VM is Management1 en hangt niet aan de trunk.

**Beheer-VM: Ubuntu 26.04 LTS**

- Hostnaam `Beheer`, netwerkkaart `ens33` op LAN segment `VLAN-10` (Ethernet2 van de switch).
- Vast adres 10.10.10.20/24, gateway en DNS-server 10.10.10.1 (Unbound op OPNsense).
- Doel: de webinterface van OPNsense beheren vanuit VLAN 10.

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

## Wat niet in één keer werkte

Twee storingen, uitgewerkt bij [Storingen en herstel](/verbeek-logistiek/storingen/):

1. vEOS startte niet op omdat Aboot de schijf niet vond.
2. OPNsense en de switch bereikten elkaar niet. Daar zaten meerdere oorzaken achter; de
   laatste en belangrijkste zat in de virtuele bekabeling, niet in de configuratie.
