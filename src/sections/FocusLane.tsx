import { motion } from "framer-motion";
import { useHabits } from "@/hooks/useHabits";
import { getLocalDateString } from "@/lib/habitCalculations";
import { CheckCircle2, Clock, Battery } from "lucide-react";

export default function FocusLane() {
  const { habits } = useHabits();
  
  const todayStr = getLocalDateString();
  const todayHabits = habits.filter(h => {
    // If not active on this weekday, skip (assuming active_weekdays is checked elsewhere, but for simplicity we just count all that are 'handled' or should be handled)
    // Here we can just count handled vs unhandled
    const isGood = h.habit_type !== 'quit';
    return isGood;
  });

  const completed = todayHabits.filter(h => h.checkedToday || h.frozenToday);
  const remaining = todayHabits.filter(h => !h.checkedToday && !h.frozenToday);

  return (
    <section className="glass rounded-3xl p-7 relative overflow-hidden flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
              <Clock size={12} /> إيقاع يومك
            </div>
            <div className="text-lg font-bold mt-1 text-foreground">
              {remaining.length === 0 ? "لقد أنهيت كل عاداتك اليوم!" : `متبقي ${remaining.length} عادات لإنجازها`}
            </div>
          </div>
          <div className="text-[13px] tabular text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
            تم اليوم: {completed.length}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {remaining.length > 0 ? (
            remaining.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-lg">
                  {h.icon || "🎯"}
                </div>
                <div className="flex-1 font-medium text-sm text-white/90">{h.title}</div>
                <div className="text-[10px] text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md">متبقي</div>
              </div>
            ))
          ) : (
             <div className="flex flex-col items-center justify-center p-6 bg-green-500/5 border border-green-500/10 rounded-xl text-green-400">
               <CheckCircle2 size={32} className="mb-2 opacity-80" />
               <span className="text-sm font-bold">يوم مثالي!</span>
             </div>
          )}
          {remaining.length > 3 && (
            <div className="text-xs text-center text-muted-foreground mt-2">
              و {remaining.length - 3} عادات أخرى...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 border-t md:border-t-0 md:border-r border-white/10 pt-5 md:pt-0 md:pr-6 flex flex-col">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1 mb-1">
          <Battery size={12} /> منحنى الطاقة (ميزة تجريبية)
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/5 mt-3">
          <div className="text-muted-foreground mb-2 text-3xl opacity-50">📊</div>
          <div className="text-sm font-bold text-white/70 mb-1">نحتاج بيانات إضافية</div>
          <div className="text-xs text-white/40 max-w-[200px]">
            لا يوجد بيانات تاريخية كافية لأوقات إنجاز عاداتك لرسم منحنى دقيق لطاقتك.
          </div>
        </div>
      </div>
    </section>
  );
}