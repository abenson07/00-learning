export type DomainOption = {
  key: string;
  label: string;
};

export const DOMAIN_OPTIONS: DomainOption[] = [
  { key: "app-and-development", label: "App & Development" },
  { key: "ai-and-development", label: "AI & Development" },
];

/** Match `article_domain` / UI labels without naive `.includes("ai")` (breaks on e.g. "training"). */
export function normalizeDomain(domain: string) {
  const value = domain.trim().toLowerCase().replace(/\s+/g, " ");
  if (
    value === "ai & development" ||
    value === "ai and development" ||
    value === "ai" ||
    value.startsWith("ai &") ||
    value.startsWith("ai and")
  ) {
    return "ai-and-development";
  }
  return "app-and-development";
}
