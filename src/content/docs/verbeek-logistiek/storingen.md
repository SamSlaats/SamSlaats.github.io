---
title: Storingen en herstel
description: Wat er stukging, bewust of onbewust, en hoe het hersteld is.
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

**Datum.** 13 en 14 oktober 2026, fase 1. **Status: opgelost.**

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

**Herstel (deels).** In Workstation de kaarten op MAC-adres opgezocht (onder Advanced) en
Management1 losgekoppeld. Dat bleek niet genoeg: zie oorzaak D.

### Oorzaak C: na een herstart was de configuratie weg

Na een herstart van OPNsense stond `em0` weer op 192.168.1.1, de fabrieksinstelling, en
was de VLAN verdwenen.

**Oorzaak.** OPNsense draaide nog vanaf de installatie-ISO (live mode). Wat ik instelde,
stond alleen in het werkgeheugen en verdween bij een herstart.

**Herstel.** OPNsense op de virtuele schijf geïnstalleerd en VLAN 10 en het LAN-adres
opnieuw ingesteld. Op 14 oktober beide machines
opnieuw opgestart: de configuratie bleef staan.

### Oorzaak D: Ethernet1 hing aan het verkeerde segment

Na A, B en C verstuurde OPNsense correct getagd verkeer en stond de trunk op de switch
goed. Toch bleef Ethernet1 op 0 ontvangen pakketten staan, en kwam er geen LLDP meer
binnen op `em0`.

`show interfaces status` gaf Ethernet1 als `connected`. Dat zei weinig: in een VM betekent
het alleen dat de virtuele netwerkkaart is aangesloten, niet aan welk segment. Ethernet2
en Ethernet4, waar niets aan hing, stonden ook op `connected`.

De netwerkkaarten in Workstation op MAC-adres naast elkaar gelegd:

| Kaart | MAC | Hing aan | Hoort aan |
|---|---|---|---|
| OPNsense `em0` | `00:0C:29:86:A5:8C` | `Trunk` | `Trunk` |
| vEOS Management1 | `00:0C:29:64:81:84` | `Trunk` (losgekoppeld) | niet aan de trunk |
| vEOS Ethernet1 | `00:0C:29:64:81:8E` | `VLAN-10` | `Trunk` |

De twee kaarten van de switch zaten op elkaars segment. Bij oorzaak B had ik Management1
losgekoppeld, maar niet gecontroleerd of Ethernet1 daarna wel aan de trunk hing.

**Herstel.** Ethernet1 op segment `Trunk` gezet en Management1 eraf gehaald. Binnen een
halve minuut leerde de switch het MAC-adres van OPNsense op Ethernet1:

```txt
sw01>show mac address-table
Vlan    Mac Address       Type        Ports      Moves   Last Move
----    -----------       ----        -----      -----   ---------
  10    000c.2986.a58c    DYNAMIC     Et1        1       0:00:24 ago
```

Daarna lukte de ping van de switch naar 10.10.10.1.

### Wat ik hiervan leer

- **Werk van onder naar boven.** De interfacetellers en de MAC-tabel lieten zien dat er
  niets aankwam. Daarmee wist ik dat ik IP-instellingen nog niet hoefde te onderzoeken.
- **LLDP is een gratis kabeltester.** Zonder iets in te stellen zie je welk apparaat en
  welke poort aan de andere kant van een kabel zit.
- **Vertrouw op MAC-adressen, niet op de volgorde.** De volgorde van netwerkkaarten in
  een VM zegt niets over hoe het besturingssysteem ze noemt.
- **Eén adres, één interface.** Twee interfaces in hetzelfde subnet geven gedrag dat
  lijkt te werken, maar het verkeer gaat de verkeerde kant op.
- **Controleer een herstel ook echt.** Bij oorzaak B nam ik aan dat de bekabeling daarna
  klopte. Een blik op de MAC-adressen van álle kaarten had een avond gescheeld.
- **Eén symptoom kan meerdere oorzaken hebben.** A, B, C en D gaven allemaal hetzelfde
  beeld: geen ping. Pas toen alle vier weg waren, werkte het.

## 3. Test-VM in VLAN 20 krijgt geen adres: Ethernet3 aan het verkeerde segment

