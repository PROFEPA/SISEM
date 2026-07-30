"use client";

import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type LinkProps = ComponentProps<typeof Link>;

function DatePreservingLinkInner({ href, ...props }: LinkProps) {
  const searchParams = useSearchParams();
  const target = typeof href === "string" ? href : href.pathname || "";
  const params = new URLSearchParams();
  const from = searchParams.get("fecha_desde");
  const to = searchParams.get("fecha_hasta");

  if (from) params.set("fecha_desde", from);
  if (to) params.set("fecha_hasta", to);

  const preservedHref = params.size > 0 ? `${target}?${params.toString()}` : target;
  return <Link href={preservedHref} {...props} />;
}

export function DatePreservingLink(props: LinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <DatePreservingLinkInner {...props} />
    </Suspense>
  );
}
