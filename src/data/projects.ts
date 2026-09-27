import type { Project } from './types';
import purplePiperImg from '../assets/purple-piper.png';
import giardiniDelledenImg from "../assets/giardini_dell'eden.png";
import dummyImg from '../assets/dummy.png';
import eurofishImg from '../assets/eurofish-napoli.png';
import kialeImg from '../assets/kiale.png';

export const projects: Project[] = [

  // ── RISTORAZIONE ──────────────────────────────────────────────────────
  {
    slug: 'recco',
    title: 'Recco Gastronomia',
    tags: ['Ristorazione', 'Ospitalità', 'Logo', 'Packaging', 'Print'],
    period: 'nel 2016',
    description: 'Identità visiva per una gastronomia artigianale con radici nella tradizione ligure.',
    image: dummyImg,
  },
  {
    slug: 'angolo-luna',
    title: 'L\'Angolo e la Luna',
    tags: ['Ristorazione', 'Ospitalità', 'Logo', 'Menu', 'Web'],
    period: 'nel 2025',
    description: 'Brand e sito web per un ristorante di cucina creativa. Identità che evoca atmosfera serale.',
    image: dummyImg,
  },
  {
    slug: 'kiale',
    title: 'Kiale Food Service',
    tags: ['Ristorazione', 'Ospitalità', 'Branding', 'Print', 'Packaging'],
    period: 'dal 2024',
    description: 'Sistema di brand per un format di ristorazione veloce con ingredienti locali.',
    featured: true,
    image: kialeImg,
  },
  {
    slug: 'giardini-dell-eden',
    title: "Giardini dell'Eden",
    tags: ['Ristorazione', 'Ospitalità', 'Logo', 'Menu'],
    period: 'dal 2026',
    description: 'Identità botanica per un ristorante dal carattere verde e naturale — logo e menu in equilibrio tra eleganza e freschezza.',
    featured: true,
    image: giardiniDelledenImg,
  },

  // ── OSPITALITÀ ────────────────────────────────────────────────────────
  {
    slug: 'la-torre-rossa',
    title: 'La Torre Rossa',
    tags: ['Ristorazione', 'Ospitalità', 'Logo', 'Web', 'Print'],
    period: 'dal 2026',
    description: 'Brand e sito per un agriturismo in collina. Identità che valorizza il paesaggio.',
    image: dummyImg,
  },
  {
    slug: 'kelle-terre',
    title: 'Kelle Terre',
    tags: ['Ristorazione', 'Ospitalità', 'Branding', 'Print', 'Packaging'],
    period: 'dal 2023',
    description: 'Identità per un agriturismo con produzione propria di vino e olio.',
    image: dummyImg,
  },

  // ── CULTURA & EVENTI ──────────────────────────────────────────────────
  {
    slug: 'koine',
    title: 'Koinè',
    tags: ['Cultura', 'Eventi', 'Branding', 'Print', 'Web'],
    period: 'nel 2015',
    description: 'Identità visiva per un centro culturale polifunzionale — teatro, musica, mostre, formazione.',
    image: dummyImg,
  },
  {
    slug: 'teatro-ariston',
    title: 'Teatro Ariston',
    tags: ['Cultura', 'Eventi', 'Print', 'Web'],
    period: 'dal 2024',
    description: 'Campagna stagionale e sistema di comunicazione per un teatro storico.',
    image: dummyImg,
    
  },

  // ── SALUTE & BENESSERE ────────────────────────────────────────────────
  {
    slug: 'cardogna',
    title: 'Cardogna',
    tags: ['Salute', 'Benessere', 'Logo', 'Branding', 'Print'],
    period: 'dal 2022',
    description: 'Identità visiva per uno studio odontoiatrico con focus sulla relazione umana con il paziente.',
    image: dummyImg,
  },
  {
    slug: 'luca-lebone',
    title: 'Luca Lebone',
    tags: ['Salute', 'Benessere', 'Logo', 'Web', 'Branding'],
    period: 'dal 2023',
    description: 'Brand personale e sito per un medico estetico — autorevolezza scientifica e sensibilità estetica.',
    image: dummyImg,
  },
  {
    slug: 'ausonia-padel',
    title: 'Ausonia Padel & Tennis',
    tags: ['Salute', 'Benessere', 'Logo', 'Branding', 'Web'],
    period: 'nel 2021',
    description: 'Identità e sito per un centro sportivo con campi da padel e tennis.',
    image: dummyImg,
  },

  // ── CONSULENZA & MEDIA ─────────────────────────────────────────────────
  {
    slug: 'uau',
    title: 'UAU! Marketing',
    tags: ['Consulenza', 'Media', 'Logo', 'Branding', 'Web'],
    period: 'nel 2020',
    description: 'Identità e sito per un\'agenzia di marketing locale — audace, provocatorio, efficace.',
    image: dummyImg,
  },
  {
    slug: 'ornella',
    title: 'Ornella',
    tags: ['Consulenza', 'Media', 'Branding', 'Web', 'Social'],
    period: 'dal 2020',
    description: 'Brand personale e presenza digitale per una consulente di digital marketing.',
    image: dummyImg,
  },
  {
    slug: 'purple-piper',
    title: 'Purple Piper',
    tags: ['Consulenza', 'Media', 'Logo', 'Branding', 'Web'],
    period: 'dal 2018',
    description: 'Brand e sito per una web radio indipendente — un\'identità che suona forte.',
    featured: true,
    image: purplePiperImg,
  },

  // ── IMPRESE & PRODOTTO ───────────────────────────────────────────────
  {
    slug: 'oltre',
    title: 'Oltre Horeca',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Branding'],
    period: 'dal 2022',
    description: 'Identità per un locale horeca che copre colazione, pranzo e cocktail.',
    image: dummyImg,
  },
  {
    slug: 'acciai',
    title: 'SG Acciai',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Branding', 'Print'],
    period: 'dal 2024',
    description: 'Identità per un\'azienda artigianale di arredo su misura in acciaio e metallo.',
    image: dummyImg,
  },
  {
    slug: 'spazioquadro',
    title: 'Spazioquadro',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Web', 'Print'],
    period: 'dal 2026',
    description: 'Brand e sito per un\'azienda di infissi e serramenti su misura.',
    image: dummyImg,
  },
  {
    slug: 'gea',
    title: 'G&A',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Web', 'Print'],
    period: 'dal 2026',
    description: 'Brand e sito per un\'azienda di infissi e serramenti su misura.',
    image: dummyImg,
  },
  {
    slug: 'dea-cosmesi',
    title: 'DeaCosmesi',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Packaging', 'Web'],
    period: 'dal 2022',
    description: 'Brand e packaging per una linea di cosmetici artigianali — ogni prodotto racconta l\'ingrediente.',
    image: dummyImg,
  },
  {
    slug: 'eurofish',
    title: 'Eurofish',
    tags: ['Imprese', 'Prodotto', 'Logo', 'Packaging', 'Veicoli'],
    period: 'dal 2025',
    description: 'Identità visiva completa per una società di distribuzione di prodotti ittici.',
    featured: true,
    image: eurofishImg,
    video: '/media/eurofish-video.mp4',
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}
