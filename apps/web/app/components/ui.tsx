import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { ReportLengthInfo } from "../../lib/reportLength";

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

const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const buttonClass = (variant: Variant, size: Size, full?: boolean): string =>
  cn("btn", `btn-${variant}`, `btn-${size}`, full && "btn-full");

export function Button({ variant = "primary", size = "md", full = false, className, ...props }: ButtonProps) {
  return <button className={cn(buttonClass(variant, size, full), className)} {...props} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", full = false, className, ...props }: ButtonLinkProps) {
  return <Link href={href} className={cn(buttonClass(variant, size, full), className)} {...props} />;
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="page"><div className="container">{children}</div></main>;
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("card", className)}>{children}</section>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sectionHeader">
      <h2>{title}</h2>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </header>
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
    <section className={cn("statusBox", tone === "error" && "statusError")}>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action ? <div className="statusAction">{action}</div> : null}
    </section>
  );
}

export function LengthDebugBar({ values }: { values: Array<{ label: string; info: ReportLengthInfo }> }) {
  return (
    <aside className="debugLengthBar" aria-label="길이 디버그 정보">
      {values.map(({ label, info }) => (
        <p key={label} className={cn("debugLengthItem", info.inRange ? "debugOk" : "debugWarn")}>
          {label} {info.count}자 ({info.min}~{info.max})
        </p>
      ))}
    </aside>
  );
}
