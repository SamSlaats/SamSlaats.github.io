---
title: Ontwerp
description: Netwerktekening, VLAN-indeling en resourceverdeling.
draft: true
sidebar:
  order: 3
---

:::caution[Concept]
Deze pagina is een voorstel en staat op `draft: true`. Controleer en herschrijf hem
op basis van wat je werkelijk bouwt, en haal dan de regel `draft: true` weg.
:::

## Netwerktekening

```mermaid
flowchart TB
  WAN([Internet / NAT]) --- FW[OPNsense<br/>firewall en router]
  FW ===|trunk, getagd| SW[vEOS<br/>managed switch]
  SW ---|access VLAN 10| MGMT[Management]
  SW ---|access VLAN 20| SRV[Servers<br/>DC01, DC02, database, monitoring]
  SW ---|access VLAN 30| CLI[Clients]
  SW ---|access VLAN 40| DMZ[DMZ<br/>reverse proxy, webserver]
```

## VLAN-indeling

| VLAN | Naam | Subnet | Gateway | Doel |
|---|---|---|---|---|
| 10 | Management | 10.10.10.0/24 | 10.10.10.1 | Beheer van firewall en switch |
| 20 | Servers | 10.10.20.0/24 | 10.10.20.1 | DC's, database, monitoring, back-up |
| 30 | Clients | 10.10.30.0/24 | 10.10.30.1 | Werkplekken |
| 40 | DMZ | 10.10.40.0/24 | 10.10.40.1 | Reverse proxy en webserver |

## Resourceverdeling

| VM | RAM | Altijd aan |
|---|---|---|
| OPNsense | 1 GB | Ja |
| vEOS-switch | 2 GB | Ja |
| DC01, DC02 (Server Core) | 2 GB elk | Ja |
| Webserver | 2 GB | Ja |
| Database | 4 GB | Ja |
| Monitoring | 2 GB | Ja |
| Windows-client | 4 GB | Alleen bij testen |
| Back-upserver | 4 GB | Alleen bij back-up en restore |
