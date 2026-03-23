import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  href?: string;
  cta?: string;
};

export function EmptyState({ title, description, href, cta }: EmptyStateProps) {
  return (
    <Card className="bg-[color:var(--surface-0)] text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div className="rounded-full bg-[color:var(--secondary-container)] px-4 py-2 text-sm font-medium text-[color:var(--secondary-foreground)]">
          아직 비어 있어요
        </div>
        <h3 className="text-readable font-display text-3xl text-[color:var(--text-strong)]">{title}</h3>
        <p className="text-readable text-base leading-relaxed text-[color:var(--text-muted)]">{description}</p>
        {href && cta ? (
          <Button asChild style={{ color: '#ffffff' }}>
            <Link href={href} style={{ color: '#ffffff' }}>{cta}</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
