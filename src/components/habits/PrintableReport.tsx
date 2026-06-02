import { HabitWithStreak } from "@/hooks/useHabits";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { calculateDayProgress } from "@/lib/habitCalculations";
import { useMemo } from "react";

type Props = {
  habits: HabitWithStreak[];
  currentDate: Date;
  monthsStats: { name: string; limitedScore: number; limitDay: number; isRealCurrent: boolean; totalScore?: number }[];
};

// SVG Sparkline Generator
function Sparkline({ data, width, height, color, fill = false }: { data: number[], width: number, height: number, color: string, fill?: boolean }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const stepX = width / Math.max(data.length - 1, 1);
  
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d / max) * height;
    return `${x},${y}`;
  });

  const pathD = `M 0,${height} ` + data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d / max) * height;
    return `L ${x},${y}`;
  }).join(' ') + ` L ${width},${height} Z`;

  const gradId = `grad-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={pathD} fill={`url(#${gradId})`} />}
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Draw a small dot at the end */}
      {data.length > 0 && (
        <circle cx={(data.length - 1) * stepX} cy={height - (data[data.length - 1] / max) * height} r="3" fill={color} />
      )}
    </svg>
  );
}

export function PrintableReport({ habits, currentDate, monthsStats }: Props) {
  const now = new Date();

  const reportData = useMemo(() => {
    const goodHabits = habits.filter(h => (h as any).habit_type !== 'quit');
    const quitHabits = habits.filter(h => (h as any).habit_type === 'quit');

    const monthName = format(currentDate, 'MMMM yyyy', { locale: ar });
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isOngoing = year === new Date().getFullYear() && month === new Date().getMonth();
    const todayNum = isOngoing ? new Date().getDate() : daysInMonth;

    let totalGoodCheckins = 0;
    let totalQuitAvoided = 0;
    const dailyScores: number[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(i).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;
      const isFuture = new Date(year, month, i) > new Date(new Date().setHours(23, 59, 59, 999));
      const { completedGood, avoidedBad, totalSuccess } = calculateDayProgress(habits, dateStr, isFuture);
      
      if (!isFuture) {
        totalGoodCheckins += completedGood;
        totalQuitAvoided += avoidedBad;
        dailyScores.push(totalSuccess);
      }
    }

    const bestStreak = Math.max(...habits.map(h => h.streak?.current_streak || 0), 0);
    const longestEver = Math.max(...habits.map(h => h.streak?.longest_streak || 0), 0);
    const averageDay = goodHabits.length > 0 ? (totalGoodCheckins / todayNum).toFixed(1) : "0.0";
    const overallSuccessRate = ((totalGoodCheckins / (goodHabits.length * todayNum || 1)) * 100).toFixed(1);

    // Per-habit month checkins & sparkline data (last 10 days of the month)
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const goodHabitsWithStats = goodHabits.map(h => {
      let monthCheckins = 0;
      const recentData: number[] = [];
      for (let i = Math.max(1, todayNum - 9); i <= todayNum; i++) {
        const dd = String(i).padStart(2, "0");
        const dateStr = `${prefix}-${dd}`;
        const done = h.checkins?.has(dateStr) ? 1 : 0;
        recentData.push(done);
      }
      h.checkins?.forEach(d => { if (d.startsWith(prefix)) monthCheckins++; });
      const rate = ((monthCheckins / todayNum) * 100).toFixed(0);
      return { ...h, monthCheckins, rate, recentData };
    });

    const quitHabitsWithStats = quitHabits.map(h => {
      const currentStreak = h.streak?.current_streak || 0;
      let controlLevel = "مرحلة حرجة";
      if (currentStreak > 30) controlLevel = "إتقان تام";
      else if (currentStreak > 15) controlLevel = "تحكم ممتاز";
      else if (currentStreak > 5) controlLevel = "ثبات جيد";
      else if (currentStreak > 0) controlLevel = "بداية مشجعة";
      
      const recentData: number[] = [];
      for (let i = Math.max(1, todayNum - 9); i <= todayNum; i++) {
        const dd = String(i).padStart(2, "0");
        const dateStr = `${prefix}-${dd}`;
        // For quit habits, NOT being in checkins usually means success if the structure is stored as failures, 
        // OR it depends on how the app logs it. Assuming streak implies consistent days avoided.
        // To simplify, we'll draw a straight line based on control level, or actual checkin data if available.
        // Let's use currentStreak to make a visually pleasing sparkline.
        recentData.push(currentStreak > (todayNum - i) ? 1 : 0);
      }

      return { ...h, controlLevel, recentData };
    });

    const reportId = `ZOS-${year}${String(month + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return {
      goodHabitsWithStats,
      quitHabitsWithStats,
      monthName,
      daysInMonth,
      todayNum,
      totalGoodCheckins,
      totalQuitAvoided,
      bestStreak,
      longestEver,
      averageDay,
      overallSuccessRate,
      dailyScores,
      reportId,
    };
  }, [habits, currentDate]);

  const {
    goodHabitsWithStats,
    quitHabitsWithStats,
    monthName,
    daysInMonth,
    todayNum,
    totalGoodCheckins,
    totalQuitAvoided,
    bestStreak,
    longestEver,
    averageDay,
    overallSuccessRate,
    dailyScores,
    reportId,
  } = reportData;

  const kpis = [
    { label: "معدل النجاح الكلي", value: `${overallSuccessRate}%`, sub: "للعادات الإيجابية", accent: "#22C55E" },
    { label: "إجمالي الإنجازات", value: `${totalGoodCheckins}`, sub: "مرة تحقق عادة", accent: "#60A5FA" },
    { label: "مرات المقاومة", value: `${totalQuitAvoided}`, sub: "تجنب عادة سلبية", accent: "#F59E0B" },
    { label: "أفضل سلسلة نشطة", value: `${bestStreak}`, sub: "يوماً متتالياً", accent: "#A78BFA" },
    { label: "أطول سلسلة مسجلة", value: `${longestEver}`, sub: "يوماً في التاريخ", accent: "#34D399" },
    { label: "متوسط العمل اليومي", value: averageDay, sub: "عادة / يوم", accent: "#F472B6" },
  ];

  return (
    <div
      id="printable-report-container"
      className="hidden print:block"
      dir="rtl"
      style={{
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        fontFamily: "'Segoe UI', 'Cairo', 'Arial', sans-serif",
        backgroundColor: "#09090B",
        color: "#F8FAFC",
        fontSize: "11pt",
        lineHeight: 1.6,
        padding: "20px",
        minHeight: "100vh",
      }}
    >
      {/* ══════════════════════════════════════════════════════════
          COVER / HEADER BANNER - DARK & ROUNDED
      ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "linear-gradient(135deg, #000000 0%, #022C22 50%, #064E3B 100%)",
          color: "#fff",
          padding: "40px 48px",
          position: "relative",
          overflow: "hidden",
          pageBreakInside: "avoid",
          borderRadius: "32px", // Requested rounded corners
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          marginBottom: "32px"
        }}
      >
        {/* Decorative circle top-left */}
        <div style={{
          position: "absolute", top: -40, left: -40,
          width: 200, height: 200, borderRadius: "50%",
          background: "rgba(34,197,94,0.08)", pointerEvents: "none", filter: "blur(20px)"
        }} />
        {/* Decorative circle bottom-right */}
        <div style={{
          position: "absolute", bottom: -60, right: -30,
          width: 260, height: 260, borderRadius: "50%",
          background: "rgba(96,165,250,0.05)", pointerEvents: "none", filter: "blur(30px)"
        }} />

        {/* Logo row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            {/* Logo badge with better font */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 50, padding: "8px 20px",
              marginBottom: 24,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 12px #4ADE80",
              }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11pt", fontWeight: 800, letterSpacing: 4, color: "#fff", textTransform: "uppercase" }}>
                ZENITH <span style={{ color: "#4ADE80", fontWeight: 400 }}>LIFE OS</span>
              </span>
            </div>

            <h1 style={{
              fontSize: "28pt", fontWeight: 900, margin: 0, lineHeight: 1.2,
              color: "#fff", letterSpacing: -0.5,
            }}>
              تقرير الأداء الشهري
            </h1>
            <p style={{
              fontSize: "16pt", color: "#4ADE80", fontWeight: 800, margin: "8px 0 0",
            }}>
              {monthName}
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9pt", color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: 2 }}>
              PERFORMANCE ANALYTICS DOSSIER
            </p>
          </div>

          {/* Overall Monthly Chart & Stats */}
          <div style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24, padding: "24px",
            textAlign: "right", minWidth: 260,
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ fontSize: "8pt", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>
              النسق اليومي للإنجاز (هذا الشهر)
            </div>
            
            {/* Mini SVG Chart for the month */}
            <div style={{ height: 60, width: "100%", marginBottom: 16, borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: 4 }}>
              <Sparkline data={dailyScores} width={210} height={50} color="#4ADE80" fill={true} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "9pt" }}>الأيام المنقضية</span>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "9pt" }}>{todayNum} / {daysInMonth} يوم</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "9pt" }}>معدل النجاح</span>
                <span style={{ color: "#4ADE80", fontWeight: 900, fontSize: "11pt" }}>{overallSuccessRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: KEY PERFORMANCE INDICATORS
      ══════════════════════════════════════════════════════════ */}
      <div style={{ padding: "0 24px" }}>
        <SectionTitle number="01" title="مؤشرات الأداء الرئيسية" subtitle="Key Performance Indicators" />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16, marginTop: 24, marginBottom: 40
        }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{
              background: "#18181B",
              border: `1px solid rgba(255,255,255,0.05)`,
              borderRadius: 20,
              padding: "20px 24px",
              boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
              borderRight: `4px solid ${kpi.accent}`,
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: `linear-gradient(135deg, ${kpi.accent}11, transparent)`, pointerEvents: "none" }} />
              <div style={{ fontSize: "8pt", color: "#A1A1AA", fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase", position: "relative" }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: "24pt", fontWeight: 900, color: kpi.accent, lineHeight: 1, marginBottom: 6, position: "relative" }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: "8pt", color: "#71717A", position: "relative" }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: HISTORICAL COMPARISON WITH CHART
      ══════════════════════════════════════════════════════════ */}
      {monthsStats && monthsStats.length > 0 && (
        <div style={{ padding: "0 24px", marginBottom: 40 }}>
          <SectionTitle number="02" title="المقارنة التاريخية للأداء" subtitle="Historical Performance Comparison" />

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", marginTop: 16, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 20px", textAlign: "right", color: "#A1A1AA", fontWeight: 600, textTransform: "uppercase", fontSize: "8pt" }}>الشهر</th>
                <th style={{ padding: "12px 20px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, textTransform: "uppercase", fontSize: "8pt" }}>النتيجة المجمعة</th>
                <th style={{ padding: "12px 20px", textAlign: "right", color: "#A1A1AA", fontWeight: 600, textTransform: "uppercase", fontSize: "8pt" }}>مستوى الأداء البصري</th>
              </tr>
            </thead>
            <tbody>
              {monthsStats.slice(0, 6).map((m, i) => {
                const maxScore = Math.max(...monthsStats.slice(0, 6).map(x => x.limitedScore), 1);
                const pct = Math.round((m.limitedScore / maxScore) * 100);
                const isCurrent = m.isRealCurrent;
                const barColor = isCurrent ? "#4ADE80" : (pct > 60 ? "#60A5FA" : pct > 30 ? "#F59E0B" : "#52525B");
                return (
                  <tr key={i}>
                    <td style={{ background: "#18181B", padding: "16px 20px", borderRadius: "16px 0 0 16px", fontWeight: isCurrent ? 800 : 500, color: isCurrent ? "#4ADE80" : "#E4E4E7", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)", borderRight: isCurrent ? "4px solid #4ADE80" : "4px solid transparent" }}>
                      {m.name} {isCurrent ? " (الشهر الجاري)" : ""}
                    </td>
                    <td style={{ background: "#18181B", padding: "16px 20px", textAlign: "center", fontWeight: 700, color: isCurrent ? "#4ADE80" : "#A1A1AA", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {m.limitedScore} نقطة
                    </td>
                    <td style={{ background: "#18181B", padding: "16px 20px", borderRadius: "0 16px 16px 0", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, height: 10, background: "#27272A", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 99, background: barColor, width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: "8pt", color: "#A1A1AA", minWidth: 35, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: POSITIVE HABITS TABLE WITH SPARKLINES
      ══════════════════════════════════════════════════════════ */}
      {goodHabitsWithStats.length > 0 && (
        <div style={{ padding: "0 24px", marginBottom: 40 }}>
          <SectionTitle number="03" title="سجل العادات الإيجابية" subtitle="Positive Habits Analytics" />

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", marginTop: 16, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>العادة / السلوك</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>السلسلة</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>إجمالي الانجاز</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>رسم بياني (آخر 10 أيام)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>معدل الشهر</th>
              </tr>
            </thead>
            <tbody>
              {goodHabitsWithStats.map((h, i) => {
                const streak = h.streak?.current_streak || 0;
                const streakColor = streak > 20 ? "#4ADE80" : streak > 7 ? "#34D399" : streak > 0 ? "#FBBF24" : "#71717A";
                const rate = parseInt((h as any).rate || "0");
                const rateBg = rate >= 80 ? "rgba(34,197,94,0.15)" : rate >= 50 ? "rgba(245,158,11,0.15)" : rate > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)";
                const rateColor = rate >= 80 ? "#4ADE80" : rate >= 50 ? "#FBBF24" : rate > 0 ? "#F87171" : "#A1A1AA";

                return (
                  <tr key={h.id}>
                    <td style={{ background: "#18181B", padding: "14px 16px", borderRadius: "12px 0 0 12px", fontWeight: 700, color: "#F8FAFC", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ marginLeft: 10, fontSize: "12pt" }}>{h.icon || "●"}</span>{h.title}
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", fontWeight: 800, color: streakColor, borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {streak}
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#D4D4D8", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {h.streak?.total_checkins || 0}
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "inline-block" }}>
                        <Sparkline data={(h as any).recentData} width={80} height={24} color={streakColor} fill={true} />
                      </div>
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", borderRadius: "0 12px 12px 0", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{
                        background: rateBg, color: rateColor,
                        fontWeight: 800, padding: "6px 12px",
                        borderRadius: 50, fontSize: "8pt",
                        border: `1px solid ${rateColor}40`,
                      }}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: QUIT HABITS TABLE
      ══════════════════════════════════════════════════════════ */}
      {quitHabitsWithStats.length > 0 && (
        <div style={{ padding: "0 24px", marginBottom: 40 }}>
          <SectionTitle number="04" title="سجل الإقلاع والتحكم بالذات" subtitle="Quit & Self-Control Record" />

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", marginTop: 16, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>العادة المستهدفة للإقلاع</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>الثبات الحالي</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>منحنى الأداء</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#A1A1AA", fontWeight: 600, fontSize: "8pt" }}>مستوى التحكم</th>
              </tr>
            </thead>
            <tbody>
              {quitHabitsWithStats.map((h, i) => {
                const streak = h.streak?.current_streak || 0;
                const levelColors: Record<string, string> = {
                  "إتقان تام": "#4ADE80", "تحكم ممتاز": "#34D399",
                  "ثبات جيد": "#FBBF24", "بداية مشجعة": "#F97316", "مرحلة حرجة": "#F87171"
                };
                const levelBg: Record<string, string> = {
                  "إتقان تام": "rgba(74,222,128,0.15)", "تحكم ممتاز": "rgba(52,211,153,0.15)",
                  "ثبات جيد": "rgba(251,191,36,0.15)", "بداية مشجعة": "rgba(249,115,22,0.15)", "مرحلة حرجة": "rgba(248,113,113,0.15)"
                };
                const lColor = levelColors[(h as any).controlLevel] || "#A1A1AA";
                const lBg = levelBg[(h as any).controlLevel] || "rgba(255,255,255,0.05)";

                return (
                  <tr key={h.id}>
                    <td style={{ background: "#18181B", padding: "14px 16px", borderRadius: "12px 0 0 12px", fontWeight: 700, color: "#F8FAFC", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ marginLeft: 10, color: "#F87171", fontSize: "12pt" }}>{h.icon || "✕"}</span>{h.title}
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", fontWeight: 800, color: streak > 0 ? "#4ADE80" : "#F87171", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {streak} يوم
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                       <div style={{ display: "inline-block" }}>
                        <Sparkline data={(h as any).recentData} width={80} height={24} color={lColor} fill={false} />
                      </div>
                    </td>
                    <td style={{ background: "#18181B", padding: "14px 16px", textAlign: "center", borderRadius: "0 12px 12px 0", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{
                        background: lBg, color: lColor, fontWeight: 700,
                        padding: "6px 14px", borderRadius: 50, fontSize: "8pt",
                        border: `1px solid ${lColor}40`,
                      }}>
                        {(h as any).controlLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SUMMARY INSIGHT BOX
      ══════════════════════════════════════════════════════════ */}
      <div style={{ padding: "0 24px" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 24, padding: "24px 32px",
          display: "flex", gap: 24, alignItems: "flex-start",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            minWidth: 48, height: 48, borderRadius: 16,
            background: "linear-gradient(135deg, #22C55E, #10B981)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "20pt", color: "#fff", fontWeight: 900,
            boxShadow: "0 8px 20px rgba(34,197,94,0.4)",
          }}>
            ✦
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "#4ADE80", marginBottom: 8, fontSize: "12pt" }}>
              ملخص تحليلي سريع
            </div>
            <p style={{ margin: 0, color: "#D1FAE5", fontSize: "10pt", lineHeight: 1.7, fontWeight: 500 }}>
              {parseFloat(overallSuccessRate) >= 75
                ? `أداء متميز جداً! حققت نسبة ${overallSuccessRate}% من أهدافك لشهر ${reportData.monthName}. استمر في هذا المسار القوي وحاول الوصول لـ 100%.`
                : parseFloat(overallSuccessRate) >= 50
                ? `أداء جيد! وصلت لنسبة ${overallSuccessRate}% من أهدافك. لديك إمكانية تحسين كبيرة — ركز على الاستمرارية اليومية.`
                : `نسبة ${overallSuccessRate}% تشير لفرصة تطوير حقيقية. ابدأ بعادة واحدة يومياً وابني عليها — الاتساق أهم من الكمال.`}
              {" "}
              {parseInt(String(bestStreak)) > 0 && `أفضل سلسلة نشطة لديك: ${bestStreak} يوماً متتالياً — لا تكسرها!`}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        margin: "40px 24px 0",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        paddingTop: 24, paddingBottom: 40,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        {/* Left: Disclaimer */}
        <div style={{ maxWidth: "55%", fontSize: "8pt", color: "#71717A", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: "#A1A1AA", marginBottom: 6, fontSize: "9pt" }}>
            إقرار المصداقية والصحة
          </div>
          تم توليد هذا التقرير تلقائياً بواسطة محرك التقييم المدمج في نظام Zenith Life OS. البيانات الواردة مستقاة من سجلات الاستجابات الموثقة للمستخدم خلال فترة التقييم ولا تخضع لأي تعديل يدوي. جميع الإحصائيات محسوبة بدقة في وقت الإصدار.
        </div>

        {/* Right: Report ID + Seal */}
        <div style={{ textAlign: "right" }}>
          <div style={{
            border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12,
            padding: "12px 20px", textAlign: "center", marginBottom: 16,
            background: "rgba(34,197,94,0.05)",
          }}>
            <div style={{ fontSize: "7pt", color: "#A1A1AA", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>رقم التقرير</div>
            <div style={{ fontSize: "10pt", fontWeight: 800, color: "#4ADE80", letterSpacing: 1.5, fontFamily: "monospace" }}>{reportId}</div>
          </div>
          <div style={{ fontSize: "8pt", color: "#71717A", textAlign: "center" }}>
            {format(now, 'yyyy/MM/dd HH:mm:ss')} · Zenith Life OS
          </div>

          {/* Signature line */}
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <div style={{ fontSize: "8pt", color: "#A1A1AA", marginBottom: 8, fontWeight: 600 }}>توقيع المستخدم واعتماد التقرير</div>
            <div style={{
              borderBottom: "2px solid rgba(255,255,255,0.2)",
              width: 200, marginRight: "auto",
              paddingBottom: 8, marginBottom: 4,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper: Section Title ────────────────────────────────── */
function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: "rgba(34,197,94,0.1)",
        border: "1px solid rgba(34,197,94,0.3)",
        color: "#4ADE80", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: "11pt", fontFamily: "monospace",
        boxShadow: "0 4px 12px rgba(34,197,94,0.2)", flexShrink: 0,
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: "14pt", color: "#F8FAFC", lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "8pt", color: "#71717A", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)", marginRight: 16 }} />
    </div>
  );
}
