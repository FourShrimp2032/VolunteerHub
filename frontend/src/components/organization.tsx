"use client";

import { BadgeCheck, Building2, Clock, HandHeart, Lock, Upload, XCircle } from "lucide-react";
import * as React from "react";
import { Alert, Button, ButtonLink, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import { useToast } from "@/lib/toast";

export const ORG_KINDS: Record<string, string> = {
  charity_fund: "Благодійний фонд",
  ngo: "Громадська організація",
  military_unit: "Військова частина / підрозділ",
  initiative: "Волонтерська ініціатива",
  other: "Інше",
};

type VReq = { id: string; kind: string; status: "pending" | "approved" | "rejected"; reviewNote: string | null; createdAt: number };
type VResp = { verified: boolean; organization: { name: string } | null; requests: VReq[] };

/** Application to become a verified organization (only those publish main fundraisers). */
export function OrganizationApply({ intro = true }: { intro?: boolean }) {
  const { refresh } = useAuth();
  const toast = useToast();
  const [data, setData] = React.useState<VResp | null>(null);
  const [f, setF] = React.useState({ name: "", kind: "", code: "", website: "", note: "" });
  const [file, setFile] = React.useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  const load = React.useCallback(() => api<VResp>("/me/verification").then(setData).catch(() => null), []);
  React.useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;
  if (data.organization)
    return (
      <Alert tone="success" icon={<BadgeCheck />}>
        Організацію «{data.organization.name}» перевірено. Ви можете створювати основні збори.
      </Alert>
    );
  const pending = data.requests.find((r) => r.status === "pending");
  const rejected = data.requests.find((r) => r.status === "rejected" && r.kind === "organization");
  const ok = f.name.trim().length >= 2 && f.kind && f.note.trim().length >= 20 && file;

  return (
    <Card className="p-5 sm:p-7">
      {intro && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-subtle p-4">
            <p className="flex items-center gap-2 font-semibold"><Building2 className="size-4.5 text-accent" /> Ви представляєте організацію</p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">Основні збори публікують лише перевірені організації: фонди, ГО, підрозділи та волонтерські ініціативи. Подайте заявку нижче, модератор перевірить документи.</p>
          </div>
          <div className="rounded-2xl border border-border bg-subtle p-4">
            <p className="flex items-center gap-2 font-semibold"><HandHeart className="size-4.5 text-accent" /> Хочете допомогти збору</p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">Відкрийте допоміжну банку для перевіреного збору за 3 кроки й отримайте готове зображення для Stories.</p>
            <ButtonLink href="/explore" variant="secondary" size="sm" className="mt-3">Обрати збір</ButtonLink>
          </div>
        </div>
      )}
      <p className="font-semibold">Заявка організації</p>
      {pending ? (
        <Alert tone="warning" className="mt-3" icon={<Clock />}>
          Заявка від {date(pending.createdAt)} на розгляді. Зазвичай перевірка триває 1–2 робочі дні.
        </Alert>
      ) : (
        <form
          className="mt-4 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await api("/me/organization", { method: "POST", json: { ...f, fileId: file!.id } });
              toast({ kind: "success", title: "Заявку надіслано", description: "Ми повідомимо, щойно модератор її перегляне." });
              await load();
              await refresh();
            } catch (er) {
              setErr((er as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {rejected && <Alert tone="danger" icon={<XCircle />}>Попередню заявку відхилено{rejected.reviewNote ? `: ${rejected.reviewNote}` : "."}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Назва організації">
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} placeholder="БФ «Назва фонду»" />
            </Field>
            <Field label="Тип">
              <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="">Оберіть…</option>
                {Object.entries(ORG_KINDS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Код ЄДРПОУ" hint="якщо є">
              <Input inputMode="numeric" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 20) })} placeholder="12345678" />
            </Field>
            <Field label="Сайт або соцмережі">
              <Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} maxLength={200} placeholder="https://instagram.com/…" />
            </Field>
          </div>
          <Field label="Про діяльність" hint="мінімум 20 символів">
            <Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Що робить організація, для кого збирає, хто відповідальний…" className="min-h-24 text-sm" />
          </Field>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>
              <Upload /> {file ? file.name : "Документ (виписка з ЄДР, статут, лист від підрозділу)"}
            </Button>
            <input
              ref={ref}
              type="file"
              hidden
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const x = e.target.files?.[0];
                e.target.value = "";
                if (!x) return;
                try {
                  const r = await uploadFile(x, "verification");
                  setFile({ id: r.id, name: r.name });
                } catch (er) {
                  toast({ kind: "error", title: (er as Error).message });
                }
              }}
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-fg-subtle"><Lock className="size-3" /> Документ бачать лише модератори, він ніколи не публікується.</p>
          </div>
          {err && <Alert tone="danger">{err}</Alert>}
          <div><Button type="submit" loading={busy} disabled={!ok}>Надіслати заявку</Button></div>
        </form>
      )}
    </Card>
  );
}
