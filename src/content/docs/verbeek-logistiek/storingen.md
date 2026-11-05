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

## 5. `dcdiag` faalt op SystemLog en DFSREvent; WinRM kan zijn SPN niet registreren

**Datum.** 29 en 30 oktober 2026, fase 2. **Status: `dcdiag` slaagt; 10154 open.**

**Symptoom.** `dcdiag` op DC01 gaf SystemLog en DFSREvent als failed, en bleef dat doen
na de correctie van de tijdzone en de tijdbron. Later op 30 oktober slaagden beide tests.

**Aanpak.** `dcdiag` telt fouten en waarschuwingen uit de laatste 24 uur. Daarom zijn de
events zelf bekeken met `Get-WinEvent` op het systeemlog en DFS Replication, en vergeleken
met het tijdstip van de opstart (`LastBootUpTime`).

- **1014** (DNS Client), twee keer per opstart, 20 tot 45 seconden na de start: de
  SRV-record `_ldap._tcp.dc._msdcs.verbeek.internal` en `wpad` kregen geen antwoord. Later
  op dezelfde dag antwoordt de SRV-record wel. Dit hoort bij de opstartvolgorde: DC01 is de
  enige DNS-server van het domein en gebruikt zichzelf, en die service is vlak na de start
  nog niet klaar.
- **DFSR 2212 en 2214** één keer, bij de eerste opstart na de promotie, in dezelfde
  seconde. Ze vallen na 24 uur uit het venster van `dcdiag`; of DFSREvent daarna slaagt,
  is nog niet gezien.
- **10154** (WinRM): `WSMAN/DC01` en `WSMAN/DC01.verbeek.internal` konden niet worden
  aangemaakt. Bij opstart met foutcode 1355. Na `Restart-Service WinRM`, toen DNS en het
  domein wel bereikbaar waren, kwam de waarschuwing terug met foutcode 8344. De SPN's
  staan niet in `setspn -L DC01`. `Test-WSMan DC01 -Authentication Kerberos` werkt lokaal.

**Oorzaak.** Voor 1014: de opstartvolgorde, op grond van de tijden en de SRV-test, maar
niet door een tweede DNS-server uit te sluiten. Voor 10154 **niet vastgesteld**. De eerste
verklaring (domein nog niet bereikbaar bij opstart) bleek niet de enige: na de herstart van
WinRM is de foutcode een andere.

Onderzocht voor 8344 (onvoldoende rechten):
- WinRM draait als `NT AUTHORITY\NetworkService`.
- Op het object `CN=DC01` heeft `SELF` het recht *Validated write to service principal
  name*.
- `dNSHostName` is `DC01.verbeek.internal` en `sAMAccountName` is `DC01$`. De SPN's die WinRM
  wil schrijven passen daarbij, dus een afwijkende hostnaam is uitgesloten.

Hypothese, niet bewezen: `SELF` geldt alleen voor het account van het object zelf (`DC01$`).
Op een lidserver meldt `NetworkService` zich via het netwerk bij een DC aan als het
computeraccount, en dan geldt `SELF`. Op een DC is AD lokaal; als WinRM daar als
`NetworkService` binnenkomt en niet als `DC01$`, geldt `SELF` niet. Toets bij DC02: staat
`WSMAN/DC02` in `setspn -L DC02` zolang DC02 lidserver is, en verdwijnt dat of komt 10154
terug na de promotie?

**Besluit.** Bewust niet omzeild met `setspn`. Een handmatige SPN zou de waarschuwing
wegnemen zonder te verklaren waarom WinRM het zelf niet kan, en zou in de log pas als
workaround mogen staan. Het punt blijft open tot de oorzaak is onderzocht.

**Les.**
- `dcdiag` en zijn 24-uursvenster: een test die faalt na een correctie betekent niet dat
  de correctie niet werkte. Eerst de tijdstempels van de events bekijken.
- Niet elk event in het venster laat een test falen. Met 1014 en 10154 (waarschuwingen)
  slaagde SystemLog gewoon. Welk event de test eerder liet falen, is niet bekeken voordat
  het uit het venster viel: de volgende keer de uitvoer van de falende test zelf lezen.
- Een eerste verklaring (timing bij opstart) werd door een vervolgtest (andere foutcode na
  herstart van de service) deels weerlegd. Een waarschuwing meer dan één keer testen voor
  je de oorzaak noemt.
