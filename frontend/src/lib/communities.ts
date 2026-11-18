import { Building2, GraduationCap, HeartHandshake, Users } from "lucide-react";
import type * as React from "react";

export const KINDS: Record<string, { label: string; icon: React.ElementType }> = {
  university: { label: "Університет", icon: GraduationCap },
  student_org: { label: "Студентська організація", icon: Users },
  company: { label: "Компанія", icon: Building2 },
  volunteer_team: { label: "Волонтерська команда", icon: HeartHandshake },
};
