/**
 * Builds seed/demo.sql — FICTIONAL demo data, clearly marked with is_demo = 1.
 *
 * Demo organizers have no password and cannot sign in. Demo campaigns carry no
 * verification marks, because no real check happened for them.
 * Usage: npx tsx seed/build-seed.ts > seed/demo.sql
 */
const DAY = 86_400_000;
const now = Date.now();
const q = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "1" : "0") : `'${String(v).replace(/'/g, "''")}'`);

const out: string[] = ["-- Volunteerhub DEMO data (fictional). Safe to re-run.", ""];
const insert = (table: string, row: Record<string, unknown>) => {
  const cols = Object.keys(row);
  out.push(`INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => q(row[c])).join(", ")});`);
};

const organizers = [
  { id: "demo_u_olena", name: "Олена Коваль (демо)", city: "Київ", bio: "Вигаданий профіль для демонстрації. Координує допомогу госпіталям." },
  { id: "demo_u_andrii", name: "Андрій Мельник (демо)", city: "Харків", bio: "Вигаданий профіль для демонстрації. Волонтер, допомагає підрозділам на сході." },
  { id: "demo_u_iryna", name: "Ірина Бондар (демо)", city: "Львів", bio: "Вигаданий профіль для демонстрації. Організовує освітні проєкти для дітей." },
  { id: "demo_u_taras", name: "Тарас Шевчук (демо)", city: "Дніпро", bio: "Вигаданий профіль для демонстрації. Займається відбудовою житла." },
  { id: "demo_u_sofia", name: "Софія Литвин (демо)", city: "Одеса", bio: "Вигаданий профіль для демонстрації. Опікується тваринами з прифронтових міст." },
];
for (const o of organizers) {
  insert("users", {
    id: o.id,
    email: `${o.id}@demo.volunteerhub.invalid`,
    password_hash: null,
    name: o.name,
    bio: o.bio,
    city: o.city,
    role: "user",
    plan: "free",
    interests: "[]",
    referral_code: o.id.replace("demo_u_", "demo"),
    xp: 120,
    is_demo: 1,
    created_at: now - 60 * DAY,
  });
}

type Demo = {
  slug: string; org: string; title: string; summary: string; category: string; city: string; goal: number; raised: number;
  publishedDaysAgo: number; views: number; deadlineDays?: number; urgent?: boolean; status?: string; budget: [string, number][];
  updates?: { kind: string; title: string; body: string; spent?: number; daysAgo: number }[];
};

