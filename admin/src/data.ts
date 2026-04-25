import { Case, Candidate, RiskStats, ExternalProject, AuctionLot, Procurement, NewsItem } from './types';

export const stats: RiskStats = {
  highRiskCases: 124,
  totalCases: 13068, // From data.egov total
  potentialSavings: "8.4M $"
};

export const cases: Case[] = [
  {
    id: 'EF-001',
    name: 'G‘aznachilik tizimini modernizatsiya qilish',
    organization: 'Iqtisodiyot va moliya vazirligi',
    type: 'Tender',
    riskScore: 88,
    description: 'Yagona g‘azna hisobvarag‘ini boshqarishning yangi dasturiy kompleksini xarid qilish.',
    anomalies: [
      'Atigi 1 ta ishtirokchi ariza topshirgan',
      'Narx bozor o‘rtacha ko‘rsatkichidan 45% yuqori',
      'Yetkazib beruvchi ushbu vazirlikda ketma-ket 5 marta tender yutgan'
    ]
  },
  {
    id: 'X-21796',
    name: 'Xodimlar yollash xizmati',
    organization: 'Navoiy viloyati, Karmana tumani',
    type: 'Tender',
    riskScore: 65,
    description: 'Uslugi po trudoustroystvu i podboru personala (xarid.uzex.uz ID: 21796)',
    anomalies: [
      'Qiymati yuqori: 68,181,818.2 UZS',
      'Deadline yaqin: 2026-05-01'
    ]
  },
  {
    id: 'A-23433296',
    name: 'Toshkent ekologik sertifikatlashtirish markazi МЧЖ',
    organization: 'Davlat ulushi (e-auksion.uz)',
    type: 'Tender',
    riskScore: 78,
    description: 'Davlat ulushini sotish auksioni. Start narxi: 1,089,006,300 UZS',
    anomalies: [
      'Ishtirokchilar soni kutilganidan kam (0 ta hozircha)',
      'Strategik obyektning xususiylashtirilishi monitoringi'
    ]
  },
  {
    id: 'EF-005',
    name: 'Davlat byudjeti ijrosi hisoboti',
    organization: 'Byudjet boshqarmasi',
    type: 'Document',
    riskScore: 92,
    description: 'Yillik davlat byudjeti ijrosi bo‘yicha yakuniy moliyaviy hisobot tasdiqlanishi.',
    anomalies: [
      'Jarayon vaqti anomaliyasi: 8 daqiqada tasdiqlangan (O‘rtacha: 3 kun)',
      'Bayram paytida vakolatsiz xodim tomonidan tasdiqlangan'
    ]
  }
];

export const externalProjects: ExternalProject[] = [
  {
    title: 'Qarjı ajıratıw haqqında',
    url: 'https://regulation.gov.uz/oz/d/114130',
    published_date: '24/04/2026',
    document_type: 'Kengash qarori',
    source: 'regulation.gov.uz'
  },
  {
    title: 'Olmazor tumani mahalliy byudjetining 2026-yildagi qoʻshimcha manbalarini xarajatlarga yoʻnaltirish toʻgʻrisida',
    url: 'https://regulation.gov.uz/oz/d/114129',
    published_date: '24/04/2026',
    document_type: 'Kengash qarori',
    source: 'regulation.gov.uz'
  }
];

export const newsItems: NewsItem[] = [
  {
    title: 'Kambag‘allik va ishsizlikdan xoli hududga aylanadi',
    url: 'https://pm.gov.uz/oz/lists/view/2742',
    published_date: '06.01.2026',
    summary: 'Mamlakatimizda kambag‘allikni qisqartirish, ehtiyojmand aholiga manzilli ijtimoiy yordam ko‘rsatilishini kengaytirish...',
    image_url: 'https://pm.gov.uz/uploads/9281998e-cfc8-b6d9-7dd1-d5f7cbc93cfc_news_.png'
  },
  {
    title: 'Olis ovulda yashayotganlar holidan xabar olindi',
    url: 'https://pm.gov.uz/oz/lists/view/2740',
    published_date: '04.01.2026',
    summary: 'Buxoro viloyati Romitan tumani “Qizilravot” mahalla fuqarolar yig‘ini hududidagi 38-umumta’lim maktabi...',
    image_url: 'https://pm.gov.uz/uploads/3eb34bdd-10aa-527b-179c-fdd3c8462bdd_news_.png'
  }
];

export const candidates: Candidate[] = [
  { 
    id: 'CND-101', 
    candidateName: 'Ali Valiyev',
    position: 'Frontend Developer',
    status: 'pending',
    score: 92, 
    conflictRisk: 'Low', 
    department: 'G‘aznachilik boshqarmasi',
    matchPercentage: 94,
    interviewTime: '2026-04-26 10:00',
    proctoringRisk: 5
  },
  { 
    id: 'CND-102', 
    candidateName: "Zilola G'aniyeva",
    position: 'HR Manager',
    status: 'shortlisted',
    score: 88, 
    conflictRisk: 'Low', 
    department: 'Byudjet siyosati departamenti',
    matchPercentage: 89,
    interviewTime: '2026-04-26 11:30',
    proctoringRisk: 12
  },
  { 
    id: 'CND-103', 
    candidateName: 'Sardor Ahmedov',
    position: 'Backend Developer',
    status: 'rejected',
    score: 42, 
    conflictRisk: 'High', 
    conflictDetails: 'Nomzod G‘aznachilik boshlig‘ining jiyani (Yaqin qarindosh)', 
    department: 'G‘aznachilik boshqarmasi',
    matchPercentage: 65,
    interviewTime: 'Rad etilgan',
    proctoringRisk: 0
  },
  { 
    id: 'CND-104', 
    candidateName: 'Nodira Toshmatova',
    position: 'Mobile Developer',
    status: 'reviewing',
    score: 85, 
    conflictRisk: 'Low', 
    department: 'Xodimlar sifatida muvofiqlikni baholash (Agentlik)',
    matchPercentage: 87,
    interviewTime: '2026-04-27 09:00',
    proctoringRisk: 85 // Detected cheating
  },
  { 
    id: 'CND-105', 
    candidateName: 'Dildora Yo`ldosheva',
    position: 'Data Scientist',
    status: 'rejected',
    score: 38, 
    conflictRisk: 'High', 
    conflictDetails: 'Bo‘lim boshlig‘ining sobiq biznes hamkori (Affillangan)', 
    department: 'Soliq siyosati departamenti',
    matchPercentage: 45,
    interviewTime: 'Rad etilgan',
    proctoringRisk: 0
  }
];

export const soliqGraphData = [
  { name: 'Andijon', entities: 17595, individuals: 116291 },
  { name: 'Buxoro', entities: 16936, individuals: 141812 },
  { name: 'Jizzax', entities: 25421, individuals: 161124 },
  { name: 'Qashqadaryo', entities: 14161, individuals: 99162 },
  { name: 'Navoiy', entities: 23074, individuals: 174991 },
  { name: 'Namangan', entities: 14738, individuals: 92594 },
  { name: 'Samarqand', entities: 18423, individuals: 137935 }
];

export const riskDistribution = [
  { name: 'Past', count: 1800, fill: '#10b981' },
  { name: 'O‘rta', count: 650, fill: '#f59e0b' },
  { name: 'Yuqori', count: 390, fill: '#ef4444' }
];

export const timelineData = [
  { name: 'Dekabr', value: 380693 },
  { name: 'Yanvar', value: 449793 },
  { name: 'Fevral', value: 418401 },
  { name: 'Mart', value: 397263 },
  { name: 'Aprel', value: 336776 }
];
