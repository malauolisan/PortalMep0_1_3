import { News, Event, Institution, Article, Slide, FeaturedModule } from './types';

const now = new Date().toISOString();

export const mockNews: News[] = [
  {
    id: '1',
    title: 'Encontro Regional de Instituições Agregadas',
    date: '24 Mar, 2026',
    author: 'Equipe MEP',
    authorId: 'system',
    summary: 'Discussão sobre o papel das instituições no cenário atual e novas parcerias estratégicas.',
    content: 'O encontro reuniu representantes de diversas casas para debater o futuro do movimento espírita progressista...',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  },
  {
    id: '2',
    title: 'Lançamento da Campanha de Inverno 2026',
    date: '20 Mar, 2026',
    author: 'Departamento Social',
    authorId: 'system',
    summary: 'Arrecadação de agasalhos e cobertores para comunidades vulneráveis da região metropolitana.',
    content: 'A campanha deste ano visa dobrar a meta de arrecadação do ano passado, focando em cobertores novos...',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  },
  {
    id: '3',
    title: 'Seminário: Espiritualidade e Ciência',
    date: '15 Mar, 2026',
    author: 'Dr. Ricardo Silva',
    authorId: 'system',
    summary: 'Pesquisadores debatem a integração entre o conhecimento científico e a fé racional.',
    content: 'O seminário abordou temas como física quântica e mediunidade, trazendo uma perspectiva acadêmica...',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  }
];

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Palestra: O Caminho do Autoconhecimento',
    date: '28 Mar',
    time: '19:30',
    location: 'Auditório Central',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800',
    description: 'Uma jornada profunda para dentro de si mesmo, explorando as bases da reforma íntima.',
    createdAt: now
  },
  {
    id: '2',
    title: 'Oficina de Voluntariado',
    date: '02 Abr',
    time: '14:00',
    location: 'Sala de Reuniões',
    image: 'https://images.unsplash.com/photo-1559027615-cd26736f5df4?auto=format&fit=crop&q=80&w=800',
    description: 'Treinamento para novos voluntários interessados em atuar nas frentes de assistência social.',
    createdAt: now
  },
  {
    id: '3',
    title: 'Festa da Primavera Beneficente',
    date: '12 Abr',
    time: '10:00',
    location: 'Pátio Externo',
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=800',
    description: 'Evento de confraternização com barracas de comidas típicas e artesanato, com renda revertida para as obras da casa.',
    createdAt: now
  }
];

export const mockInstitutions: Institution[] = [
  {
    id: '1',
    name: 'Centro Espírita Luz e Amor',
    description: 'Instituição dedicada ao estudo e à prática da caridade há mais de 50 anos, com foco em educação infantil.',
    email: 'contato@luzeamor.org.br.br',
    socials: {
      instagram: '@luzeamor',
      facebook: 'facebook.com/luzeamor',
      youtube: 'youtube.com/luzeamor'
    },
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  },
  {
    id: '2',
    name: 'Fraternidade dos Discípulos',
    description: 'Grupo de estudos avançados e assistência espiritual, focado na divulgação da filosofia espírita progressista.',
    email: 'secretaria@discipulos.org.br.br',
    socials: {
      instagram: '@discipulos_mep',
      twitter: '@discipulos_mep'
    },
    image: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  },
  {
    id: '3',
    name: 'Casa do Caminho Renovado',
    description: 'Focada em acolhimento psicológico e espiritual, com diversos grupos de apoio e oficinas terapêuticas.',
    email: 'acolhimento@caminhorenovado.org.br.br',
    socials: {
      instagram: '@caminhorenovado',
      facebook: 'facebook.com/caminhorenovado'
    },
    image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=800',
    createdAt: now
  }
];

export const mockArticles: Article[] = Array.from({ length: 15 }, (_, i) => ({
  id: `${i + 1}`,
  title: `Artigo Científico-Espírita ${i + 1}`,
  subtitle: `Uma análise profunda sobre o tema ${i + 1} na visão progressista.`,
  author: i % 2 === 0 ? 'Dr. Paulo Mendes' : 'Dra. Helena Costa',
  authorId: 'system',
  date: `${25 - i} Mar, 2026`,
  content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  createdAt: now
}));

export const mockSlides: Slide[] = [
  {
    id: '1',
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=2000",
    title: "Movimento Espírita Progressista",
    subtitle: "um espaço de convivência",
    link: "/sobre"
  },
  {
    id: '2',
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=2000",
    title: "União e Fraternidade",
    subtitle: "Construindo pontes entre instituições",
    link: "/instituicoes"
  },
  {
    id: '3',
    image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=2000",
    title: "Ação Social e Espiritualidade",
    subtitle: "Transformando vidas através do amor",
    link: "/eventos"
  }
];

export const mockFeaturedModules: FeaturedModule[] = [
  {
    id: '1',
    title: "Nossas Instituições",
    desc: "Conheça as casas que fazem parte do nosso movimento.",
    img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800",
    color: "bg-blue-600",
    link: "/instituicoes"
  },
  {
    id: '2',
    title: "Biblioteca Digital",
    desc: "Acesse obras raras e conteúdos exclusivos para estudo.",
    img: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800",
    color: "bg-amber-600",
    link: "/artigos"
  },
  {
    id: '3',
    title: "Seja um Voluntário",
    desc: "Descubra como você pode ajudar em nossas frentes de ação.",
    img: "https://images.unsplash.com/photo-1559027615-cd26736f5df4?auto=format&fit=crop&q=80&w=800",
    color: "bg-rose-600",
    link: "/contato"
  }
];
