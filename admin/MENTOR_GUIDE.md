# EthicFlow AI — Mentorlar uchun loyiha qo'llanmasi

**EthicFlow AI** — bu davlat organlaridagi jarayonlarni (kadrlar tanlovi, tenderlar, ichki audit) monitoring qilish va korrupsion xavflarni sun'iy intellekt yordamida aniqlash uchun yaratilgan platforma prototipidir.

---

## 1. Boshqaruv paneli (Dashboard)
Bu bo'limda tizimning umumiy holati va global tahlillar aks etadi.

*   **Statistik modullar:** Yuqori xavfli holatlar soni, umumiy jarayonlar va korrupsiyaning oldini olish orqali tejalgan mablag'lar real vaqtda ko'rsatiladi.
*   **Xavf taqsimoti (Bar Chart):** Tashkilotdagi xavf darajalarini "Past", "O'rta" va "Yuqori" toifalarga bo'lib vizuallashtiradi.
*   **Anomaliyalar dinamikasi (Line Chart):** Haftalar kesimida shubhali harakatlar o'sishi yoki kamayishini ko'rsatadi.

## 2. Jonli monitoring (Real-time Monitor)
Tizim "Jonli ma'lumotlar oqimi" (Live Data Stream) bilan ishlaydi.

*   **Qanday ishlaydi?** Tizim har 4 soniyada jarayonlarni qayta tahlil qiladi va xavf indeksi o'zgarganda jadval avtomatik ravishda "shuffle" (qayta tartiblash) bo'ladi.
*   **Animatsiyalar:** `motion/react` (Framer Motion) yordamida jadval qatorlari silliq harakatlanadi, bu esa foydalanuvchiga ma'lumotlarning jonli ekanligini his qildiradi.

## 3. Kadrlar bo'limi (Recruitment & Nepotism Detector)
Loyiha kadrlar tanlovida inson omilini kamaytirishga qaratilgan.

*   **Blind Assessment:** Nomzodlarning ism-sharifi yashirilgan holda faqat ularning ID raqamlari va tajriba ko'rsatkichlari (Merit Score) taqdim etiladi.
*   **Nepotizm filtri:** Nomzodning oilaviy aloqalari yoki sobiq hamkorlari o'rganiladi. Agar nomzod yuqori lavozimdagi rahbar bilan aloqador bo'lsa, tizim "Yuqori xavf" (High Risk) belgisini qo'yadi.

## 4. "Tekshirish" funksiyasi (Advanced Investigation)
Bu platformaning eng murakkab qismlaridan biridir.

*   **Interaktiv hisobot:** "Tekshirish" tugmasi bosilganda barcha ma'lumotlar (ballar, aniqlangan qarindoshlik aloqalari, xavf sabablari) to'plangan interaktiv modal oyna ochiladi.
*   **Automated Block:** Agar xavf darajasi yuqori bo'lsa va menejer nomzodni tasdiqlashga urinsa, tizim avtomatik ravishda jarayonni bloklaydi.
*   **Reporting:** Bloklangan holat bo'yicha to'g'ridan-to'g'ri vakolatli organlarga (masalan, Korrupsiyaga qarshi kurashish agentligi) rasmiy xabar yuborish imkoniyati simulyatsiya qilingan.

## 5. Davlat xaridlari (Tenders)
Tenderlar bo'limida har bir xarid jarayoni o'zining "Xavf indeksi"ga ega.

*   **Anomaliyalar:** Muddatning juda qisqaligi, yagona ishtirokchining mavjudligi yoki narxning bozor narxiga nisbatan sun'iy oshirilishi kabi holatlar qizil bayroqchalar (Flag) bilan belgilanadi.

## 6. Global qidiruv va Bildirishnomalar
*   **Search Engine:** Barcha holatlarni nomi, ID raqami yoki tashkilot nomi bo'yicha oniy qidirish imkoniyati.
*   **Alert Feed:** Tizimda sodir bo'layotgan muhim hodisalar (Xavf aniqlanishi, blokirovka, tizim xabarlari) bildirishnomalar panelida yig'iladi.

---

## Foydalanilgan texnologiyalar
1.  **React + TypeScript:** Tizimning mustahkamligi va turdosh xatolarning oldini olish uchun.
2.  **Tailwind CSS:** Professional "Dark Mode" va premium vizual ko'rinish uchun.
3.  **Framer Motion:** Silliq interfeys va "pro" darajadagi foydalanuvchi tajribasi (UX) uchun.
4.  **Lucide React:** Minimalistik va tushunarli ikonkalarni yaratish uchun.
5.  **Recharts:** Murakkab ma'lumotlarni tushunarli grafik ko'rinishiga keltirish uchun.
