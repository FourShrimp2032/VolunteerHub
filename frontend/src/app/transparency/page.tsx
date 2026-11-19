import { BadgeCheck, Ban, Eye, FileCheck2, Info, Landmark, Lock, ScanSearch, Scale } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui/primitives";
import { RiseWords } from "@/components/motion";

export const metadata = { title: "Прозорість і перевірки" };

const CHECKS = [
  { icon: BadgeCheck, t: "Особу перевірено", how: "Організатор надсилає документ через приватну форму в профілі. Модератор переглядає його вручну. Документ зберігається окремо від публічних файлів і доступний лише модераторам." },
  { icon: ScanSearch, t: "Мету перевірено", how: "Кожен збір проходить модерацію перед публікацією. Модератор перевіряє опис, бюджет і документи. Сумнівні збори відхиляються з поясненням." },
  { icon: Landmark, t: "Банку перевірено", how: "Модератор відкриває банку Monobank за посиланням і звіряє її з організатором. Якщо організатор змінює посилання, позначка автоматично знімається." },
  { icon: FileCheck2, t: "Звіт опубліковано", how: "З'являється, коли організатор публікує фінальний звіт про витрати з чеками чи фото." },
];

export default function TransparencyPage() {
  return (
    <div className="container-page pt-12 sm:pt-16">
      <div className="max-w-3xl">
        <p className="text-[13px] font-medium text-accent">Довіра та прозорість</p>
        <RiseWords as="h1" text="Як Volunteerhub перевіряє збори" className="mt-4 text-balance text-[clamp(40px,6.2vw,92px)] font-medium leading-[0.98] tracking-[-0.05em]" />
        <p className="mt-4 text-lg leading-relaxed text-fg-muted">Ми показуємо лише ті позначки, за якими справді стоїть перевірка. Якщо чогось не перевіряли, ви побачите це на сторінці збору.</p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {CHECKS.map((c) => (
          <Card key={c.t} className="p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-success-soft text-success"><c.icon className="size-5" /></span>
            <p className="mt-4 text-lg font-semibold">{c.t}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{c.how}</p>
          </Card>
        ))}
      </div>

      <section className="mt-16 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <Info className="size-5 text-accent" />
          <p className="mt-3 font-semibold">Звідки суми зібраного</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Ми читаємо баланс банок з їхньої публічної сторінки, як її бачить будь-який донор, кожні кілька хвилин. Сума збору складається з банки організації та всіх допоміжних банок; якщо помічники переказують кошти на банку організації, ми не рахуємо їх удруге. З підключеним офіційним API Monobank сума організації оновлюється миттєво й позначена «Наживо з банки Monobank».
          </p>
        </Card>
        <Card className="p-6">
          <Lock className="size-5 text-accent" />
          <p className="mt-3 font-semibold">Ми не торкаємося грошей</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">Volunteerhub не є платіжним сервісом. Кнопка донату веде на офіційну сторінку send.monobank.ua, і кошти надходять напряму на банку організації або помічника. Основні збори створюють лише перевірені організації, а допоміжну банку організація може приховати, якщо не впізнає її.</p>
        </Card>
        <Card className="p-6">
          <Scale className="size-5 text-accent" />
          <p className="mt-3 font-semibold">Чесне просування</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Рекомендації враховують новизну, малу кількість переглядів, перевірки, терміновість, близькість до цілі та ваші інтереси. Тариф і гроші на ранжування не впливають.
          </p>
        </Card>
      </section>

      <section className="mt-16 rounded-3xl border border-border bg-surface p-8 shadow-card">
        <h2 className="text-2xl font-bold tracking-tight">Як скласти хороший звіт</h2>
        <ol className="mt-5 grid gap-4 text-sm leading-relaxed text-fg-muted md:grid-cols-3">
          <li><b className="text-fg">1. Покажіть закупівлю.</b> Опублікуйте оновлення типу «Закупівля» з рахунком чи накладною.</li>
          <li><b className="text-fg">2. Покажіть результат.</b> Фото передачі, лист подяки чи акт приймання. Без облич, якщо це небезпечно.</li>
          <li><b className="text-fg">3. Підсумуйте.</b> Фінальний звіт: скільки зібрано, скільки витрачено, куди пішов залишок.</li>
        </ol>
      </section>

      <section className="mt-10 flex flex-col gap-4 rounded-3xl bg-subtle p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Ban className="mt-1 size-5 text-danger" />
          <div>
            <p className="font-semibold">Бачите підозрілий збір?</p>
            <p className="text-sm text-fg-muted">Натисніть «Поскаржитися на збір» унизу його сторінки. Модератори розглянуть скаргу.</p>
          </div>
        </div>
        <ButtonLink href="/explore" variant="secondary"><Eye /> До зборів</ButtonLink>
      </section>
    </div>
  );
}