- Getest op 5 november: vanaf Beheer01 werken `Test-WSMan DC01 -Authentication Kerberos`
  en `Enter-PSSession DC01`, zonder de WSMAN-SPN. De waarschuwing 10154 heeft dus geen
  zichtbaar gevolg voor beheer op afstand; de oorzaak blijft open.
- Nog te testen: of de DNS-volgorde bij DC02 (de ander eerst, zichzelf tweede) de 1014's
  vermindert.

## 6. DC01 loopt 1,5 uur achter na een suspend

**Datum.** 30 oktober 2026, fase 2. **Status: hersteld door NTP; voorkomen door afsluiten.**

**Symptoom.** Na het hervatten van de gesuspende VM's gaf `w32tm /stripchart` naar
10.10.20.1 een afwijking van `+5455 s`, en DC01 gaf 21:50 aan terwijl het rond 23:20 was.
`w32tm /resync` meldde "The computer did not resync because no time data was available".

**Aanpak.** Een afwijking zegt alleen dat de twee klokken verschillen, niet welke fout
loopt. Eerst `Get-Date` vergeleken met de echte tijd, en opnieuw de stripchart: daarna liep
DC01 gelijk en stond de afwijking op 0. `Last Successful Sync Time` was 23:31:09, na de
mislukte `/resync`: de tijdservice had de klok zelf via NTP gecorrigeerd.

**Oorzaak.** De VM's waren gesuspend. Tijdsynchronisatie van VMware staat uit op DC01
(beslissing 8), dus de klok liep na het hervatten verder vanaf het moment van de suspend.
Waarom `/resync` meteen na het hervatten geen tijdgegevens had, is niet vastgesteld.

**Les.**
- VM's van dit lab afsluiten, niet suspenden. Als er een tweede DC of een client is,
  weigert Kerberos bij meer dan 5 minuten verschil; 1,5 uur is ruim daarboven.
- Bij een afwijking eerst nagaan welke klok goed loopt, voordat je er een verklaring aan
  hangt. Hier werd eerst aangenomen dat DC01 achterliep; dat klopte, maar het was niet
  gecontroleerd.

## 7. OPNsense krijgt geen tijd van buiten

**Datum.** 30 en 31 oktober 2026, fase 2. **Status: opgelost met een NAT-regel; oorzaak in
VMware vastgesteld, mechanisme niet.**

**Symptoom.** Een packet capture van NTP tussen DC01 en OPNsense liet zien dat OPNsense
antwoordde met stratum 12 en Reference-ID 127.0.0.1: OPNsense gebruikte zijn eigen klok.
`ntpq -pn` op OPNsense toonde alleen de vier pool-regels (stratum 16, reach 0), zonder één
echte server eronder. DC01 volgde OPNsense op stratum 13. De klok van OPNsense liep
4,5 tot 5 seconden voor; het domein liep mee, zonder dat iets dat liet zien.

**Aanpak.** Stap voor stap de weg van OPNsense naar internet afgelopen, en per stap één
hypothese getoetst:

1. *DNS?* Nee: OPNsense vindt de pool-adressen, en het NTP-log toont ntpd die steeds
   nieuwe servers aanspreekt ("Soliciting pool server").
2. *Internet?* Nee: ping naar 1.1.1.1 zonder verlies.
3. *Toestand van ntpd na de suspend?* Een herstart van ntpd veranderde niets.
4. *Firewall van OPNsense?* Nee: `tcpdump -i pflog0` toonde alleen `pass out`, en
   `tcpdump -i em1` toonde vragen naar buiten maar geen antwoorden binnen. Wat niet
   aankomt, kan de firewall niet blokkeren.
5. *VMware NAT na de suspend?* Een herstart van de VMware NAT Service veranderde niets.
6. *Bronpoort?* Een klein Python-script stuurt drie NTP-vragen vanaf een gekozen
   bronpoort. Van OPNsense naar 45.139.163.87, op hetzelfde moment, met ntpd even
   gestopt: met een willekeurige bronpoort 3 van 3 antwoorden, met bronpoort 123
   0 van 3. ntpd verstuurt altijd vanaf poort 123.
7. *Router of provider?* Nee: hetzelfde script op de Windows-pc (buiten VMware), met de
   tijdservice van Windows gestopt, kreeg ook op bronpoort 123 3 van 3 antwoorden.
8. *Pakt de tijdservice van Windows op de pc de antwoorden af?* Nee: met die service
   gestopt kreeg OPNsense op poort 123 nog steeds geen antwoord.

