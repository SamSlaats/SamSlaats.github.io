---
title: Beslissingen
description: Ontwerpkeuzes met de afweging erachter.
draft: true
sidebar:
  order: 4
---

Elke keuze volgens hetzelfde stramien: context, opties, keuze, gevolgen.
Het sjabloon staat in `sjablonen/beslissing.md`.

## 1. Access ports in plaats van VLAN-tagging op de host

**Context**
Elke machine in het lab moet in het juiste VLAN terechtkomen. Dat kan op twee plekken
geregeld worden: op de machine zelf, die zijn verkeer tagt, of op een switch, die per poort
bepaalt in welk VLAN een machine zit.

**Opties**
- *VLAN-tagging op de host.* Elke VM tagt zelf zijn verkeer. Geen switch nodig, en dit heb
  ik al eens gedaan (schoolproject Medica+). Maar elke machine bepaalt dan zelf in welk VLAN
  hij zit: een overgenomen of verkeerd ingestelde machine kan verkeer in een ander VLAN
  sturen.
- *Een managed switch met access-poorten.* De switch bepaalt per poort het VLAN; een
  machine op een access-poort weet niets van VLAN's en kan zichzelf niet in een ander VLAN
  zetten. Alleen tussen netwerkapparaten wordt getagd (de trunk tussen switch en OPNsense).

**Keuze**
Een managed switch (Arista vEOS) met access-poorten. De eerste reden is een leerdoel:
VLAN-tagging kende ik al, met een managed switch had ik nog nooit gewerkt, en ik wilde een
casus waarin dat nodig is. De tweede reden is technisch: met access-poorten hangt de
segmentatie (eis 1) af van één plek die ik beheer, de switch, en niet van elke machine
afzonderlijk. Zo is het in echte netwerken ook: eindapparaten op access-poorten, tagging
alleen tussen netwerkapparaten.

**Gevolgen**
- Per VLAN een eigen poort op de switch en een eigen netwerkkaart op de switch-VM. Voor
  VLAN 40 moest daarvoor een zesde kaart bij (Ethernet5).
- De volgorde van de netwerkkaarten in VMware moet kloppen met de poorten van de switch. Dat
  ging mis: bij storing 3 doordat de eerste kaart (Management1) niet was meegeteld en alles
  één opschoof, bij storing 8 door een kaart aan het verkeerde segment. Sindsdien staat er
  een tabel met kaart, MAC-adres, poort en segment in de bouwlog, en wordt na elke wijziging
  de hele tabel gecontroleerd.
- Een switch-VM kost 2 GB geheugen extra.

## 2. Native VLAN op de trunk naar een ongebruikt VLAN, ongebruikte poorten dicht

**Context**
De trunk tussen OPNsense en de switch (Ethernet1) stond na de eerste inrichting op de
standaardinstelling: native VLAN 1. Untagged frames op een trunk komen in de native VLAN
terecht. VLAN 1 is ook het standaard-VLAN van elke poort waar niets op is ingesteld; op
het moment van deze keuze zat Ethernet4 er nog in. Daarnaast stonden poorten aan die
nergens voor gebruikt werden.

Op dat moment had dit nog geen effect: VLAN 1 stond niet in de toegestane lijst van de
trunk (`10,20,30,40`), dus untagged verkeer op Ethernet1 werd al weggegooid. Dat is
toevallig goed, niet ontworpen goed. Eén aanpassing aan de toegestane lijst, zoals
`switchport trunk allowed vlan all`, en untagged verkeer van de trunk deelt een VLAN met
elke vergeten poort.

**Opties**
- *Native VLAN 1 laten staan.* Geen werk, en nu werkt het. Maar de veiligheid hangt dan
  af van de toegestane lijst, en VLAN 1 blijft een VLAN waar elke niet-ingestelde poort in
  belandt.
- *Native VLAN naar een ongebruikt VLAN zonder poorten en zonder adres (VLAN 999).*
  Untagged verkeer op de trunk komt dan in een VLAN waar niets anders is. Werkt los van de
  toegestane lijst en is op de switch alleen te regelen.
- *Native VLAN taggen (`switchport trunk native vlan tag`).* Dan is er geen untagged
  verkeer meer op de trunk. Strenger, maar beide kanten moeten het dan eens zijn; een
  verkeerde instelling aan één kant geeft een storing die lastig te vinden is.

