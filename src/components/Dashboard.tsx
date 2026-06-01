import HeroStatement from "../sections/HeroStatement";
import FocusLane from "../sections/FocusLane";
import PriorityMatrix from "../sections/PriorityMatrix";
import HabitsGarden from "../sections/HabitsGarden";
import MoneyFlow from "../sections/MoneyFlow";
import AIInsight from "../sections/AIInsight";
import DayTimeline from "../sections/DayTimeline";
import Interactive3DDeck from "../sections/Interactive3DDeck";

export default function Dashboard() {
  return (
    <div className="space-y-12 pb-12">
      <HeroStatement />
      <FocusLane />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 row-span-2">
          <PriorityMatrix />
        </div>
        <div className="col-span-5">
          <HabitsGarden />
        </div>
        <div className="col-span-5">
          <MoneyFlow />
        </div>
        <div className="col-span-7">
          <AIInsight />
        </div>
        <div className="col-span-12">
          <DayTimeline />
        </div>
      </div>
      <Interactive3DDeck />
    </div>
  );
}

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#647067] mb-3">قريباً</div>
      <h1 className="text-4xl font-extrabold text-grad-green mb-3">{title}</h1>
      <p className="text-[#A7B3AB] max-w-md">هذه الصفحة قيد التصميم. صفحة غرفة التحكم الرئيسية جاهزة.</p>
    </div>
  );
}