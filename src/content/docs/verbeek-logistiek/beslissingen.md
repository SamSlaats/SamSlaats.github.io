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
<!-- Welk probleem moest je oplossen? -->

**Opties**
<!-- Wat heb je overwogen, en wat zijn de voor- en nadelen per optie? -->

**Keuze**
<!-- Wat heb je gekozen en waarom? -->

**Gevolgen**
<!-- Wat kost deze keuze (RAM, complexiteit) en wat levert hij op? -->

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