**Keuze**
Native VLAN op Ethernet1 is VLAN 999 (`ongebruikt`): een VLAN zonder poorten, zonder
interface en zonder adres. OPNsense stuurt al alles getagd (`em0` heeft geen eigen adres
en draagt alleen de VLAN-interfaces), dus er is geen verkeer dat de native VLAN nodig
heeft. Taggen van de native VLAN voegt in deze opstelling niets toe en maakt de trunk
foutgevoeliger.

Ethernet4 is uitgezet (`shutdown`): er was geen apparaat op aangesloten en geen
MAC-adres geleerd. Een uitgezette poort kan niet per ongeluk in een VLAN belanden.

Ethernet2 blijft aan. Het oorspronkelijke plan was ook die dicht te zetten, maar de
`show mac address-table` liet een actief MAC-adres in VLAN 10 zien: dat is de beheer-VM.
Uitzetten had het beheerpad naar OPNsense en de switch afgesneden. De poort heeft nu de
description `beheer-vm`.

**Gevolgen**
- Een nieuwe poort moet eerst bewust aangezet en aan een VLAN gekoppeld worden. Dat kost
  een paar commando's, maar er komt niets per ongeluk aan het netwerk.
- De beveiliging van de trunk hangt niet meer af van één regel (de toegestane lijst).
- Als OPNsense later toch untagged verkeer over `em0` stuurt, werkt dat niet: het belandt
  in VLAN 999. Dat is de bedoeling, maar het is wel de eerste plek om te kijken als zo'n
  verbinding niet werkt.
- De wijziging is doorgevoerd via een config session met `commit timer`, zodat de switch
  zichzelf zou terugzetten als de verbinding wegviel.

## 3. Domeinnaam `verbeek.internal`

**Context**
Fase 2 begint met een nieuwe AD-forest. De domeinnaam is daarna praktisch niet meer te
wijzigen.

**Opties**
- *`verbeek.local`.* Veel gebruikt in oude omgevingen, maar `.local` is ook de extensie
  van mDNS (Bonjour, Avahi). Apparaten die dat gebruiken kunnen namen verkeerd opzoeken.
- *Een subdomein van een echt domein, zoals `ad.verbeek.nl`.* De netjeste optie voor een
  echt bedrijf, maar dan moet je dat domein bezitten. Verbeek Logistiek is fictief.
- *`verbeek.internal`.* `.internal` is in 2024 door ICANN gereserveerd voor intern gebruik
  en wordt nooit een publieke extensie.

**Keuze**
`verbeek.internal`. De naam is makkelijk en past bij het bedrijf. `.internal` voorkomt
conflicten: de naam is alleen voor intern gebruik bedoeld en komt nooit op het publieke
internet terecht.

**Gevolgen**
- Voor `.internal` is geen publiek TLS-certificaat te krijgen (bijvoorbeeld van Let's
  Encrypt). Eis 3 vraagt TLS voor de webapplicatie; in fase 3 is dus een eigen CA nodig
  (zoals AD CS), of een publieke naam alleen voor de applicatie.

## 4. Server Core voor de domain controllers, beheer vanaf de Windows-client

**Context**
De host heeft 32 GB RAM en niet alle VM's kunnen tegelijk draaien. DC01 en DC02 staan
altijd aan.

**Opties**
- *Desktop Experience.* Grafische tools op de server zelf, maar meer geheugen en schijf,
  en meer om bij te werken en te beveiligen.
- *Server Core.* Alleen een opdrachtregel (`sconfig`, PowerShell). Minder geheugen, maar
  de grafische beheertools (RSAT: Users and Computers, Group Policy Management, DNS) moeten
  op een andere Windows-machine draaien.

Voor die beheermachine:
- *De Windows-client met RSAT.* Staat al in het ontwerp.
- *Een aparte Windows-beheer-VM in VLAN 10.* Kost extra geheugen.
- *Alles met PowerShell.* Group Policy bewerken zonder grafische editor is onhandig.

**Keuze**
Server Core, omdat het RAM bespaart en de host al krap zit. Beheer gebeurt met RSAT vanaf
de Windows-client: er hoeft geen extra machine bij, dus het geheugengebruik blijft gelijk.

