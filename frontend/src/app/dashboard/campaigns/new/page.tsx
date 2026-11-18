"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CampaignWizard } from "@/components/wizard";

function Inner() {
  const id = useSearchParams().get("id");
  return (
    <DashboardShell title={id ? "Редагування збору" : "Новий збір"} description="П'ять простих кроків. Чернетка зберігається автоматично на кожному кроці.">
      {() => <CampaignWizard key={id ?? "new"} editId={id} />}
    </DashboardShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
