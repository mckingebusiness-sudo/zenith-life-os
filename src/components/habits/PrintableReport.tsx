import { HabitWithStreak } from "@/hooks/useHabits";

type Props = {
  habits: HabitWithStreak[];
  currentDate: Date;
  monthsStats: { name: string; limitedScore: number; limitDay: number; isRealCurrent: boolean; limited?: boolean }[];
};

export function PrintableReport({ habits, currentDate, monthsStats }: Props) {
  const goodHabits = habits.filter(h => (h as any).habit_type !== 'quit');
  const quitHabits = habits.filter(h => (h as any).habit_type === 'quit');
  
  const monthName = currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = Math.min(new Date().getDate(), daysInMonth);

  const totalGoodCheckins = goodHabits.reduce((s, h) => {
    let c = 0;
    for (let i = 1; i <= today; i++) {
      const mm = String(currentDate.getMonth() + 1).padStart(2,'0');
      const dd = String(i).padStart(2,'0');
      if (h.checkins?.has(`${currentDate.getFullYear()}-${mm}-${dd}`)) c++;
    }
    return s + c;
  }, 0);

  const totalQuitAvoided = quitHabits.reduce((s, h) => {
    let c = 0;
    for (let i = 1; i <= today; i++) {
      const mm = String(currentDate.getMonth() + 1).padStart(2,'0');
      const dd = String(i).padStart(2,'0');
      if (h.checkins?.has(`${currentDate.getFullYear()}-${mm}-${dd}`)) c++;
    }
    return s + c;
  }, 0);

  const bestStreak = Math.max(...habits.map(h => h.streak?.current_streak || 0), 0);
  const bestStreakEver = Math.max(...habits.map(h => h.streak?.longest_streak || 0), 0);
  const averageDay = habits.length > 0 ? ((totalGoodCheckins + totalQuitAvoided) / today).toFixed(1) : "0.0";
  const overallConsistency = habits.length > 0 ? Math.round(((totalGoodCheckins + totalQuitAvoided) / (habits.length * today)) * 100) : 0;

  return (
    <div className="hidden print:block text-foreground bg-background min-h-screen p-8 print:[color-adjust:exact] print:[-webkit-print-color-adjust:exact]" dir="rtl">
      {/* Header */}
      <div className="border-b border-green-500/30 pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-green-500 mb-2">
            Zenith Life OS
          </h1>
          <h2 className="text-xl text-foreground/70">تقرير الأداء الشامل - {monthName}</h2>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-green-400">{overallConsistency}%</div>
          <div className="text-sm text-foreground/50 mt-1">معدل الالتزام العام للشهر</div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="mb-10 break-inside-avoid">
        <h3 className="text-lg font-bold pb-2 mb-4 text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          الملخص الشهري
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="text-foreground/50 text-xs mb-1">إجمالي العادات</div>
            <div className="text-2xl font-bold text-foreground">{habits.length}</div>
            <div className="text-[10px] text-foreground/40 mt-1">{goodHabits.length} إيجابية | {quitHabits.length} إقلاع</div>
          </div>
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="text-foreground/50 text-xs mb-1">الإنجازات الإيجابية</div>
            <div className="text-2xl font-bold text-green-400">{totalGoodCheckins}</div>
            <div className="text-[10px] text-foreground/40 mt-1">خلال {today} يوم</div>
          </div>
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="text-foreground/50 text-xs mb-1">أيام التجنب (إقلاع)</div>
            <div className="text-2xl font-bold text-emerald-400">{totalQuitAvoided}</div>
            <div className="text-[10px] text-foreground/40 mt-1">تجنب ناجح</div>
          </div>
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="text-foreground/50 text-xs mb-1">أفضل سلسلة نشطة</div>
            <div className="text-2xl font-bold text-orange-400">{bestStreak} <span className="text-sm">يوم</span></div>
            <div className="text-[10px] text-foreground/40 mt-1">الأطول على الإطلاق: {bestStreakEver}</div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      {monthsStats && monthsStats.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4 text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            مقارنة أداء الأشهر
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {monthsStats.slice(0, 6).map((m, i) => {
              const maxScore = Math.max(...monthsStats.map(x => x.limitedScore), 1);
              const percent = (m.limitedScore / maxScore) * 100;
              return (
                <div key={m.name} className="flex flex-col">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={i === 0 ? "font-bold text-green-400" : "text-foreground/70"}>
                      {m.name} {m.isRealCurrent ? '(الحالي)' : ''}
                    </span>
                    <span className="text-foreground/50 text-xs">{m.limitedScore} إنجاز {m.limited && !m.isRealCurrent ? `(لليوم ${m.limitDay})` : ''}</span>
                  </div>
                  <div className="h-2.5 w-full bg-background border border-border rounded overflow-hidden">
                    <div 
                      className={`h-full ${i === 0 ? 'bg-green-500' : 'bg-white/20'}`} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Good Habits List */}
      {goodHabits.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4 text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            تحليل العادات الإيجابية تفصيلياً
          </h3>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 px-2">العادة</th>
                <th className="py-2 px-2 text-center">نسبة الالتزام بالشهر</th>
                <th className="py-2 px-2 text-center">السلسلة الحالية</th>
                <th className="py-2 px-2 text-center">أفضل سلسلة</th>
                <th className="py-2 px-2 text-center">إجمالي الإنجازات</th>
              </tr>
            </thead>
            <tbody>
              {goodHabits.map((h, i) => {
                let monthCheckins = 0;
                for (let j = 1; j <= today; j++) {
                  const mm = String(currentDate.getMonth() + 1).padStart(2,'0');
                  const dd = String(j).padStart(2,'0');
                  if (h.checkins?.has(`${currentDate.getFullYear()}-${mm}-${dd}`)) monthCheckins++;
                }
                const consistency = Math.round((monthCheckins / today) * 100) || 0;
                
                return (
                  <tr key={h.id} className="border-b border-border">
                    <td className="py-3 px-2 font-bold text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-foreground/5 flex items-center justify-center text-xs">{h.icon || "✨"}</span>
                      <span>{h.title}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-bold w-10 text-left ${consistency >= 80 ? 'text-green-400' : consistency >= 50 ? 'text-orange-400' : 'text-red-400'}`}>{consistency}%</span>
                        <div className="w-20 h-1.5 bg-background border border-border rounded-full overflow-hidden">
                          <div className={`h-full ${consistency >= 80 ? 'bg-green-400' : consistency >= 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${consistency}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-foreground/80">{h.streak?.current_streak || 0} يوم</td>
                    <td className="py-3 px-2 text-center text-foreground/60">{h.streak?.longest_streak || 0} يوم</td>
                    <td className="py-3 px-2 text-center text-foreground/60">{monthCheckins} هذا الشهر</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quit Habits List */}
      {quitHabits.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h3 className="text-lg font-bold border-b border-border pb-2 mb-4 text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            تحليل عادات الإقلاع تفصيلياً
          </h3>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 px-2">العادة السيئة</th>
                <th className="py-2 px-2 text-center">نسبة التجنب بالشهر</th>
                <th className="py-2 px-2 text-center">أيام التجنب المتتالية</th>
                <th className="py-2 px-2 text-center">أطول فترة مقاطعة</th>
              </tr>
            </thead>
            <tbody>
              {quitHabits.map((h, i) => {
                let monthAvoided = 0;
                for (let j = 1; j <= today; j++) {
                  const mm = String(currentDate.getMonth() + 1).padStart(2,'0');
                  const dd = String(j).padStart(2,'0');
                  if (h.checkins?.has(`${currentDate.getFullYear()}-${mm}-${dd}`)) monthAvoided++;
                }
                const consistency = Math.round((monthAvoided / today) * 100) || 0;

                return (
                  <tr key={h.id} className="border-b border-border">
                    <td className="py-3 px-2 font-bold text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center text-xs">{h.icon || "🚫"}</span>
                      <span>{h.title}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-bold w-10 text-left ${consistency >= 80 ? 'text-emerald-400' : consistency >= 50 ? 'text-orange-400' : 'text-red-400'}`}>{consistency}%</span>
                        <div className="w-20 h-1.5 bg-background border border-border rounded-full overflow-hidden">
                          <div className={`h-full ${consistency >= 80 ? 'bg-emerald-400' : consistency >= 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${consistency}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-foreground/80">{h.streak?.current_streak || 0} يوم</td>
                    <td className="py-3 px-2 text-center text-foreground/60">{h.streak?.longest_streak || 0} يوم</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-12 text-center text-xs text-foreground/30 border-t border-border pt-4 flex justify-between items-center break-inside-avoid">
        <span>تم إنشاء هذا التقرير آلياً بواسطة Zenith Life OS</span>
        <span>تاريخ طباعة التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
      </div>
    </div>
  );
}
