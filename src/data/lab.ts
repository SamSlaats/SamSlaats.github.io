// Eén bron voor de cijfers van het lab. De startpagina en de pagina Ontwerp lezen hieruit.
// Pas dit bestand aan als er iets verandert, en zet dan ook `bijgewerkt` op vandaag.

export const bijgewerkt = '2026-10-12';

/** Geheugen van de pc waarop het lab draait, in GB. */
export const hostRam = 32;

export const vlans = [
  { id: 10, naam: 'Management', subnet: '10.10.10.0/24', gateway: '10.10.10.1', doel: 'Beheer van firewall en switch' },
  { id: 20, naam: 'Servers', subnet: '10.10.20.0/24', gateway: '10.10.20.1', doel: 'DC’s, database, monitoring, back-up' },
  { id: 30, naam: 'Clients', subnet: '10.10.30.0/24', gateway: '10.10.30.1', doel: 'Werkplekken' },
  { id: 40, naam: 'DMZ', subnet: '10.10.40.0/24', gateway: '10.10.40.1', doel: 'Reverse proxy en webserver' },
];

// altijd: draait continu (true) of alleen wanneer nodig (false)
// gebouwd: zet op true zodra de machine echt bestaat en werkt
export const machines = [
  { naam: 'OPNsense', rol: 'Firewall en router', vlan: 10, ram: 1, altijd: true, gebouwd: false },
  { naam: 'vEOS', rol: 'Managed switch', vlan: 10, ram: 2, altijd: true, gebouwd: false },
  { naam: 'DC01', rol: 'Domain controller', vlan: 20, ram: 2, altijd: true, gebouwd: false },
  { naam: 'DC02', rol: 'Domain controller', vlan: 20, ram: 2, altijd: true, gebouwd: false },
  { naam: 'Database', rol: 'Database van de applicatie', vlan: 20, ram: 4, altijd: true, gebouwd: false },
  { naam: 'Monitoring', rol: 'Metingen en meldingen', vlan: 20, ram: 2, altijd: true, gebouwd: false },
  { naam: 'Webserver', rol: 'Interne webapplicatie', vlan: 40, ram: 2, altijd: true, gebouwd: false },
  { naam: 'Windows-client', rol: 'Testwerkplek', vlan: 30, ram: 4, altijd: false, gebouwd: false },
  { naam: 'Back-upserver', rol: 'Back-up en restore', vlan: 20, ram: 4, altijd: false, gebouwd: false },
];

// status: 'klaar', 'bezig' of 'gepland'
// href: vul het adres van de bouwlogpagina in zodra die gepubliceerd is, bijv. '/verbeek-logistiek/bouwlog-fase-1-netwerk/'
export const fases: { nr: number; titel: string; status: 'klaar' | 'bezig' | 'gepland'; href?: string }[] = [
  { nr: 1, titel: 'Netwerk', status: 'bezig' },
  { nr: 2, titel: 'Identiteit', status: 'klaar' },
  { nr: 3, titel: 'Applicatie', status: 'gepland' },
  { nr: 4, titel: 'Back-up', status: 'gepland' },
  { nr: 5, titel: 'Monitoring', status: 'gepland' },
  { nr: 6, titel: 'Automatisering', status: 'gepland' },
  { nr: 7, titel: 'Uitval', status: 'gepland' },
];

// href: null zolang de pagina nog op draft staat
export const onderdelen: { titel: string; href: string | null }[] = [
  { titel: 'Casus en eisen', href: '/verbeek-logistiek/casus/' },
  { titel: 'Ontwerp', href: '/verbeek-logistiek/ontwerp/' },
  { titel: 'Beslissingen', href: null },
  { titel: 'Storingen en herstel', href: null },
];
