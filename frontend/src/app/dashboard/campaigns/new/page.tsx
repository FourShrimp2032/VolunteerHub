"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { OrganizationApply } from "@/components/organization";
import { CampaignWizard } from "@/components/wizard";

function Inner() {
  const id = useSearchParams().get("id");
  return (
    <DashboardShell title={id ? "Редагування збору" : "Новий збір"} description="Шість простих кроків. Чернетка зберігається автоматично на кожному кроці.">
      {(user) => (user.isOrganization || user.role === "admin" ? <CampaignWizard key={id ?? "new"} editId={id} /> : <OrganizationApply />)}
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
