/**
 * Subscription plan structure. Billing is intentionally NOT implemented yet:
 * `users.plan` exists so Pro features can be gated later.
 *
 * Monetization principles (enforced by design):
 *  - verification badges are never sold;
 *  - basic fundraising and fair discovery are always free;
 *  - plan is never an input to discovery ranking (see lib/discovery.ts).
 */
export const PLANS = [
  {
    key: "free",
    name: "Free",
    priceUah: 0,
    audience: "Для волонтерів та донорів",
    features: ["Створення та керування зборами", "Базова аналітика", "Оновлення для донорів", "Звіти про витрати", "Чесне просування в каталозі"],
  },
  {
    key: "pro",
    name: "Pro",
    priceUah: 799,
    audience: "Для фондів та команд",
    features: ["Розширена аналітика", "Командна робота", "Автоматизовані звіти", "Експорт даних", "Додаткові інструменти керування", "API (згодом)"],
    available: false,
  },
  {
    key: "corporate",
    name: "Corporate",
    priceUah: null,
    audience: "Для компаній",
    features: ["Корпоративний простір", "Команди працівників", "Корпоративні челенджі", "Внутрішні досягнення", "Дашборди участі", "Агрегована аналітика впливу"],
    available: false,
  },
] as const;
