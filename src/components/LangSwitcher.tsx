import { useI18n, type Lang } from "@/lib/i18n";

const langs: { code: Lang; label: string }[] = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export const LangSwitcher = () => {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-xs">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
            lang === l.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
