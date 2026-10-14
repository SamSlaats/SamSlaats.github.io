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
router in VLAN 10. VLAN 20, 30 en 40 staan op beide apparaten. Nog te doen: DHCP en een
eerste firewallregel per VLAN, en een test vanaf een VM achter een access-poort.
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
- VLAN 10 als `em0_vlan10` op `em0`. Die is toegewezen als LAN, met 10.10.10.1/24.
- VLAN 20, 30 en 40 als `em0_vlan20` t/m `em0_vlan40` (OPT1 t/m OPT3), met 10.10.20.1,
  10.10.30.1 en 10.10.40.1 (/24).
- `em0` zelf heeft geen adres; die draagt alleen de VLAN's.

**Arista vEOS-lab 4.36.1F (32-bit)**

- Opstartlader Aboot 8.0.3 als IDE-cd-rom, het image als IDE-schijf.
- Zero Touch Provisioning uitgezet, hostnaam `sw01`.
- VLAN 10 (management), 20 (servers), 30 (clients) en 40 (dmz) aangemaakt.
- Ethernet1 als trunk voor VLAN 10 t/m 40.
- Ethernet3 als access-poort in VLAN 20.
- `interface Vlan10` met 10.10.10.2/24 als beheeradres.
- De eerste netwerkkaart van de VM is Management1 en hangt niet aan de trunk.

## Logboek

| Datum | Wat |
|---|---|
| 12 okt 2026 | vEOS-lab gedownload (`.vmdk` plus Aboot-ISO). Eerste start mislukt: Aboot vindt de schijf niet. Opgelost door de schijf als IDE aan te sluiten. |
| 13 okt 2026 | Switch ingericht: ZTP uit, VLAN's, trunk op Ethernet1, Vlan10 met 10.10.10.2. |
| 13 okt 2026 | OPNsense en switch kunnen elkaar niet pingen. Zoektocht gestart; drie oorzaken gevonden en opgelost, maar nog steeds geen verbinding. |
| 14 okt 2026 | Echte oorzaak gevonden: Ethernet1 en Management1 zaten in Workstation op elkaars segment. Omgezet; de switch pingt OPNsense. |
| 14 okt 2026 | VLAN 20, 30 en 40 op OPNsense toegevoegd. Beide machines herstart: de configuratie blijft bewaard. |

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

## Wat niet in één keer werkte

Twee storingen, uitgewerkt bij [Storingen en herstel](/verbeek-logistiek/storingen/):

1. vEOS startte niet op omdat Aboot de schijf niet vond.
2. OPNsense en de switch bereikten elkaar niet. Daar zaten meerdere oorzaken achter; de
   laatste en belangrijkste zat in de virtuele bekabeling, niet in de configuratie.
