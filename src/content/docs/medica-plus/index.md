---
title: Medica+ enterprise wifi
description: Gescheiden wifi-netwerk voor een fictief ziekenhuis, gebouwd in VMware met pfSense, Windows Server, UniFi en Zabbix. Schoolopdracht, afgerond.
sidebar:
  label: Overzicht
  order: 1
---

Voor het fictieve ziekenhuis Medica+ heb ik in VMware een netwerk gebouwd met zes gescheiden
VLAN's, inloggen op de wifi met het eigen AD-account, en monitoring die een gestopte dienst
zelf weer start. Het was een opdracht voor Summa College in leerjaar 3, uitgevoerd in mei en
juni 2026.

| | |
|---|---|
| **Status** | Afgerond |
| **Platform** | VMware Workstation |
| **Herkomst** | Schoolopdracht, Summa College leerjaar 3 |

## Wat er staat

| Onderdeel | Rol | Aangetoond |
|---|---|---|
| pfSense | Gateway en firewall voor zes VLAN's | Administratie kan de medische database niet bereiken; medische apparaten hebben geen internet |
| Windows Server 2025 (DC1) | Active Directory, DNS, DHCP voor alle VLAN's, NPS als RADIUS-server | Clients krijgen een adres via DHCP-relay; NPS accepteert een AD-account uit de juiste groep |
| UniFi Network Server | Vijf SSID's met elk een eigen VLAN, captive portal voor gasten | Geconfigureerd, maar zonder echte access points niet te verbinden |
| Zabbix | Bewaakt pfSense (SNMP), DC1 (agent) en de UniFi-controller | Alarm 6 seconden na het stoppen van NPS; DNS en NPS worden automatisch herstart |

## Wat ik niet heb kunnen testen

In VMware bestaan geen echte access points. Verbinden met een SSID, de captive portal
zien en 802.1X vanaf een laptop heb ik daarom niet echt kunnen testen. Hoe ik dat heb
opgevangen, staat bij [Storingen en beperkingen](/medica-plus/storingen/).

Begin bij de [casus en eisen](/medica-plus/casus/).
