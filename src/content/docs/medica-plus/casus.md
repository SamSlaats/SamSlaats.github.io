---
title: Casus en eisen
description: Wat ziekenhuis Medica+ nodig had, en welk deel daarvan in een virtuele omgeving te bouwen was.
sidebar:
  order: 2
---

Medica+ wilde naast het oude bekabelde netwerk een professioneel draadloos netwerk, met
strikte scheiding tussen personeel, medische apparatuur en bezoekers. Ik heb het deel
gebouwd dat in VMware kan: netwerkscheiding, authenticatie, de wireless controller en
monitoring.

## Uitgangssituatie

Medica+ is een **fictief** ziekenhuis uit de opdracht:

- 320 medewerkers: 180 medisch, 85 administratief, 40 IT en techniek, 15 directie
- Een hoofdgebouw van vier verdiepingen en een polikliniek van twee
- Meer dan 50 medische apparaten met wifi, zoals monitors en infuuspompen
- Dagelijks 150 tot 200 bezoekers en patiënten

## Eisen die ik heb uitgewerkt

1. Elke groep een eigen VLAN: IT-beheer, medisch personeel, administratie, medische
   apparaten, directie en gasten.
2. Gasten kunnen het interne netwerk en de medische apparaten niet bereiken.
3. Medische apparaten praten alleen met de medische database en kunnen niet het internet op.
4. Medisch personeel en administratie hebben wel internet.
5. Personeel logt op de wifi in met het eigen AD-account via RADIUS, en alleen leden van de
   juiste AD-groep komen erin.
6. Interne netwerken krijgen hun adres van DHCP op de Windows-server.
7. Gasten gaan eerst akkoord met de voorwaarden via een captive portal, met een
   snelheidslimiet van 5 Mbit/s.
8. Uitval van belangrijke diensten wordt gemeld voordat gebruikers er last van hebben.

## Buiten de opdracht die ik bouwde

De volledige opdracht vroeg ook om 24 access points over zes verdiepingen, een RF site
survey, een kanaalplan, metingen van de dekking en snel roamen tussen access points.
Dat vraagt echte hardware in een echt gebouw en heb ik niet uitgevoerd. Ook
contentfilters voor gasten en sms-verificatie bij de captive portal zitten er niet in.
