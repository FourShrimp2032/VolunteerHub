import { BarChart3, Building2, Lock, Mail, Medal, ShieldCheck, Trophy, Users } from "lucide-react";
import { Badge, ButtonLink, Card } from "@/components/ui/primitives";

export const metadata = { title: "Corporate Volunteerhub" };

const FEATURES = [
  { icon: Building2, t: "Корпоративний простір", d: "Окрема спільнота компанії з брендуванням, учасниками та адміністраторами." },
  { icon: Users, t: "Команди працівників", d: "Офіси, відділи, волонтерські групи. Кожна зі своїм прогресом." },
  { icon: Trophy, t: "Корпоративні челенджі", d: "«Допоможемо 10 новим зборам знайти перших 100 відвідувачів» усім офісом." },
  { icon: Medal, t: "Внутрішні досягнення", d: "Бейджі та рівні за участь працівників, не за суми донатів." },
  { icon: BarChart3, t: "Дашборди участі", d: "Скільки людей долучилися, скільки зборів отримали підтримку." },
  { icon: ShieldCheck, t: "Агрегована аналітика впливу", d: "Звіти для ESG і внутрішніх комунікацій без персональних даних донатів." },
];

export default function BusinessPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(60%_80%_at_70%_0%,black,transparent)]" aria-hidden />
        <div className="pointer-events-none absolute right-[-120px] top-[-200px] h-[420px] w-[720px] rounded-full bg-[radial-gradient(closest-side,oklch(0.53_0.2_262/0.14),transparent)]" aria-hidden />
        <div className="container-page relative py-20 sm:py-28">
          <Badge tone="accent">Corporate Volunteerhub · ранній доступ</Badge>
          <h1 className="mt-6 max-w-3xl text-balance text-[38px] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-[60px]">Волонтерство вашої команди, яке видно.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Організуйте ініціативи працівників, челенджі та командну підтримку зборів в одному просторі. Компанії платять за програмне забезпечення, а не за контроль над донатами.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#contact" size="lg">Обговорити пілот</ButtonLink>
            <ButtonLink href="/communities" size="lg" variant="secondary">Подивитися спільноти</ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.t} className="p-6">
              <span className="grid size-10 place-items-center rounded-lg border border-accent-border/60 bg-accent-soft text-accent"><f.icon className="size-5" aria-hidden /></span>
              <p className="mt-4 font-heading font-bold tracking-tight">{f.t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-page mt-20 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Чесні правила для бізнесу</h2>
          <p className="mt-3 text-fg-muted">Компанії не можуть купити місце в рекомендаціях чи позначку перевірки. Корпоративні челенджі спрямовують увагу працівників, а органічне ранжування для всіх однакове.</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {["Кошти завжди йдуть напряму на банки організаторів", "Жодного прихованого просування", "Метрики участі без доступу до персональних фінансових даних", "Можна почати з безкоштовної спільноти вже сьогодні"].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><Lock className="size-4 text-accent" /> {t}</li>
            ))}
          </ul>
        </div>
        <Card id="contact" className="p-7">
          <p className="font-heading text-xl font-bold tracking-tight">Пілот для вашої компанії</p>
          <p className="mt-2 text-sm text-fg-muted">
            Корпоративні простори зараз у розробці. Уже сьогодні ви можете створити безкоштовну спільноту типу «Компанія», запросити колег і запустити челендж.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <ButtonLink href="/communities">Створити спільноту</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">Порівняти тарифи</ButtonLink>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-fg-subtle"><Mail className="size-3.5" /> Форма заявки на пілот з'явиться разом із корпоративними просторами.</p>
        </Card>
      </section>
    </div>
  );
}
