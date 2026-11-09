import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Stands in for next/link in the mini-app. The website's own pages (board, about, privacy) are not in the bundle and
 * a mini-app must not send people out to another site unasked, so a shared component's link only shows its text.
 * The shared screens hide those links in the mini-app already (isToss); this keeps anything left over harmless.
 */
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname?: string }; children?: ReactNode; prefetch?: boolean; replace?: boolean; scroll?: boolean };

export default function Link({ children, className }: Props) {
  return <span className={className}>{children}</span>;
}
