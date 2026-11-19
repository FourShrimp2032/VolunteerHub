"use client";

import { ExternalLink, Heart, Info, Server } from "lucide-react";
import * as React from "react";
import { Alert, Card, Skeleton, buttonVariants } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RiseWords } from "@/components/motion";

export default function SupportPage() {
  const [url, setUrl] = React.useState<string | null | undefined>(undefined);
  React.useEffect(() => {
    api<{ platformSupportUrl: string | null }>("/meta").then((m) => setUrl(m.platformSupportUrl)).catch(() => setUrl(null));
  }, []);
  return (
    <div className="container-page max-w-3xl pt-12 sm:pt-16">
      <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger"><Heart className="size-6" /></span>
      <RiseWords as="h1" text="Підтримати Volunteerhub" className="mt-6 text-balance text-[clamp(40px,6.2vw,92px)] font-medium leading-[0.98] tracking-[-0.05em]" />
      <p className="mt-4 text-lg leading-relaxed text-fg-muted">
        Volunteerhub безкоштовний для донорів і волонтерів, і ми не беремо комісії зі зборів. Якщо хочете допомогти розвитку та підтримці платформи, це можна зробити добровільно.
      </p>
      <Alert tone="warning" icon={<Info />} className="mt-8">
        <b>Це не донат на збір.</b> Кошти йдуть на розвиток платформи (сервери, модерацію, розробку) на окремий рахунок Volunteerhub. Щоб допомогти конкретному збору, використовуйте кнопку на його сторінці.
      </Alert>
      <Card className="mt-6 p-6">
        <p className="flex items-center gap-2 font-semibold"><Server className="size-4.5" /> Рахунок підтримки платформи</p>
        {url === undefined ? (
          <Skeleton className="mt-4 h-11 w-60" />
        ) : url ? (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
            Підтримати платформу <ExternalLink />
          </a>
        ) : (
          <p className="mt-3 text-sm text-fg-muted">Окремий рахунок для підтримки платформи ще не підключено. Ми додамо його тут, щойно його буде відкрито. Поки що найкраща підтримка — поширювати збори, яким потрібна увага.</p>
        )}
      </Card>
    </div>
  );
}
