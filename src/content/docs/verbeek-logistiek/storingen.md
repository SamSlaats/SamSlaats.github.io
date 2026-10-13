---
title: Storingen en herstel
description: Wat er stukging, bewust of onbewust, en hoe het hersteld is.
draft: true
sidebar:
  order: 6
---

Per storing: symptoom, oorzaak, herstel en wat ik ervan leerde.

## 1. vEOS start niet: Aboot vindt de schijf niet

**Datum.** 12 oktober 2026, fase 1

**Symptoom.** De switch startte op tot de `Aboot#`-prompt en bleef daar staan:

```txt
Timed out waiting for /mnt/flash
/bin/autoboot: line 15: can't open Failed to find block device for flash: no such file
No SWI specified in /mnt/flash/boot-config
```

**Oorzaak.** Aboot zoekt het besturingssysteem van de switch op de schijf, het
virtuele flashgeheugen. Workstation hangt een schijf standaard aan als SCSI of NVMe, en
Aboot herkent alleen IDE.

**Herstel.** Schijf verwijderd en opnieuw toegevoegd als IDE (0:0), met de bestaande
`.vmdk`. De cd-rom met Aboot staat op IDE 1:0.

**Les.** De melding over `x86-64-v4` en `avx512f` daarboven was geen fout, maar alleen
informatie over de processor. Lees de hele uitvoer voordat je de eerste vreemde regel
als oorzaak aanwijst.

## 2. OPNsense en de switch bereiken elkaar niet

**Datum.** 13 oktober 2026, fase 1. **Status: nog open.**

**Symptoom.** Een ping van OPNsense (10.10.10.1) naar de switch (10.10.10.2) kreeg geen
antwoord, en andersom ook niet. Op de switch:

```txt
From 10.10.10.2 icmp_seq=1 Destination Host Unreachable
```

De switch kreeg dus geen antwoord op zijn ARP-aanvraag: hij wist niet welk MAC-adres bij
10.10.10.1 hoorde.

**Aanpak.** Van onder naar boven: eerst de virtuele kabel, dan laag 2, dan pas IP. Per
stap heb ik gekeken wat er werkelijk over de lijn ging, in plaats van configuraties te
blijven aanpassen.

### Oorzaak A: het adres stond op de verkeerde interface

`ifconfig` liet zien dat 10.10.10.1 eerst op `em0` zelf stond, zonder VLAN-tag. Na het
toewijzen aan `em0_vlan10` stond het op **beide** interfaces. OPNsense koos dan `em0`,
en `tcpdump` liet een ARP-aanvraag zonder tag zien:

```txt
00:0c:29:86:a5:8c > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42:
Request who-has 10.10.10.2 tell 10.10.10.1, length 28
```

De switch verwacht op Ethernet1 verkeer met tag 10, dus dit kwam nooit in VLAN 10 terecht.

**Herstel.** LAN toegewezen aan `em0_vlan10` met 10.10.10.1/24; `em0` heeft geen adres
meer. Daarna gaat de ARP-aanvraag wel getagd naar buiten (`ethertype 802.1Q`, `vlan 10`).

### Oorzaak B: de verkeerde switchpoort hing aan het trunksegment

Op de switch bleven alle ontvangsttellers van Ethernet1 op 0 staan, terwijl hij zelf wel
verstuurde:

```txt
Port      InOctets    InUcastPkts    InMcastPkts    InBcastPkts
Et1              0              0              0              0
```

Om te zien of de virtuele kabel klopte, heb ik op OPNsense geluisterd naar LLDP. Een
switch verstuurt dat elke 30 seconden uit zichzelf, zonder tag:

```txt
00:0c:29:64:81:84 > 01:80:c2:00:00:0e, ethertype LLDP (0x88cc), length 201: LLDP, length 187: sw01
```

Er kwam dus wel iets van `sw01` binnen, maar van MAC-adres `000c.2964.8184`. Ethernet1
heeft `000c.2964.818e`. Het adres bleek van **Management1** te zijn.

Bij vEOS wordt de eerste netwerkkaart van de VM altijd Management1, en pas de tweede
Ethernet1. Ik had de eerste kaart aan het trunksegment gehangen.

**Herstel.** In Workstation de kaarten op MAC-adres opgezocht (onder Advanced) en
Management1 van het trunksegment gehaald.

### Oorzaak C: na een herstart was de configuratie weg

Na een herstart van OPNsense stond `em0` weer op 192.168.1.1, de fabrieksinstelling, en
was de VLAN verdwenen.

<!-- Vul aan: wat bleek de oorzaak? Draaide OPNsense nog vanaf de installatie-ISO
     (live mode), en heb je hem daarna op de schijf geïnstalleerd? -->

**Herstel.** VLAN 10 en het LAN-adres opnieuw ingesteld.

### Wat nog openstaat

OPNsense verstuurt nu correct getagd verkeer in VLAN 10, en de trunk op de switch staat
goed. Toch telt Ethernet1 nog steeds 0 ontvangen pakketten, en ontvangt OPNsense geen
LLDP meer. Management1 is van het segment af, maar Ethernet1 is er nog niet aan gekoppeld.

Volgende stap: in Workstation controleren of de kaart met `00:0C:29:64:81:8E` op
hetzelfde LAN segment staat als `em0` van OPNsense, en aanstaat (Connected).

### Wat ik hiervan leer

- **Werk van onder naar boven.** De interfacetellers en de MAC-tabel lieten zien dat er
  niets aankwam. Daarmee wist ik dat ik IP-instellingen nog niet hoefde te onderzoeken.
- **LLDP is een gratis kabeltester.** Zonder iets in te stellen zie je welk apparaat en
  welke poort aan de andere kant van een kabel zit.
- **Vertrouw op MAC-adressen, niet op de volgorde.** De volgorde van netwerkkaarten in
  een VM zegt niets over hoe het besturingssysteem ze noemt.
- **Eén adres, één interface.** Twee interfaces in hetzelfde subnet geven gedrag dat
  lijkt te werken, maar het verkeer gaat de verkeerde kant op.