const campaigns: Demo[] = [
  { slug: "demo-dron-rozvidnyk", org: "demo_u_andrii", title: "Розвідувальний дрон для екіпажу аеророзвідки", summary: "Збираємо на квадрокоптер із тепловізором для групи аеророзвідки.", category: "army", city: "Харків", goal: 185000, raised: 151200, publishedDaysAgo: 9, views: 420, deadlineDays: 6, urgent: true, budget: [["Квадрокоптер з тепловізійною камерою", 158000], ["Запасні акумулятори (4 шт.)", 19000], ["Кейс і зарядна станція", 8000]] },
  { slug: "demo-generator-likarnia", org: "demo_u_olena", title: "Генератор для районної лікарні", summary: "Резервне живлення для операційного блоку під час відключень.", category: "medicine", city: "Київська обл.", goal: 240000, raised: 61300, publishedDaysAgo: 3, views: 38, deadlineDays: 21, budget: [["Дизельний генератор 30 кВт", 205000], ["Монтаж і автоматика (ATS)", 35000]] },
  { slug: "demo-dakh-dlia-rodyny", org: "demo_u_taras", title: "Новий дах для будинку родини Петренків", summary: "Відновлюємо дах після влучання уламків, поки не почалися морози.", category: "rebuild", city: "Дніпро", goal: 96000, raised: 88500, publishedDaysAgo: 14, views: 260, deadlineDays: 10, budget: [["Металочерепиця та кріплення", 58000], ["Дерев'яні крокви", 21000], ["Робота бригади", 17000]] },
  { slug: "demo-noutbuky-dlia-shkoly", org: "demo_u_iryna", title: "10 ноутбуків для сільської школи", summary: "Діти навчаються онлайн у бомбосховищі — техніки бракує.", category: "children", city: "Львівська обл.", goal: 150000, raised: 12400, publishedDaysAgo: 1, views: 12, budget: [["Ноутбуки (10 шт.)", 138000], ["Зарядні станції", 12000]] },
  { slug: "demo-korm-prytulok", org: "demo_u_sofia", title: "Корм і ліки для притулку на 80 тварин", summary: "Притулок прийняв тварин з евакуйованих сіл, запасів вистачить на тиждень.", category: "animals", city: "Одеса", goal: 42000, raised: 9800, publishedDaysAgo: 6, views: 25, deadlineDays: 12, budget: [["Сухий корм (400 кг)", 28000], ["Ветеринарні препарати", 14000]] },
  { slug: "demo-reabilitatsiia-veterana", org: "demo_u_olena", title: "Курс реабілітації для ветерана після ампутації", summary: "Сучасний протез і тримісячна фізична реабілітація.", category: "veterans", city: "Київ", goal: 320000, raised: 142000, publishedDaysAgo: 20, views: 510, budget: [["Протез гомілки", 240000], ["Курс фізичної терапії", 80000]] },
  { slug: "demo-vodoochyshchennia", org: "demo_u_taras", title: "Станція очищення води для громади", summary: "Після пошкодження водогону 2 000 людей залишились без питної води.", category: "community", city: "Херсонська обл.", goal: 210000, raised: 31000, publishedDaysAgo: 2, views: 19, urgent: true, budget: [["Модульна станція очищення", 176000], ["Доставка та запуск", 34000]] },
  { slug: "demo-humanitarni-nabory", org: "demo_u_sofia", title: "Продуктові набори для 150 літніх людей", summary: "Щомісячна допомога самотнім пенсіонерам у прифронтових селах.", category: "humanitarian", city: "Запорізька обл.", goal: 67500, raised: 49000, publishedDaysAgo: 11, views: 140, deadlineDays: 15, budget: [["Продуктові набори (150 шт.)", 60000], ["Пальне для доставки", 7500]] },
  { slug: "demo-starlink-medykam", org: "demo_u_andrii", title: "Starlink для евакуаційної бригади медиків", summary: "Стабільний зв'язок для швидкої координації евакуацій.", category: "army", city: "Донецька обл.", goal: 38000, raised: 38000, publishedDaysAgo: 18, views: 330, status: "goal_reached", budget: [["Комплект Starlink", 31000], ["Павербанк та кріплення", 7000]] },
  { slug: "demo-aptechky-ifak", org: "demo_u_olena", title: "50 тактичних аптечок IFAK", summary: "Аптечки для новосформованого батальйону.", category: "medicine", city: "Київ", goal: 125000, raised: 125000, publishedDaysAgo: 45, views: 890, status: "completed", budget: [["Аптечки IFAK (50 шт.)", 125000]],
    updates: [
      { kind: "update", title: "Половину суми зібрано", body: "Дякуємо всім! Вже замовили перші 25 аптечок у перевіреного постачальника.", daysAgo: 35 },
      { kind: "purchase", title: "Аптечки закуплено", body: "Усі 50 аптечок закуплено та укомплектовано. Додаємо фото накладної.", spent: 123400, daysAgo: 25 },
      { kind: "final_report", title: "Фінальний звіт", body: "Аптечки передано підрозділу. Витрачено 123 400 ₴, залишок 1 600 ₴ спрямовано на джгути. Дякуємо кожному!", spent: 125000, daysAgo: 20 },
    ] },
  { slug: "demo-psykholohichna-pidtrymka", org: "demo_u_iryna", title: "Арт-терапія для дітей переселенців", summary: "Безкоштовні заняття з психологом для 40 дітей протягом трьох місяців.", category: "children", city: "Львів", goal: 54000, raised: 8000, publishedDaysAgo: 4, views: 31, budget: [["Оплата психолога (3 міс.)", 42000], ["Матеріали для творчості", 12000]] },
  { slug: "demo-okna-shkola", org: "demo_u_taras", title: "Вікна для школи після обстрілу", summary: "Замінюємо 24 вікна, щоб діти повернулися до класів до зими.", category: "rebuild", city: "Харківська обл.", goal: 180000, raised: 142500, publishedDaysAgo: 16, views: 205, deadlineDays: 18, budget: [["Металопластикові вікна (24 шт.)", 156000], ["Монтаж", 24000]] },
];

