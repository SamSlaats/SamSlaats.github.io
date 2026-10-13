---
title: Wat ik anders zou doen
description: Terugblik op het Medica+-project.
draft: true
sidebar:
  order: 7
---

<!--
Deze pagina staat op draft: true en komt pas online als je hem zelf hebt geschreven.
Hieronder punten die mij opvielen bij het doorlezen. Neem over wat je ermee eens bent,
in je eigen woorden, en schrap de rest.

- De medische database staat in het VLAN van het medisch personeel (20). Een database hoort
  in een eigen servernetwerk; nu staat hij tussen honderden laptops en tablets.
- Medische apparaten mogen naar de database op alle poorten. De opdracht vroeg om één
  specifieke poort.
- De servers delen VLAN 10 met het beheer van access points en switches. Een apart
  servernetwerk scheidt die beter.
- pfSense en DC1 zijn allebei single points of failure: één firewall, één domain controller.
- De 802.1X-keten via een access point is nooit van begin tot eind getest.
- Wat zei de feedback van je docent?
-->
