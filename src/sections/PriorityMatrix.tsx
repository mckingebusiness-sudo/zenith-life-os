import { Plus } from "lucide-react";

const quadrants = [
  { label: "عاجل ومهم", sub: "نفّذ الآن", bg: "rgba(239,68,68,0.04)", accent: "#EF4444", tasks: ["مراجعة عرض العميل", "مكالمة العميل 4م"] },
  { label: "مهم غير عاجل", sub: "اجدول", bg: "rgba(34,197,94,0.05)", accent: "#22C55E", tasks: ["تخطيط Q3", "تحديث API docs"] },
  { label: "عاجل غير مهم", sub: "فوّض أو سرّع", bg: "rgba(217,164,65,0.04)", accent: "#D9A441", tasks: ["رد على الإيميلات", "تأكيد الميتنج"] },
  { label: "لاحقاً", sub: "أرجئ أو ألغي", bg: "rgba(255,255,255,0.02)", accent: "#647067", tasks: ["تنظيم الملفات", "قراءة خفيفة"] },
];

export default function PriorityMatrix() {
  return (
    <section className="glass rounded-3xl p-7 h-full relative overflow-hidden">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#647067]">Eisenhower</div>
          <h2 className="text-xl font-bold mt-1">ما الأهم الآن؟</h2>
        </div>
        <div className="text-[11px] text-[#647067]">8 مهام نشطة</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quadrants.map((q) => (
          <div
            key={q.label}
            className="rounded-2xl p-4 min-h-[180px] flex flex-col gap-3 group transition"
            style={{ background: q.bg, border: `1px solid ${q.accent}22` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: q.accent }}>
                  {q.label}
                </div>
                <div className="text-[10px] text-[#647067] mt-0.5">{q.sub}</div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-white/5 flex items-center justify-center transition">
                <Plus size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {q.tasks.map((t) => (
                <div key={t} className="text-[12px] px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition cursor-pointer flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ background: q.accent }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}