for (const c of campaigns) {
  const id = `demo_c_${c.slug.replace("demo-", "").replace(/-/g, "_")}`;
  const publishedAt = now - c.publishedDaysAgo * DAY;
  insert("campaigns", {
    id,
    slug: c.slug,
    organizer_id: c.org,
    title: c.title,
    summary: c.summary,
    description:
      `ДЕМО-ЗБІР: це вигаданий приклад для демонстрації Volunteerhub. Не надсилайте кошти.\n\n${c.summary}\n\n` +
      "Ми розписали бюджет нижче та публікуватимемо оновлення й звіт із чеками після закупівлі. Кожна гривня йде напряму на банку організатора — Volunteerhub не приймає та не зберігає донати.",
    category: c.category,
    city: c.city,
    goal_amount: c.goal,
    raised_amount: c.raised,
    raised_updated_at: now - DAY,
    deadline: c.deadlineDays ? now + c.deadlineDays * DAY : null,
    urgent: c.urgent ?? false,
    jar_url: null,
    jar_id: null,
    status: c.status ?? "active",
    view_count: c.views,
    is_demo: 1,
    submitted_at: publishedAt - DAY,
    published_at: publishedAt,
    goal_reached_at: c.status === "goal_reached" || c.status === "completed" ? publishedAt + 7 * DAY : null,
    completed_at: c.status === "completed" ? now - 20 * DAY : null,
    created_at: publishedAt - 2 * DAY,
    updated_at: now - DAY,
  });
  c.budget.forEach(([label, amount], i) => insert("budget_items", { id: `${id}_b${i}`, campaign_id: id, label, amount, position: i }));
  (c.updates ?? []).forEach((u, i) =>
    insert("campaign_updates", { id: `${id}_u${i}`, campaign_id: id, author_id: c.org, kind: u.kind, title: u.title, body: u.body, spent_amount: u.spent ?? null, file_ids: "[]", created_at: now - u.daysAgo * DAY }),
  );
}

const communities = [
  { id: "demo_cm_kpi", slug: "demo-studenty-kpi", name: "Студенти КПІ (демо)", kind: "university", description: "Вигадана демо-спільнота студентів, які допомагають новим зборам знайти підтримку." },
  { id: "demo_cm_it", slug: "demo-it-kompaniia", name: "IT-компанія «Сигнал» (демо)", kind: "company", description: "Вигаданий приклад корпоративної спільноти для волонтерських ініціатив працівників." },
  { id: "demo_cm_team", slug: "demo-volonterska-komanda-skhid", name: "Волонтерська команда «Схід» (демо)", kind: "volunteer_team", description: "Вигадана демо-команда, яка допомагає новим організаторам." },
];
for (const c of communities) {
  insert("communities", { ...c, created_by: "demo_u_andrii", is_demo: 1, created_at: now - 30 * DAY });
  insert("community_members", { community_id: c.id, user_id: "demo_u_andrii", role: "owner", joined_at: now - 30 * DAY });
}
insert("community_members", { community_id: "demo_cm_kpi", user_id: "demo_u_iryna", role: "member", joined_at: now - 20 * DAY });
insert("community_members", { community_id: "demo_cm_it", user_id: "demo_u_olena", role: "member", joined_at: now - 20 * DAY });

const monthEnd = (() => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
})();
const globalChallenges = [
  { id: "ch_first_visitors", title: "Перші 100 відвідувачів для 10 нових зборів", description: "Діліться новими зборами (до 30 днів) — разом приведемо 1 000 відвідувачів.", metric: "referrals_new", target: 1000 },
  { id: "ch_share_verified", title: "Поширте 5 перевірених зборів цього місяця", description: "Особистий челендж: оберіть збори, що пройшли модерацію, і поділіться ними.", metric: "shares_verified", target: 5 },
  { id: "ch_new_organizers", title: "Допоможіть новим організаторам знайти прихильників", description: "Підписуйтесь на збори, опубліковані за останні 14 днів.", metric: "follows_new", target: 25 },
];
for (const ch of globalChallenges)
  insert("challenges", { ...ch, community_id: null, starts_at: now - 2 * DAY, ends_at: monthEnd + 30 * DAY, created_at: now - 2 * DAY });
insert("challenges", { id: "ch_kpi_share", community_id: "demo_cm_kpi", title: "Тиждень амбасадорів КПІ", description: "Поширимо 20 перевірених зборів усією спільнотою.", metric: "shares_verified", target: 20, starts_at: now - DAY, ends_at: now + 21 * DAY, created_at: now - DAY });

console.log(out.join("\n"));