**Gevolgen**
- De Windows-client hoort in VLAN 30. Dat VLAN moet daarom in fase 2 ingericht worden
  (#12), en er zijn regels nodig van Clients naar de DC's (#14).
- Bouwen en accounts aanmaken gebeurt met PowerShell op de console; Group Policy pas als de
  Windows-client er is.
- Beheerverkeer naar de DC's komt uit het VLAN van de werkplekken. Daarom mag WinRM (5985)
  alleen vanaf de Windows-client met een vast adres, en niet van heel Clients: een nieuwe
  werkplek in VLAN 30 krijgt zo niet vanzelf beheerrechten op de DC's.
- Er zijn twee beheerplekken met elk een eigen taak: de beheer-VM in VLAN 10 voor OPNsense
  en de switch (beslissing 10), de Windows-client in VLAN 30 voor de servers.

## 5. Vaste adressen voor de domain controllers

**Context**
Een DC moet een vast adres hebben: clients vinden hem via DNS, en DNS wijst naar dat adres.

**Keuze**
DC01 op 10.10.20.10, DC02 op 10.10.20.20. Dat houdt het overzichtelijk en makkelijk te
onthouden. Beide liggen onder de DHCP-range van Servers (.100 t/m .200), dus er is geen
botsing met uitgedeelde adressen.

## 6. DNS: het domein op de DC's, de rest via OPNsense

**Context**
Domeinmachines vinden de DC's via DNS. De DC's moeten daarnaast ook gewone namen op
internet kunnen opzoeken.

**Opties**
Voor namen buiten het domein:
- *De DC's vragen het direct aan een DNS-server op internet.*
- *De DC's sturen het door naar Unbound op OPNsense (10.10.20.1).*

Voor de DNS-server die clients krijgen:
- *DHCP-optie 6: de DC's (10.10.20.10 en 10.10.20.20).* Clients vragen alles rechtstreeks
  aan AD DNS.
- *OPNsense blijft DNS-server, met een domain override in Unbound* die vragen over
  `verbeek.internal` doorstuurt naar de DC's.

**Keuze**
De DC's doen DNS voor `verbeek.internal` en sturen de rest door naar Unbound op OPNsense.
Rechtstreeks naar internet zou betekenen dat er geen controle is op wat de DC's opvragen;
nu gaat alle DNS via één punt en hoeven de DC's zelf niet naar buiten.

Clients krijgen via DHCP-optie 6 de DC's als DNS-server, omdat er dan geen extra schakel
tussen zit.

**Gevolgen**
- Optie 6 komt alleen op de VLAN's met domeinmachines: Servers en Clients. Management en
  DMZ houden OPNsense als DNS-server.
- Zijn beide DC's tegelijk uit, dan werkt DNS op Servers en Clients helemaal niet, ook niet
  voor internet. Daarom twee DC's, en dat wordt getest (#16).
- Er is een regel nodig voor DNS (TCP en UDP 53) van de DC's naar OPNsense (#14).

## 7. DHCP blijft op OPNsense

**Context**
Windows Server kan zelf DHCP doen, en in veel AD-omgevingen draait DHCP op de DC's.

**Opties**
- *Windows DHCP op de DC's.*
- *Dnsmasq op OPNsense houden.*

**Keuze**
DHCP blijft op OPNsense: het werkt al en is getest in fase 1.

**Gevolgen**
- In Dnsmasq komt per VLAN met domeinmachines optie 6 met de DC's (zie beslissing 6).
- DHCP blijft werken als de DC's uit staan; alleen de DNS-servers die clients krijgen zijn
  dan niet bereikbaar.

## 8. Tijd: DC01 haalt tijd van OPNsense

**Context**
Kerberos, het aanmelden in AD, weigert bij meer dan 5 minuten verschil tussen client en DC.
In een domein volgt iedereen de tijd van de PDC-emulator (DC01); die heeft zelf een bron
nodig.

**Opties**
- *DC01 haalt tijd direct van een externe NTP-bron.*
- *DC01 haalt tijd van OPNsense, en OPNsense van buiten.*

**Keuze**
DC01 haalt tijd van OPNsense. Dat is beter beveiligd: er is één tijdbron voor het hele
netwerk, en alleen OPNsense haalt tijd van buiten.

DC01 vraagt OPNsense in clientmodus (`0x8`), niet in de symmetrische modus die Windows
zonder vlag gebruikt. In de symmetrische modus biedt DC01 OPNsense ook zijn eigen tijd aan,
en een NTP-server kiest de bron met het laagste stratum. Zonder eigen bron zou OPNsense zo
de tijd van DC01 kunnen overnemen, die zijn tijd weer van OPNsense heeft: een kring zonder
echte bron. Clientmodus houdt de keten in één richting: internet, OPNsense, DC01, domein.

**Gevolgen**
- Er is een regel nodig voor NTP (UDP 123) van DC01 naar OPNsense (#14).
- Tijdsynchronisatie van VMware Tools moet uit op de DC's, anders stellen Workstation en NTP
  allebei de klok bij.
- Alleen DC01 krijgt een bron ingesteld; DC02 en de leden van het domein volgen de
  domeinhiërarchie.
- Omdat VMware de klok niet bijstelt, loopt een DC na een suspend achter tot NTP hem
  corrigeert. Op 30 oktober was dat 1,5 uur, ruim boven de 5 minuten van Kerberos (zie
  [storing 6](/verbeek-logistiek/storingen/)). De VM's van dit lab worden daarom afgesloten,
  niet gesuspend.
- De NAT van VMware laat antwoorden op bronpoort 123 vallen. OPNsense krijgt alleen tijd van
  buiten dankzij een Source NAT-regel die die bronpoort herschrijft
  ([storing 7](/verbeek-logistiek/storingen/)). Verdwijnt die regel, dan valt OPNsense
  terug op zijn eigen klok, en het hele domein met hem.

## 9. Windows Server 2022 voor de domain controllers

**Context**
DC01 en DC02 draaien op Windows Server. Er is alleen een evaluatielicentie beschikbaar, en
die is er voor zowel 2022 als 2025.

**Opties**
- *Windows Server 2025.* De nieuwste versie, met de langste ondersteuning.
- *Windows Server 2022.* Reguliere ondersteuning is afgelopen in oktober 2026;
  beveiligingsupdates lopen nog tot oktober 2031.

**Keuze**
Windows Server 2022. Veel bedrijven draaien nog op 2022, en daar wil ik me in verdiepen.
Een latere fase kan de servers upgraden naar 2025, zodat ik daar ook ervaring mee opdoe.

**Gevolgen**
- Evaluatielicentie: 180 dagen, met `slmgr /rearm` vijf keer te verlengen, in totaal
  ongeveer drie jaar. Daarna sluit de server zich elk uur af.
- Een evaluatie-editie is op een domain controller niet om te zetten naar een volledige
  licentie: AD DS moet er dan eerst af.
- Een upgrade naar 2025 gaat daarom het best met nieuwe DC's op 2025 in hetzelfde domein,
  de FSMO-rollen verhuizen en de oude DC's degraderen, en niet met een in-place upgrade.

## 10. OPNsense beheren via SSH vanaf de beheer-VM

**Context**
OPNsense werd beheerd via de webinterface vanaf de beheer-VM, en via de console in VMware
voor de shell. Bij het onderzoek naar NTP (storing 7) bleek dat lastig: in de console kun je
niet plakken, en de webinterface laadt grote logbestanden traag. De beheer-VM was bedoeld
als de plek van waaruit het lab beheerd wordt, maar voor de shell gebeurde dat niet.

**Opties**
- *Alleen de VMware-console voor de shell.* Geen extra open poort, maar je werkt buiten de
  beheer-VM om, zonder kopiëren en plakken.
- *SSH met root en een wachtwoord.* Snel ingericht, maar root is het bekendste account om
  te raden, en een wachtwoord is te raden.
- *SSH met een eigen account en een sleutel, alleen bereikbaar vanaf de beheer-VM.* Meer
  werk om in te richten, maar er is geen wachtwoord om te raden en maar één machine mag
  het proberen.

**Keuze**
SSH met een eigen account en een sleutel. De beheer-VM wordt daarmee ook echt de
beheermachine, voor de webinterface én de shell. Dat is logischer dan half via de
VMware-console werken.

Ingericht:
- Eigen gebruiker in de groep `admins`, met de publieke sleutel (`ed25519`) van de
  beheer-VM. De privésleutel blijft op de beheer-VM.
- Root login uit, inloggen met wachtwoord uit.
- SSH luistert alleen op Management.
- Firewallregel op Management: bron 10.10.10.10 (de beheer-VM, met een vast adres),
  bestemming `This Firewall`, TCP 22.
- `sudo` vraagt het wachtwoord van de gebruiker voor commando's die root nodig hebben.

Getest: inloggen met de eigen gebruiker lukt; als root wordt geweigerd; met
`-o PubkeyAuthentication=no` wordt geweigerd zonder om een wachtwoord te vragen.

**Gevolgen**
- De regel hangt aan het vaste adres van de beheer-VM. Krijgt die een ander adres, dan
  werkt SSH niet meer; dat is de bedoeling.
- Raakt de beheer-VM of zijn sleutel kwijt, dan blijft de VMware-console als terugweg.
- Er is een poort meer open op de firewall, maar alleen vanaf één adres in het
  beheer-VLAN.

## 11. Windows 11 Pro voor de Windows-beheerclient

**Context**
De Windows-client in VLAN 30 beheert de servers met RSAT (beslissing 4) en moet daarvoor
lid van het domein zijn. Windows Home kan geen lid van een domein worden.

**Opties**
- *Windows 11 Enterprise, evaluatieversie.* Volledig te gebruiken, maar 90 dagen geldig.
- *Windows 11 Pro.* Kan in een domein. Er is geen evaluatieversie van Pro en er is geen
  sleutel; zonder sleutel draait Pro ongeactiveerd, met een watermerk en zonder
  instellingen voor personalisatie.

**Keuze**
Windows 11 Pro, niet geactiveerd (labgebruik). De evaluatieversie van Enterprise verloopt
na 90 dagen, en ik wil niet het risico lopen dat de client stopt voordat de casus af is.
Een niet-geactiveerde Pro verloopt niet en kan lid worden van het domein.

**Gevolgen**
- Vast adres 10.10.30.10, buiten een latere DHCP-range van Clients. De WinRM-regel naar
  de DC's hangt aan dat adres.
- Zonder activatie zijn sommige instellingen van Windows niet beschikbaar; voor beheer
  met RSAT maakt dat niet uit.
- Voor een echte omgeving is een licentie nodig; dat geldt niet voor dit lab.

## 12. De DMZ krijgt alleen wat nodig is, en praat niet met de DC's

**Context**
In de DMZ (VLAN 40) komt de webserver: een machine die je minder vertrouwt dan de rest,
omdat hij bereikbaar moet zijn. Bij het inrichten van VLAN 40 en websrv01 moest gekozen
worden waar de DMZ DNS, tijd en updates vandaan haalt.

**Opties**
- *DNS via de DC's, zoals Clients.* Interne namen werken meteen, maar dan is er een regel
  van de DMZ naar de DNS-dienst van DC01. Een overgenomen webserver praat dan rechtstreeks
  met de domeincontroller (in 2020 kon een lek in de DNS-server van Windows, SIGRed, via
  DNS-verkeer een DC overnemen).
- *DNS via OPNsense.* De DMZ blijft los van intern; namen uit `verbeek.internal` zijn dan
  niet bekend. Als dat nodig is, kan OPNsense vragen voor `verbeek.internal` doorsturen naar
  de DC's (domain override); de DMZ-machines praten dan nog steeds alleen met OPNsense.
- *Updates via een regel naar het hele internet (80/443), naar alleen de updateservers, of
  alleen tijdelijk.*

**Keuze**
- **DNS via OPNsense (10.10.40.1).** De DMZ bevat servers die je minder vertrouwt; die
  horen niet de DNS te gebruiken die intern ook gebruikt wordt. Een domain override wordt
  pas overwogen als de webserver interne namen nodig heeft (#21).
- **Tijd van OPNsense (10.10.40.1).** De machine in de DMZ blijft, en zijn logboeken moeten
  naast die van de rest te leggen zijn.
- **Updates alleen van websrv01 naar de updateservers van Ubuntu**, met een alias op naam
  (`Ubuntu_updates`) en alleen poort 80. Er is maar één server in de DMZ die updates nodig
  heeft; strak houden betekent een vaste bron en een vaste bestemming.
- **Een vast adres voor websrv01 (10.10.40.10)**, zodat de regels aan dat adres kunnen
  hangen en de server niet afhangt van DHCP, net als de beheer-VM in fase 1.

**Gevolgen**
- Regels op DMZ: `DMZ net` → 10.10.40.1 op TCP/UDP 53 en UDP 123; 10.10.40.10 →
  `Ubuntu_updates` op TCP 80. Al het andere vanuit de DMZ wordt geblokkeerd.
- Wat Ubuntu verder naar buiten wil, komt als blokkering in de pflog. Daarom op websrv01
  uitgezet wat niet nodig is (zie de bouwlog): snapd, het nieuws van motd en apt, de
  NTS-tijdservers van Ubuntu, en netwerk in de initramfs (storing 12).
- Ubuntu gebruikt standaard NTS (versleutelde tijd) naar zijn eigen servers. Die is
  ingeruild voor gewone NTP naar OPNsense, binnen het eigen netwerk.
- Alleen poort 80 voor updates: verandert Ubuntu ooit naar HTTPS, dan blijkt dat uit
  blokkeringen op 443 en moet de regel worden aangepast.

