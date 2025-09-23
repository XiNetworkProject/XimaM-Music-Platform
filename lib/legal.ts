// Centralisation des informations légales Synaura

export type HostInfo = {
  name: string;
  address: string;
  website?: string;
};

export type CompanyInfo = {
  siteName: string;
  siteUrl: string;
  companyName: string; // Nom Prénom (micro-entreprise)
  siren?: string;
  siret?: string;
  rcs?: string; // Non applicable en micro-entreprise la plupart du temps
  tva?: string; // TVA intracom (si applicable)
  address: string;
  email: string;
  phone?: string;
  dpoEmail?: string; // Délégué à la protection des données (si applicable)
  host: HostInfo;
  updatedAt: string; // Dernière mise à jour
};

// TODO: Renseigner exactement les informations ci-dessous
export const company: CompanyInfo = {
  siteName: 'Synaura',
  siteUrl: 'https://synaura.fr', // À ajuster si différent
  companyName: 'Vermeulen Maxime',
  siren: '991 635 194', // D’après Pappers
  siret: '99163519400012', // À renseigner
  rcs: '', // Souvent non applicable en micro-entreprise
  tva: '', // À renseigner si applicable
  address: '',
  email: 'synaura.app@gmail.com', // À renseigner
  phone: '', // Optionnel
  dpoEmail: '', // Optionnel si pas de DPO
  host: {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133, Walnut, CA 91789, USA',
    website: 'https://vercel.com',
  },
  updatedAt: new Date().toISOString().slice(0, 10),
};

export const formatAddress = (addr?: string) => (addr && addr !== '' ? addr : 'Adresse à renseigner');


