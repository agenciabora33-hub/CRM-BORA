import { AgencySettings, Lead } from '../types/crm';

function offsetIsoDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DEFAULT_SETTINGS: AgencySettings = {
  companyName: 'Sua Agência',
  logoUrl: '',
  teamMembers: ['Sócio 1', 'Sócio 2'],
  activeUser: 'Sócio 1',
  appsScriptUrl: '',
  lastSyncedAt: null,
};

export function createSeedLeads(): Lead[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

  return [
    {
      id: 'seed-lead-1',
      createdAt: hoursAgo(96),
      updatedAt: hoursAgo(12),
      owner: 'Sócio 1',
      companyName: 'Clínica Odontológica Sorriso Vital',
      contactName: 'Dra. Camila Mendes',
      phone: '(11) 99482-3104',
      websiteOrSocial: '@sorrisovital.odonto',
      niche: 'Clínica',
      status: 'Reunião / Proposta',
      callCount: 3,
      estimatedValue: 4800,
      nextFollowUp: offsetIsoDate(0),
      notes: '10/11: Pediu proposta com agendamento online e página de implantes. Retornar hoje às 14h.',
    },
    {
      id: 'seed-lead-2',
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(24),
      owner: 'Sócio 2',
      companyName: 'Trattoria Bella Massa',
      contactName: 'Ricardo Bellini',
      phone: '(11) 98711-5520',
      websiteOrSocial: 'Site antigo sem responsividade',
      niche: 'Restaurante',
      status: 'Interesse / Conversa',
      callCount: 2,
      estimatedValue: 3200,
      nextFollowUp: offsetIsoDate(-1),
      notes: '08/11: Gostou da ideia de cardápio digital integrado ao WhatsApp para reservas.',
    },
    {
      id: 'seed-lead-3',
      createdAt: hoursAgo(48),
      updatedAt: hoursAgo(18),
      owner: 'Sócio 1',
      companyName: 'Almeida & Costa Advocacia',
      contactName: 'Dr. Henrique Almeida',
      phone: '(21) 99204-8812',
      websiteOrSocial: 'Não possui site',
      niche: 'Advocacia',
      status: 'Contato Feito',
      callCount: 1,
      estimatedValue: 4200,
      nextFollowUp: offsetIsoDate(2),
      notes: 'Recepcionista passou o WhatsApp direto do sócio para enviarmos portfólio jurídico.',
    },
    {
      id: 'seed-lead-4',
      createdAt: hoursAgo(120),
      updatedAt: hoursAgo(6),
      owner: 'Sócio 2',
      companyName: 'Studio Lumière Estética Avançada',
      contactName: 'Juliana Ferreira',
      phone: '(31) 99832-1190',
      websiteOrSocial: '@studiolumiere.bh',
      niche: 'Estética',
      status: 'Fechado (Ganho)',
      callCount: 4,
      estimatedValue: 5500,
      nextFollowUp: '',
      notes: 'Fechado pacote institucional + landing page para campanha de harmonização.',
    },
    {
      id: 'seed-lead-5',
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(30),
      owner: 'Sócio 1',
      companyName: 'Horizonte Imóveis Urbanos',
      contactName: 'Marcos Tavares',
      phone: '(41) 99155-7340',
      websiteOrSocial: 'horizonteimoveis.com.br (lento)',
      niche: 'Imobiliária',
      status: 'Para Prospectar',
      callCount: 0,
      estimatedValue: 6500,
      nextFollowUp: offsetIsoDate(1),
      notes: 'Site atual demora 8s no mobile. Oportunidade de redesign completo com filtros rápidos.',
    },
    {
      id: 'seed-lead-6',
      createdAt: hoursAgo(160),
      updatedAt: hoursAgo(50),
      owner: 'Sócio 2',
      companyName: 'Auto Center Avenida',
      contactName: 'Carlos Eduardo',
      phone: '(11) 97640-2219',
      websiteOrSocial: 'Não possui site',
      niche: 'Comércio',
      status: 'Perdido',
      callCount: 3,
      estimatedValue: 2500,
      nextFollowUp: '',
      notes: 'Optou por manter apenas anúncios locais no momento; revisitar no próximo trimestre.',
    },
  ];
}