Eerdere aannames die onderweg niet klopten: dat de suspend de oorzaak was, dat het eerste
pakket van een nieuwe verbinding verloren gaat, en een test met `ntpdate -q` die een
willekeurige poort bleek te gebruiken, ook zonder `-u`. Pas met het eigen script, waarin
alleen de poort verschilde, was de vergelijking eerlijk.

**Oorzaak.** De NAT van VMware Workstation laat antwoorden op verkeer met bronpoort 123
vanuit OPNsense vallen. Vastgesteld door uitsluiting: OPNsense verstuurt, de pc krijgt
op dezelfde poort wel antwoord, en daartussen zit alleen VMware. Waarom VMware dit doet,
is niet vastgesteld. Ook niet verklaard: één server (84.27.101.81) antwoordde wel op
poort 123, en rond het hervatten op 30 oktober gaf DC01 kort stratum 3.

**Oplossing.** Source NAT-regel op OPNsense (modus Hybrid): interface WAN, UDP, bron
`WAN address`, bestemmingspoort 123, vertalen naar `WAN address`, *Static-port* uit.
OPNsense herschrijft daarmee de bronpoort van zijn eigen NTP-verkeer naar een
willekeurige poort, zodat VMware geen poort 123 meer ziet.

Daarna toonde `ntpq -pn` echte servers met oplopende reach (37, 17, 31) en een gekozen bron
(`*185.80.247.36`, stratum 1, `.PPS0.`), met afwijkingen van enkele milliseconden. DC01
ging van stratum 13 naar 3.

**Les.**
- Een hypothese toetsen met een test waarin maar één ding verschilt. Twee programma's
  vergelijken (ntpd en ntpdate) leek een poorttest, maar was het niet.
- Een capture kijkt vóór de firewall. Een pakket dat in de capture staat, is nog niet
  door de firewall; een pakket dat er niet staat, is er nooit geweest.
- "De klok lijkt goed" bewijst niets: OPNsense liep seconden voor, met een
  nette tijd op het dashboard.
- Bij NTP-problemen eerst `ntpq -pn` op OPNsense: staan er alleen pool-regels, dan heeft
  OPNsense geen bron.

**Nog open, gevonden tijdens dit onderzoek.**
- ~~DC01 vraagt OPNsense in symmetrische modus.~~ Omgezet naar clientmodus (`0x8`), zie
  beslissing 8.
- Een machine in het lab, vermoedelijk de Ubuntu-beheer-VM, haalt zelf tijd van een
  server op internet (185.125.190.123, door OPNsense gerouteerd). Volgens beslissing 8
  hoort alleen OPNsense dat te doen.
- De waarschuwing op DC01 van 30 oktober 21:31:57 ("peer 10.10.20.1 unreachable") is
  niet verklaard. OPNsense had op dat moment geen bron; of dat verband houdt, is niet
  vastgesteld.

## 8. Beheer01 niet in de MAC-tabel: Ethernet4 aan het verkeerde segment

**Datum.** 2 november 2026, fase 2. **Status: opgelost.**

**Symptoom.** Beheer01 (de Windows-beheerclient in VLAN 30) stond aan, maar
`show mac address-table` toonde in VLAN 30 geen enkel adres: niet Beheer01, en ook niet
OPNsense. Wel stond OPNsense (`000c.2986.a58c`) op Et1 in VLAN 10, 20 en 40. Dat is
normaal: OPNsense stuurt vanaf één kaart over de trunk, en verschijnt daarom één keer per
VLAN.

**Aanpak.** Drie mogelijkheden: Beheer01 stuurt niets, de kaart van Beheer01 hangt aan het
verkeerde segment, of het verkeer komt niet bij Ethernet4. Beheer01 stond aan, en Windows
stuurt bij het opstarten uit zichzelf pakketten; het segment van Beheer01 was gecontroleerd.
`show interfaces Ethernet4 counters` toonde wel binnenkomend verkeer. In VMware bleken twee
adapters van de switch-VM aan segment `VLAN-20` te hangen: adapter 4 (Ethernet3) en
adapter 5 (Ethernet4).

**Oorzaak.** Adapter 5 van de switch-VM hing aan `VLAN-20`. Het verkeer dat Ethernet4
binnenkreeg, kwam van dat segment (DC01 en de test-VM), niet van Beheer01. Sinds wanneer
de adapter zo stond, is niet vastgesteld; na storing 3 was hij losgekoppeld.

Zolang het zo stond, waren VLAN 20 en VLAN 30 via de virtuele bekabeling met elkaar
verbonden, buiten de firewall om: verkeer van segment `VLAN-20` kwam binnen op Ethernet4
en kwam daar in VLAN 30 terecht. In een echt netwerk is dat een gat in de segmentatie
(eis 1).

