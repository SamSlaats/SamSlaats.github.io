// De projecten op de startpagina, in deze volgorde: zet je sterkste project bovenaan.
// domein: het vakgebied. Een vakgebied verschijnt op de startpagina zodra er een project in zit.
// cijfers: drie getallen die in één oogopslag laten zien wat het project omvat.
import { fases, machines, vlans } from './lab';

const verbeekFase = fases.find((f) => f.status === 'bezig');
const verbeekGebouwd = machines.filter((m) => m.gebouwd).length;

export type Domein = 'infra' | 'cloud' | 'code';

export const domeinen: Record<Domein, { naam: string; kort: string }> = {
  infra: { naam: 'Netwerk en infrastructuur', kort: 'Infra' },
  cloud: { naam: 'Microsoft 365 en cloud', kort: 'Cloud' },
  code: { naam: 'Programmeren', kort: 'Code' },
};

export type Project = {
  titel: string;
  domein: Domein;
  href: string;
  herkomst: string;
  periode: string;
  status: 'Afgerond' | 'In opbouw';
  samenvatting: string;
  cijfers: { waarde: string; label: string }[];
  techniek: string[];
};

export const projecten: Project[] = [
  {
    titel: 'Medica+ enterprise wifi',
    domein: 'infra',
    href: '/medica-plus/',
    herkomst: 'Schoolopdracht, Summa College leerjaar 3',
    periode: 'mei – juni 2026',
    status: 'Afgerond',
    samenvatting:
      'Gescheiden wifi voor een ziekenhuis met 320 medewerkers: zes VLAN’s, inloggen met het AD-account via RADIUS, en monitoring die een gestopte dienst zelf herstart.',
    cijfers: [
      { waarde: '6', label: 'VLAN’s' },
      { waarde: '5', label: 'SSID’s' },
      { waarde: '4', label: 'servers' },
    ],
    techniek: ['pfSense', 'Windows Server 2025', 'NPS / RADIUS', 'UniFi', 'Zabbix'],
  },
  {
    titel: 'Verbeek Logistiek',
    domein: 'infra',
    href: '/verbeek-logistiek/',
    herkomst: 'Eigen project',
    periode: 'sinds oktober 2026',
    status: 'In opbouw',
    samenvatting:
      'De IT-omgeving van een logistiek bedrijf met 40 medewerkers, in zeven fases: van netwerk en Active Directory tot back-up, monitoring en een bewust uitvalscenario.',
    cijfers: [
      { waarde: verbeekFase ? `${verbeekFase.nr}/${fases.length}` : '–', label: 'fase' },
      { waarde: `${verbeekGebouwd}/${machines.length}`, label: 'machines gebouwd' },
      { waarde: String(vlans.length), label: 'VLAN’s' },
    ],
    techniek: ['OPNsense', 'Arista vEOS', 'Active Directory', 'Packer', 'Ansible'],
  },
  {
    titel: 'Microsoft 365-tenant vanaf nul',
    domein: 'cloud',
    href: '/m365-stage/',
    herkomst: 'Stageopdracht, samen met een medestudent',
    periode: 'voorjaar 2026',
    status: 'Afgerond',
    samenvatting:
      'Een complete Microsoft 365-omgeving voor een fictief bedrijf: gebruikers en MFA, gedeelde mailboxen en vergaderruimtes, apparaten via Intune en Autopilot, en beveiliging met Defender en BitLocker.',
    cijfers: [
      { waarde: '12', label: 'gebruikers' },
      { waarde: '4', label: 'afdelingen' },
      { waarde: '180', label: 'uur' },
    ],
    techniek: ['Entra ID', 'Exchange Online', 'Intune', 'Autopilot', 'Defender for Endpoint', 'Azure App Service'],
  },
];
