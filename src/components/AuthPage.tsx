import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Sparkles, User, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "login") {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        setError("بريد إلكتروني أو كلمة مرور غير صحيحة");
      } else {
        onSuccess();
      }
    } else {
      if (!form.fullName.trim()) {
        setError("الاسم الكامل مطلوب");
        setLoading(false);
        return;
      }

      // Direct signUp (no Edge Function needed)
      const { error: signUpError } = await signUp(form.email, form.password, form.fullName);
      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered") ||
            signUpError.message?.toLowerCase().includes("already exists")) {
          setError("هذا البريد مسجل بالفعل — جرب تسجيل الدخول");
        } else {
          setError(`خطأ من الخادم: ${signUpError.message}`);
        }
        setLoading(false);
        return;
      }

      // Auto-login after successful registration
      const { error: loginError } = await signIn(form.email, form.password);
      if (loginError) {
        // Email confirmation might be required
        setError("تم إنشاء الحساب ✓ — تحقق من بريدك لتأكيد الحساب ثم سجل الدخول");
        setMode("login");
      } else {
        onSuccess();
      }
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#080D0A", direction: "rtl" }}
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(34,197,94,0.12), transparent 70%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-green-400 pointer-events-none"
          style={{
            left: `${10 + i * 12}%`,
            top: `${20 + (i % 4) * 20}%`,
            boxShadow: "0 0 8px #4ADE80",
          }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4"
            style={{
              background: "linear-gradient(135deg, #15803D, #4ADE80)",
              boxShadow: "0 0 40px rgba(34,197,94,0.4)",
            }}
          >
            ∞
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Zenith</h1>
          <p className="text-sm text-muted-foreground">نظام حياتك المتكامل</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(13,20,16,0.9)",
            border: "1px solid rgba(34,197,94,0.15)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-8"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            {(["login", "register"] as const).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => { setMode(tab); setError(null); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={
                  mode === tab
                    ? {
                        background: "linear-gradient(135deg, #15803D, #22C55E)",
                        color: "white",
                        boxShadow: "0 0 20px rgba(34,197,94,0.3)",
                      }
                    : { color: "#647067" }
                }
              >
                {tab === "login" ? "تسجيل الدخول" : "حساب جديد"}
              </motion.button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name (register only) */}
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <InputField
                    icon={<User size={16} />}
                    placeholder="الاسم الكامل"
                    type="text"
                    value={form.fullName}
                    onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <InputField
              icon={<Mail size={16} />}
              placeholder="البريد الإلكتروني"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            />

            {/* Password */}
            <div className="relative">
              <InputField
                icon={<Lock size={16} />}
                placeholder="كلمة المرور"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-sm text-center py-2 px-4 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: loading
                  ? "rgba(34,197,94,0.3)"
                  : "linear-gradient(135deg, #15803D, #22C55E)",
                boxShadow: loading ? "none" : "0 0 30px rgba(34,197,94,0.4)",
                color: "white",
              }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={16} />
                </motion.div>
              ) : (
                <>
                  <ArrowRight size={16} />
                  {mode === "login" ? "دخول" : "إنشاء الحساب"}
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            بياناتك محمية بتشفير كامل ولا يمكن لأحد الوصول إليها
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({
  icon,
  placeholder,
  type,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[#4ADE80] shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
        style={{ direction: "rtl" }}
      />
    </div>
  );
}