**Datum.** 23 oktober 2026, fase 1. **Status: opgelost.**

**Symptoom.** De installer van de test-VM meldde `autoconfiguration failed`: geen adres
via DHCP. Op de switch stond het MAC-adres van de VM (`000c.29cb.bff4`) nergens in de
MAC-tabel, en Ethernet3 had nog nooit iets ontvangen, terwijl hij zelf wel verstuurde:

```txt
Port      InOctets    InUcastPkts    InMcastPkts    InBcastPkts
Et3              0              0              0              0
```

**Oorzaak.** Hetzelfde patroon als bij storing 2: een virtuele kabel op de verkeerde
plek. In Workstation stond adapter 4 op `VLAN-30` en adapter 5 op `VLAN-20`. In het
ontwerp was ik vergeten dat Management1 de eerste kaart van vEOS is. Daardoor is adapter 4
niet Ethernet4 maar Ethernet3, en zaten Ethernet3 en Ethernet4 op elkaars segment.

**Herstel.** De kaarten op MAC-adres vergeleken met `show interfaces | include
^Eth|address`. Adapter 4 (Ethernet3) op `VLAN-20` gezet, adapter 5 (Ethernet4) losgekoppeld,
omdat die poort op de switch uit staat. Daarna stond het MAC-adres van de VM op Ethernet3
in VLAN 20. De vertaaltabel tussen adapters en poorten staat nu in de
[bouwlog](/verbeek-logistiek/bouwlog-fase-1-netwerk/).

**Les.** Dit is de tweede keer dat de volgorde van de netwerkkaarten me opbreekt. Bij
"geen verbinding" in deze opstelling: eerst de tellers van de switchpoort bekijken. Staat
`InOctets` op 0, dan ligt het aan de virtuele bekabeling, en is het zinloos om naar
configuratie te kijken.

## 4. DHCP-aanvragen komen aan, maar OPNsense antwoordt niet

**Datum.** 23 oktober 2026, fase 1. **Status: opgelost, oorzaak niet vastgesteld.**

**Symptoom.** Na het herstel van storing 3 kreeg de test-VM nog steeds geen adres. De
switch stuurde de aanvragen wel de trunk op: de teller `OutBcastPkts` van Ethernet1 liep op
bij elke poging, en Ethernet1 stond in VLAN 20 op `forwarding`.

**Aanpak.** Van de switch naar OPNsense, met packet capture in OPNsense:

1. Op `em0`, de fysieke kaart onder de VLAN's, kwam de aanvraag getagd binnen:

   ```txt
   00:0c:29:cb:bf:f4 > ff:ff:ff:ff:ff:ff, 802.1Q, vlan 20, IPv4, 0.0.0.0.68 > 255.255.255.255.67: UDP, length 300
   ```

2. Op Servers (`em0_vlan20`) kwam dezelfde aanvraag binnen, zonder tag. Het VLAN-interface
   ontving hem dus. Er ging alleen geen antwoord terug.

Na een herstart van de VM's (Workstation kon een bestand niet verwijderen) kreeg de
test-VM wel een adres: 10.10.20.184.

**Oorzaak.** Niet vastgesteld. Het waarschijnlijkst is dat Dnsmasq de nieuwe instellingen
voor Servers nog niet had geladen, maar dat heb ik voor de herstart niet in het log van
Dnsmasq gecontroleerd. Dat is dus een vermoeden, geen bewijs.

**Les.**
- Een packet capture met een poortfilter op het parent-interface ziet getagde frames
  niet: het filter zoekt UDP direct na de Ethernet-header, maar daar zit eerst de
  VLAN-tag. Op `em0` dus zonder poortfilter vangen; op het VLAN-interface werkt het filter
  wel. De eerste capture leek daardoor te zeggen dat er niets binnenkwam.
- Een capture eerst stoppen en dan pas bekijken. Zolang hij loopt, kan de weergave leeg
  zijn.
- Bij de volgende wijziging aan Dnsmasq (DHCP voor Clients of DMZ) eerst testen zonder
  herstart, en als het niet werkt het log bekijken. Dan is de oorzaak alsnog te vinden.
