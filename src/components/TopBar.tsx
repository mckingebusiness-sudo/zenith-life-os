import { Bell, Plus, Languages, Sun, Moon } from "lucide-react";
import { useDirection } from "@/stores/useDirection";
import { useTheme } from "@/stores/useTheme";
import { useTranslation } from "react-i18next";

export default function TopBar() {
  const { dir, toggleDir } = useDirection();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-border transition-colors">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span>∞</span>
        <span className="tracking-[0.2em] uppercase">{t('topbar.missionControl')}</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-foreground/5 border border-border hover:bg-foreground/10 flex items-center justify-center transition group text-muted-foreground hover:text-foreground"
          title={theme === "dark" ? t('common.themeLight') : t('common.themeDark')}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="w-9 h-9 rounded-xl bg-foreground/5 border border-border hover:bg-foreground/10 flex items-center justify-center transition text-foreground">
          <Bell size={15} />
        </button>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
          style={{
            background: "linear-gradient(135deg, #15803D, #22C55E)",
            boxShadow: "0 0 16px rgba(34,197,94,0.35)",
          }}
        >
          <Plus size={15} />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground/5 border border-border text-[11px]">
          <span className="text-accent font-bold">{t('topbar.level')} 7</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular text-muted-foreground">6,500 {t('topbar.xp')}</span>
        </div>
      </div>
    </header>
  );
}