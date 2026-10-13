// De projecten op de startpagina, in deze volgorde.
// cijfers: drie getallen die in één oogopslag laten zien wat het project omvat.
import { fases, machines, vlans } from './lab';

const verbeekFase = fases.find((f) => f.status === 'bezig');
const verbeekGebouwd = machines.filter((m) => m.gebouwd).length;

export type Project = {
  titel: string;
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
];
