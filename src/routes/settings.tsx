import { createFileRoute } from "@tanstack/react-router";
import { useDirection } from "@/stores/useDirection";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Zenith — الإعدادات" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { dir, toggleDir } = useDirection();
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-extrabold text-foreground mb-8">{t('sidebar.settings')}</h1>
      
      <div className="space-y-6">
        <section className="bg-card rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">اللغة / Language</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">لغة العرض</p>
              <p className="text-xs text-muted-foreground mt-1">
                {dir === "rtl" ? "العربية (مفعلة)" : "English (Active)"}
              </p>
            </div>
            <button
              onClick={toggleDir}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition rounded-xl font-bold text-sm"
            >
              <Languages size={16} />
              {dir === "rtl" ? "Switch to English" : "التبديل للعربية"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
