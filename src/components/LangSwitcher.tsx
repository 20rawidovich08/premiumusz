import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const langs: { code: Lang; label: string }[] = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export const LangSwitcher = () => {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center gap-1 rounded-full glass p-1">
      {langs.map((l) => (
        <Button
          key={l.code}
          size="sm"
          variant={lang === l.code ? "default" : "ghost"}
          className={`h-7 rounded-full px-3 text-xs font-semibold ${lang === l.code ? "" : "text-muted-foreground"}`}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
};
