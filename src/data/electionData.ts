export interface CandidateRow {
  c: string; // Constituency name
  l: string; // List name
  g: string; // Party group
  v: number; // 2023 votes
  s: number; // Seats in constituency
  base: string; // Base seat won in 2023 (or empty)
}

export interface MultiplierEntry {
  g: string;
  b: number | 'n/d'; // 2023 base national %
  c: number | 'n/d'; // 2026 default %
  d: number; // default ratio
}

export type ConstituencyBaseTuple = [string, number, Record<string, number>];

export interface BaseData {
  rows: CandidateRow[];
  cons: ConstituencyBaseTuple[];
  mult: MultiplierEntry[];
}

export const PARTY_COLORS: Record<string, string> = {
  'PP': '#1e68d7',
  'PSOE': '#e11d48',
  'PSC': '#ec4899',
  'SdP': '#be123c',
  'Frente Amplio': '#ea580c',
  'VOX': '#489c24',
  'ERC': '#d97706',
  'Junts': '#0d9488',
  'EH Bildu': '#65a30d',
  'PNV': '#15803d',
  'BNG': '#0284c7',
  'CC': '#ca8a04',
  'UPN': '#2563eb',
  'Sa Unió': '#0284c7',
  'NC': '#16a34a',
  'PDeCAT-CiU': '#6366f1',
  'Geroa Bai': '#dc2626',
  'AHI': '#7c3aed',
  'ASG': '#b45309',
  'EiF': '#f97316',
  'Adelante Andalucía': '#059669',
  'Bloque Extremeño': '#64748b',
  'Coalición por Melilla': '#475569',
};