**Herstel.** Adapter 5 naar segment `VLAN-30`. Daarna:

```txt
sw01#show mac address-table vlan 30
  30    000c.2933.c6c0    DYNAMIC     Et4
  30    000c.2986.a58c    DYNAMIC     Et1
sw01#show mac address-table vlan 20
  20    000c.2986.a58c    DYNAMIC     Et1
  20    000c.29b3.df2f    DYNAMIC     Et3
```

Beheer01 op Et4 in VLAN 30 (gelijk aan het MAC-adres in VMware), DC01 alleen nog op Et3.
Ping van Beheer01 naar 10.10.30.1 lukt.

**Les.**
- Dit is de derde keer dat de virtuele bekabeling van de switch-VM niet klopte (zie ook
  storing 3). Na elke wijziging aan de adapters van de switch-VM de hele tabel
  controleren (adapter, MAC-adres, Et-poort, segment), niet alleen de adapter die je
  aanpaste.
- Tellers van een poort tellen op sinds de poort aanging. Een hoog getal zegt dat er ooit
  iets binnenkwam, niet wanneer of van wie. Voor een test eerst `clear counters`.
- Een lege MAC-tabel in een VLAN zegt meer dan een volle: als zelfs OPNsense er niet in
  staat, gaat er niets door dat VLAN.

## 9. WinRM van Beheer01 naar DC01 geweigerd: DC01 op netwerkprofiel Public

**Datum.** 4 november 2026, fase 2. **Status: opgelost; blijvende oplossing deels nog bij
DC02.**

**Symptoom.** Vanaf Beheer01 slaagden DNS, 389, 88 en 445 naar DC01, maar
`Test-NetConnection 10.10.20.10 -Port 5985` niet. De regel op OPNsense (10.10.30.10 →
`DCs`, TCP 5985) zag er goed uit.

**Aanpak.** Er zitten twee firewalls tussen Beheer01 en WinRM: OPNsense en de Windows
Firewall op DC01. Met `tcpdump` op OPNsense, interface VLAN 20, tijdens de test: de SYN van
Beheer01 kwam aan in VLAN 20, steeds hetzelfde volgnummer (herhalingen), en er kwam niets
terug, ook geen reset. OPNsense liet het dus door, en DC01 gooide het stil weg.

