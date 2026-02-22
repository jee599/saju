import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const buttonClass = (variant: Variant, size: Size, full?: boolean): string =>
  classes("btn", `btn-${variant}`, `btn-${size}`, full && "btn-full");

export function Button({ variant = "primary", size = "md", full = false, className, ...props }: ButtonProps) {
  return <button className={classes(buttonClass(variant, size, full), className)} {...props} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", full = false, className, ...props }: ButtonLinkProps) {
  return <Link href={href} className={classes(buttonClass(variant, size, full), className)} {...props} />;
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="page"><div className="container">{children}</div></main>;
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={classes("card", className)}>{children}</section>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sectionHeader">
      <h2>{title}</h2>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </header>
  );
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="skeletonLine" />
      ))}
    </div>
  );
}

export function StatusBox({
  title,
  description,
  tone = "default",
  action
}: {
  title: string;
  description: string;
  tone?: "default" | "error";
  action?: ReactNode;
}) {
  return (
    <section className={classes("statusBox", tone === "error" && "statusError")}>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action ? <div className="statusAction">{action}</div> : null}
    </section>
  );
}
