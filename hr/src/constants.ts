import { Application } from './types';

export const MOCK_APPLICATIONS: Partial<Application>[] = [
  {
    id: "mock-1",
    candidateName: "Ali Valiyev",
    candidateEmail: "ali@example.com",
    position: "Frontend Developer",
    score: 85,
    status: "pending",
    conflictDetected: false,
    phone: "+998 90 123 45 67",
    telegram: "@ali_valiyev",
    maskedData: {
      skills: ["React", "TypeScript", "Tailwind"],
      experience: "3 yil tajriba, Fintech loyihalarda ishlagan.",
      education: "TATU Bakalavr (Moliya yo'nalishi)",
      summary: "Tajribali frontend dasturchi, UI/UX ga qiziqadi."
    }
  },
  {
    id: "mock-2",
    candidateName: "Zilola G'aniyeva",
    candidateEmail: "zilola@example.com",
    position: "HR Manager (Adliya)",
    score: 92,
    status: "shortlisted",
    conflictDetected: false,
    phone: "+998 91 555 44 33",
    telegram: "@zilola_hr",
    maskedData: {
      skills: ["HR", "Recruitment", "Conflict Resolution"],
      experience: "5 yil tajriba, xalqaro kompaniyalar.",
      education: "WIUT Masters",
      summary: "Kadrlar bilan ishlash bo'yicha mutaxassis."
    }
  },
  {
    id: "mock-3",
    candidateName: "Sardor Ahmedov",
    candidateEmail: "sardor@example.com",
    position: "Backend Developer (SSV)",
    score: 45,
    status: "pending",
    conflictDetected: true,
    conflictDetails: "Vazir o'rinbosarining jiyani (Identified via MyGov integration)",
    phone: "+998 93 111 22 33",
    telegram: "@sardor_back",
    maskedData: {
      skills: ["PHP", "Basic SQL"],
      experience: "6 oy tajriba.",
      education: "Diplomsiz",
      summary: "Yangi boshlovchi, o'rganishga tayyor."
    }
  },
  {
    id: "mock-4",
    candidateName: "Nodira Toshmatova",
    candidateEmail: "nodira@example.com",
    position: "Mobile Developer (IT Park)",
    score: 78,
    status: "reviewing",
    conflictDetected: false,
    phone: "+998 94 444 55 66",
    telegram: "@nodira_mob",
    maskedData: {
      skills: ["Flutter", "Dart", "Firebase"],
      experience: "2 yil tajriba.",
      education: "Inha Universiteti",
      summary: "Mobil ilovalar yaratishga ixtisoslashgan."
    }
  },
  {
    id: "mock-5",
    candidateName: "Jahongir Ortiqov",
    candidateEmail: "jahongir@example.com",
    position: "Backend Developer",
    score: 98,
    status: "pending",
    conflictDetected: false,
    phone: "+998 97 777 88 99",
    telegram: "@jahongir_dev",
    maskedData: {
      skills: ["Go", "Kubernetes", "PostgreSQL"],
      experience: "10 yil tajriba, Yuqori yuklamali tizimlar.",
      education: "MIT (Online Certificate), TATU",
      summary: "Senior darajadagi arxitektor."
    }
  },
  {
    id: "mock-6",
    candidateName: "Kamola Karimova",
    candidateEmail: "kamola@example.com",
    position: "UI/UX Designer",
    score: 88,
    status: "pending",
    conflictDetected: false,
    maskedData: {
      skills: ["Figma", "Adobe XD", "Prototyping"],
      experience: "4 yil tajriba.",
      education: "Milliy Rasm va Dizayn Instituti",
      summary: "Ijodiy fikrlaydigan dizayner."
    }
  },
  {
    id: "mock-7",
    candidateName: "Rustam Soliyev",
    candidateEmail: "rustam@example.com",
    position: "DevOps Engineer",
    score: 65,
    status: "pending",
    conflictDetected: false,
    maskedData: {
      skills: ["Docker", "Jenkins", "AWS"],
      experience: "3 yil tajriba.",
      education: "Toshkent Politexnika",
      summary: "Infrastruktura avtomatlashtirish bo'yicha mutaxassis."
    }
  },
  {
    id: "mock-8",
    candidateName: "Dildora Yo'ldosheva",
    candidateEmail: "dildora@example.com",
    position: "Data Scientist",
    score: 35,
    status: "pending",
    conflictDetected: true,
    conflictDetails: "HR bo'limi boshlig'ining sobiq sinfdoshi",
    maskedData: {
      skills: ["Excel", "Python (Basics)"],
      experience: "1 yil tajriba.",
      education: "Tahririyat mutaxassisi",
      summary: "Ma'lumotlar bilan ishlashni xohlaydi."
    }
  },
  {
    id: "mock-9",
    candidateName: "Botir Ismoilov",
    candidateEmail: "botir@example.com",
    position: "Frontend Developer",
    score: 72,
    status: "pending",
    conflictDetected: false,
    maskedData: {
      skills: ["Vue.js", "JavaScript"],
      experience: "2 yil tajriba.",
      education: "SamDU",
      summary: "Soddalikni xush ko'ruvchi dasturchi."
    }
  },
  {
    id: "mock-10",
    candidateName: "Otabek Madaminov",
    candidateEmail: "otabek@example.com",
    position: "Product Manager",
    score: 82,
    status: "pending",
    conflictDetected: false,
    maskedData: {
      skills: ["Scrum", "Agile", "Jira"],
      experience: "4 yil tajriba.",
      education: "Westminster",
      summary: "Mahsulot boshqaruvchisi, natijaga yo'naltirilgan."
    }
  }
];