// Return a soft tinted background for party badges in light mode
export function getPartyTint(party: string, alpha = 0.12): string {
  const hex = PARTY_COLORS[party] || '#64748b';
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

export const PARTY_NAMES: Record<string, string> = {
  'PP': 'Partido Popular',
  'PSOE': 'Partido Socialista Obrero Español',
  'PSC': 'Partit dels Socialistes de Catalunya',
  'SdP': 'Senado de Progreso (PSOE + Frente Amplio)',
  'Frente Amplio': 'Frente Amplio / Sumar',
  'VOX': 'Vox',
  'ERC': 'Esquerra Republicana de Catalunya',
  'Junts': 'Junts per Catalunya',
  'EH Bildu': 'EH Bildu',
  'PNV': 'Partido Nacionalista Vasco (EAJ-PNV)',
  'BNG': 'Bloque Nacionalista Galego',
  'CC': 'Coalición Canaria',
  'UPN': 'UPN-PP (Navarra)',
  'Sa Unió': 'Sa Unió (Formentera)',
  'NC': 'Nueva Canarias',
  'PDeCAT-CiU': 'PDeCAT - Espai CiU',
  'Geroa Bai': 'Geroa Bai',
  'AHI': 'Agrupación Herreña Independiente',
  'ASG': 'Agrupación Socialista Gomera',
  'EiF': 'Eivissa i Formentera al Senat',
  'Adelante Andalucía': 'Adelante Andalucía',
  'Bloque Extremeño': 'Bloque Extremeño',
  'Coalición por Melilla': 'Coalición por Melilla'
};

export const ORDER = [
  'PSC',
  'PSOE',
  'SdP',
  'Frente Amplio',
  'EH Bildu',
  'ERC',
  'BNG',
  'Junts',
  'PDeCAT-CiU',
  'PNV',
  'Geroa Bai',
  'EiF',
  'Adelante Andalucía',
  'AHI',
  'ASG',
  'CC',
  'NC',
  'Coalición por Melilla',
  'Bloque Extremeño',
  'UPN',
  'Sa Unió',
  'PP',
  'VOX'
];

// Active national parties adjustable by user (excluding NC and PDeCAT-CiU as requested)
export const NATIONAL_PARTIES = [
  'PP',
  'PSOE',
  'Frente Amplio',
  'VOX',
  'ERC',
  'Junts',
  'EH Bildu',
  'PNV',
  'BNG',
  'CC',
  'UPN'
];

export const DIRECT_PARTIES = [
  'AHI',
  'ASG',
  'Adelante Andalucía',
  'Bloque Extremeño',
  'Coalición por Melilla',
  'Geroa Bai'
];

export const EIF = 'Balears (Illes): EIVISSA-FORMENTERA';
export const IBZ = 'Balears (Illes): IBIZA';
export const FOR = 'Balears (Illes): FORMENTERA';
export const IBV: Record<string, number> = { SdP: 23921, PP: 21593, VOX: 6236 };
export const FOV: Record<string, number> = { SdP: 2014, PP: 1525, VOX: 272 };

// Load the pristine raw dataset from data_22b1369c.js
import rawDataModule from '/public/assets/aistudio/data_22b1369c.js?raw';

// Safe parse of BASEDATA
function parseBaseData(): BaseData {
  try {
    const jsonMatch = rawDataModule.match(/const BASEDATA\s*=\s*({[\s\S]*?});/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (e) {
    console.error('Failed to parse BASEDATA from raw text', e);
  }
  // Fallback direct evaluation if needed
  return (window as unknown as { BASEDATA: BaseData }).BASEDATA;
}

export const BASEDATA: BaseData = parseBaseData();

// Format constituency display name
export function formatConstituencyName(fullName: string): string {
  if (!fullName.includes(': ')) return fullName;
  const s = fullName.split(': ')[1];
  return s
    .toLowerCase()
    .replace(/(^|[ \/\-])(\S)/g, (_, a, b) => a + b.toUpperCase())
    .replace(/ De /g, ' de ')
    .replace(/ Del /g, ' del ')
    .replace(/ Las /g, ' las ');
}

export const CONSTITUENCY_CCAA: Record<string, string> = {
  // Andalucía (8)
  'Almería': 'Andalucía',
  'Cádiz': 'Andalucía',
  'Córdoba': 'Andalucía',
  'Granada': 'Andalucía',
  'Huelva': 'Andalucía',
  'Jaén': 'Andalucía',
  'Málaga': 'Andalucía',
  'Sevilla': 'Andalucía',

  // Aragón (3)
  'Huesca': 'Aragón',
  'Teruel': 'Aragón',
  'Zaragoza': 'Aragón',

  // Principado de Asturias (1)
  'Asturias': 'Asturias',

  // Illes Balears (4)
  'Balears (Illes): FORMENTERA': 'Baleares',
  'Balears (Illes): IBIZA': 'Baleares',
  'Balears (Illes): MALLORCA': 'Baleares',
  'Balears (Illes): MENORCA': 'Baleares',
  'Balears (Illes): EIVISSA-FORMENTERA': 'Baleares',

  // Canarias (7)
  'Palmas (Las): FUERTEVENTURA': 'Canarias',
  'Palmas (Las): GRAN CANARIA': 'Canarias',
  'Palmas (Las): LANZAROTE': 'Canarias',
  'Santa Cruz de Tenerife: EL HIERRO': 'Canarias',
  'Santa Cruz de Tenerife: LA GOMERA': 'Canarias',
  'Santa Cruz de Tenerife: LA PALMA': 'Canarias',
  'Santa Cruz de Tenerife: TENERIFE': 'Canarias',

  // Cantabria (1)
  'Cantabria': 'Cantabria',

  // Castilla y León (9)
  'Ávila': 'Castilla y León',
  'Burgos': 'Castilla y León',
  'León': 'Castilla y León',
  'Palencia': 'Castilla y León',
  'Salamanca': 'Castilla y León',
  'Segovia': 'Castilla y León',
  'Soria': 'Castilla y León',
  'Valladolid': 'Castilla y León',
  'Zamora': 'Castilla y León',

  // Castilla-La Mancha (5)
  'Albacete': 'Castilla-La Mancha',
  'Ciudad Real': 'Castilla-La Mancha',
  'Cuenca': 'Castilla-La Mancha',
  'Guadalajara': 'Castilla-La Mancha',
  'Toledo': 'Castilla-La Mancha',

  // Cataluña (4)
  'Barcelona': 'Cataluña',
  'Girona': 'Cataluña',
  'Lleida': 'Cataluña',
  'Tarragona': 'Cataluña',

  // Ceuta (1)
  'Ceuta': 'Ceuta',

  // Comunitat Valenciana (3)
  'Alicante/Alacant': 'Comunitat Valenciana',
  'Castellón/Castelló': 'Comunitat Valenciana',
  'Valencia/València': 'Comunitat Valenciana',

  // Extremadura (2)
  'Badajoz': 'Extremadura',
  'Cáceres': 'Extremadura',

  // Galicia (4)
  'Coruña (A)': 'Galicia',
  'Lugo': 'Galicia',
  'Ourense': 'Galicia',
  'Pontevedra': 'Galicia',

  // Comunidad de Madrid (1)
  'Madrid': 'Madrid',

  // Melilla (1)
  'Melilla': 'Melilla',

  // Región de Murcia (1)
  'Murcia': 'Murcia',

  // Comunidad Foral de Navarra (1)
  'Navarra': 'Navarra',

  // País Vasco (3)
  'Araba/Álava': 'País Vasco',
  'Bizkaia': 'País Vasco',
  'Gipuzkoa': 'País Vasco',

  // La Rioja (1)
  'Rioja (La)': 'La Rioja'
};

export function getConstituencyCCAA(name: string): string {
  return CONSTITUENCY_CCAA[name] || 'Otras';
}

export function sortConstituenciesByCCAA<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ccaaA = getConstituencyCCAA(a.name);
    const ccaaB = getConstituencyCCAA(b.name);
    const cmpCCAA = ccaaA.localeCompare(ccaaB, 'es', { sensitivity: 'base' });
    if (cmpCCAA !== 0) return cmpCCAA;
    const nameA = formatConstituencyName(a.name);
    const nameB = formatConstituencyName(b.name);
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });
}