Op DC01 gaf `Get-NetConnectionProfile` het profiel **Public**. Een domeincontroller hoort
zijn netwerk als `DomainAuthenticated` te herkennen. Op het Public-profiel staat de
ingebouwde regel *Windows Remote Management (HTTP-In)* volgens de uitvoer op
`LocalSubnet`; Beheer01 zit in een ander subnet. (De koppeling van regel en adresfilter is
afgeleid uit de volgorde van twee commando's, niet apart gecontroleerd.)

`Restart-Service NlaSvc` lukte niet: een afhankelijke service (`netprofm`) liet zich niet
stoppen. `Restart-NetAdapter -Name Ethernet0` wel: daarna `DomainAuthenticated`, en 5985
slaagde.

**Oorzaak.** DC01 kreeg bij het opstarten het profiel Public. Volgens de bronnen start
Network Location Awareness (NLA) voordat AD en de DNS-server klaar zijn; DC01 gebruikt
zichzelf als DNS en vindt het domein dan niet. Dat past bij de 1014-events bij het
opstarten (storing 5), maar is voor DC01 niet apart aangetoond.

**Afweging.** De snelle oplossing was de WinRM-regel van het Public-profiel openzetten
voor 10.10.30.10. Niet gedaan: de fout zat niet in de regel, maar in het profiel. Met één
aangepaste regel blijven alle andere regels volgens het verkeerde profiel werken, en worden
regels voor onbetrouwbare netwerken verzwakt om een fout te maskeren.

Opties voor een blijvende oplossing:
- A. Registerwaarde `AlwaysExpectDomainController` = 1 (NLA blijft het domein zoeken).
- B. NlaSvc vertraagd laten starten.
- C. Met twee DC's: elke DC de andere als eerste DNS, zichzelf als tweede.
- D. Een taak die bij het opstarten de netwerkkaart herstart (workaround).

Gekozen: A nu, omdat er nog maar één DC is; C bij DC02 (#16), omdat het doel twee DC's is
en dat de oorzaak (DNS bij het opstarten) aanpakt.

**Herstel.** `AlwaysExpectDomainController` = 1 (DWORD) in
`HKLM\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters`. Na een herstart van DC01:
`DomainAuthenticated`, en 5985 vanaf Beheer01 slaagt. Dat is één herstart; of DC01
daarvoor bij elke herstart op Public kwam, is niet bekeken.

**Les.**
- Bij een geweigerde verbinding eerst bepalen welke firewall het is. Een capture op de
  plek ertussen laat dat zien: komt het pakket aan en komt er niets terug, dan ligt het bij
  de bestemming.
- Stilte (geen reset) wijst op een firewall die het pakket weggooit; een reset wijst op
  een poort waar niets luistert.
- Een fout in het profiel niet oplossen met een uitzondering in de regels.

**Bronnen.**
- [WOSHub: Wrong network profile on Windows Server after reboot](https://woshub.com/wrong-network-profile-windows-server-reboot)
- [Dell: Windows Firewall reset to Public after a reboot](https://www.dell.com/support/kbdoc/en-ge/000207835/wrong-windows-firewall-selected)

## 10. Inloggen op Beheer01 met een domeinaccount mislukt na de domain join

**Datum.** 4 en 5 november 2026, fase 2. **Status: opgelost.**

**Symptoom.** Na de domain join en de herstart startte Beheer01 erg langzaam op. Inloggen
als `VERBEEK\Administrator` gaf: *"The security database on the server does not have a
computer account for this workstation trust relationship."* Ook bij latere pogingen.

**Wat eerst vaststond.**
- Op DC01 bestond het computeraccount `BEHEER01`, `Enabled`, in `CN=Computers`, aangemaakt
  om 01:03:29: bij de tweede, geslaagde join. De eerste poging (zonder
  administratorrechten, "Access is denied") liet geen account achter.
- Op Beheer01, ingelogd met het lokale account: `PartOfDomain : True`, en op 4 november gaf
  `Test-ComputerSecureChannel` `True` ("in good condition").

**Aanpak.** Een inlogpoging gedaan en direct daarna de logboeken aan beide kanten bekeken.

- DC01, Security: 4768 voor `BEHEER01$` met `Result Code: 0x0`. Kerberos voor het
  computeraccount werkte. Geen 4768 voor `Administrator`: de inlogpoging kwam niet zo ver.
- Beheer01, Security: 4625 met status `0xC000018B`, de code achter de foutmelding.
- Beheer01, System: 5719 (geen secure session met de DC), 5788 en 5789 (SPN en DNS-naam
  in AD bijwerken mislukt: *"The RPC server is unavailable"*), 1055 (Group Policy).

Het patroon: DNS, Kerberos, LDAP en SMB werkten, alles via RPC niet. RPC begint op
poort 135 (endpoint mapper) en gaat daarna naar een hoge poort. Bij de tests van stap 7
waren 389, 88, 445 en 5985 getest, maar 135 en de hoge poorten niet.

**Oorzaak.** In de alias `AD_TCP` op OPNsense stond **134** in plaats van **135**. RPC van
Clients naar de DC's werd daardoor geblokkeerd, en daarmee de secure session, het
bijwerken van AD en Group Policy. Niet verklaard: waarom `Test-ComputerSecureChannel` op
4 november toch `True` gaf.

**Herstel.** `AD_TCP` aangepast naar 135. Na een herstart van Beheer01:

```txt
C:\Users\Administrator>whoami
verbeek\administrator

C:\Users\Administrator>nltest /sc_verify:verbeek.internal
Trusted DC Name \\DC01.verbeek.internal
Trusted DC Connection Status Status = 0 0x0 NERR_Success
Trust Verification Status = 0 0x0 NERR_Success

C:\Users\Administrator>w32tm /query /source
DC01.verbeek.internal
```

**Les.**
- Een alias poort voor poort testen. Bij stap 7 bleven juist de twee niet-geteste poorten
  het probleem.
- De foutmelding wees naar het computeraccount, maar de oorzaak zat in het netwerk. De
  logboeken aan beide kanten lieten zien wat wel en niet werkte; daaruit volgde de poort.
- Voor de hoge RPC-poorten volstaat een test op een willekeurige poort niet: op DC01
  luistert niet op elke poort iets. Eerst op DC01 kijken welke hoge poorten luisteren
  (`Get-NetTCPConnection -State Listen`), en die testen. Deze poorten worden bij het
  opstarten toegewezen en kunnen na een herstart anders zijn; daarom staat in de regel de
  hele range.
