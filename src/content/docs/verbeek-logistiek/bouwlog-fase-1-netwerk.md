---
title: 'Bouwlog fase 1: netwerk'
description: Firewall, managed switch en VLAN's werkend krijgen.
draft: true
sidebar:
  order: 5.1
---

## Doel

Het doel van deze log is het aantonen van het inrichten van een netwerk doormiddel van VLAN tagging/trunking, managed switch en het gebruik maken van OPNsense.

:::note[Stand van zaken]
Fase 1 is nog bezig. OPNsense en de switch zijn ingericht, maar de trunk tussen de twee
werkt nog niet. Zie [Storingen en herstel](/verbeek-logistiek/storingen/).
:::

## Wat ik gebouwd heb

VMware Workstation heeft geen managed switch. Daarom draait de switch als VM: Arista
vEOS. De bekabeling doe ik met LAN segments in Workstation. Elk segment is een losse
virtuele kabel zonder eigen instellingen; de VLAN's zelf bestaan alleen op OPNsense en
op de switch.

| Segment | Verbindt | Verkeer |
|---|---|---|
| `trunk` | OPNsense `em0` met switch Ethernet1 | VLAN 10 t/m 40, getagd |
| Eén per VLAN | Switch Ethernet2 t/m 5 met de VM's in dat VLAN | Ongetagd |
| NAT | OPNsense `em1` met het netwerk van de host | Internet |

**OPNsense 26.7**

- WAN op `em1`, adres via DHCP van het NAT-netwerk van Workstation.
- VLAN 10 als `em0_vlan10` op `em0`. Die is toegewezen als LAN, met 10.10.10.1/24.
- `em0` zelf heeft geen adres; die draagt alleen de VLAN's.

**Arista vEOS-lab 4.36.1F (32-bit)**

- Opstartlader Aboot 8.0.3 als IDE-cd-rom, het image als IDE-schijf.
- Zero Touch Provisioning uitgezet, hostnaam `sw01`.
- VLAN 10, 20, 30 en 40 aangemaakt.
- Ethernet1 als trunk voor VLAN 10 t/m 40.
- `interface Vlan10` met 10.10.10.2/24 als beheeradres.

## Logboek

| Datum | Wat |
|---|---|
| 12 okt 2026 | vEOS-lab gedownload (`.vmdk` plus Aboot-ISO). Eerste start mislukt: Aboot vindt de schijf niet. Opgelost door de schijf als IDE aan te sluiten. |
| 13 okt 2026 | Switch ingericht: ZTP uit, VLAN's, trunk op Ethernet1, Vlan10 met 10.10.10.2. |
| 13 okt 2026 | OPNsense en switch kunnen elkaar niet pingen. Zoektocht gestart; drie oorzaken gevonden en opgelost, één nog open. |

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

<!-- Nog toevoegen zodra het werkt: een geslaagde ping van OPNsense naar 10.10.10.2,
     en `show mac address-table` met het MAC-adres van OPNsense op Et1 in VLAN 10. -->

## Wat niet in één keer werkte

Twee storingen, uitgewerkt bij [Storingen en herstel](/verbeek-logistiek/storingen/):

1. vEOS startte niet op omdat Aboot de schijf niet vond.
2. OPNsense en de switch bereikten elkaar niet. Daar zaten meerdere oorzaken achter.
