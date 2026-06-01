import { HabitWithStreak } from "@/hooks/useHabits";

type Props = {
  habits: HabitWithStreak[];
  currentDate: Date;
  monthsStats: { name: string; limitedScore: number; limitDay: number; isRealCurrent: boolean }[];
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
  const averageDay = habits.length > 0 ? (totalGoodCheckins / today).toFixed(1) : "0.0";

  return (
    <div className="hidden print:block text-black bg-white min-h-screen p-8" dir="rtl">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Zenith Life OS</h1>
        <h2 className="text-xl text-gray-600">تقرير العادات - شهر {monthName}</h2>
      </div>

      {/* Summary */}
      <div className="mb-10">
        <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-green-700">الملخص الشهري</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">إجمالي العادات:</span>
            <span className="font-bold">{habits.length}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">عادات إيجابية:</span>
            <span className="font-bold">{goodHabits.length}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">عادات تجنب (إقلاع):</span>
            <span className="font-bold">{quitHabits.length}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">الأيام المنقضية:</span>
            <span className="font-bold">{today} / {daysInMonth}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">الإنجازات هذا الشهر:</span>
            <span className="font-bold text-green-600">{totalGoodCheckins}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">أيام التجنب الناجحة:</span>
            <span className="font-bold text-blue-600">{totalQuitAvoided}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">أفضل سلسلة نشطة:</span>
            <span className="font-bold">{bestStreak} أيام</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-1">
            <span className="text-gray-600">المتوسط اليومي:</span>
            <span className="font-bold">{averageDay}</span>
          </div>
        </div>
      </div>

      {/* Comparison */}
      {monthsStats && monthsStats.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-blue-700">مقارنة الأشهر</h3>
          <div className="space-y-3">
            {monthsStats.slice(0, 6).map((m, i) => {
              const maxScore = Math.max(...monthsStats.map(x => x.limitedScore), 1);
              const percent = (m.limitedScore / maxScore) * 100;
              return (
                <div key={m.name} className="flex flex-col">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={i === 0 ? "font-bold text-black" : "text-gray-600"}>
                      {m.name} {m.isRealCurrent ? '(الحالي)' : ''}
                    </span>
                    <span className="text-gray-500 text-xs">{m.limitedScore} إنجاز (من يوم 1 إلى {m.limitDay})</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                    <div 
                      className={`h-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} 
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
          <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-green-700">العادات الإيجابية</h3>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="py-2 px-1">العادة</th>
                <th className="py-2 px-1 text-center w-24">السلسلة الحالية</th>
                <th className="py-2 px-1 text-center w-24">إجمالي الإنجازات</th>
              </tr>
            </thead>
            <tbody>
              {goodHabits.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-1 font-bold text-gray-800 flex items-center gap-2">
                    <span>{h.icon || "✨"}</span>
                    <span>{h.title}</span>
                  </td>
                  <td className="py-2 px-1 text-center font-bold text-green-600">{h.streak?.current_streak || 0} يوم</td>
                  <td className="py-2 px-1 text-center text-gray-500">{h.streak?.total_checkins || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quit Habits List */}
      {quitHabits.length > 0 && (
        <div className="mb-10 break-inside-avoid">
          <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-red-700">عادات التجنب (للإقلاع)</h3>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="py-2 px-1">العادة السيئة</th>
                <th className="py-2 px-1 text-center w-32">أيام التجنب المتتالية</th>
              </tr>
            </thead>
            <tbody>
              {quitHabits.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-1 font-bold text-gray-800 flex items-center gap-2">
                    <span>{h.icon || "🚫"}</span>
                    <span>{h.title}</span>
                  </td>
                  <td className="py-2 px-1 text-center font-bold text-red-600">{h.streak?.current_streak || 0} يوم</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        تم إنشاء هذا التقرير آلياً بواسطة Zenith Life OS
      </div>
    </div>
  );
}
