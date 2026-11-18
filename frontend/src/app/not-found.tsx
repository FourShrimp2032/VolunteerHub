import { EmptyState } from "@/components/campaign";
import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <EmptyState title="Сторінку не знайдено" description="Можливо, посилання застаріло або містить помилку." action={<ButtonLink href="/">На головну</ButtonLink>} />
    </div>
  );
}
