import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useFinance } from "@/store/data";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowRight, Sparkles } from "lucide-react";
import { ApiError, authApi } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const updateUser = useFinance((s) => s.updateUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authApi.login({ email, password });
      login({ email: user.email, name: user.name, token, userId: user.id });
      updateUser({
        email: user.email,
        name: user.name,
        payday: user.payday,
        loanPayday: user.loanPayday,
        monthlyIncome: Number(user.monthlyIncome),
        onboardingStep: user.onboardingStep,
      });
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo conectar al servidor. Verifica que esté corriendo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-surface">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-900 to-brand-700 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <svg viewBox="0 0 32 32" className="h-7 w-7">
                <path d="M4 20 Q 8 14, 12 20 T 20 20 T 28 20" stroke="#BFDBFE" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M4 25 Q 8 19, 12 25 T 20 25 T 28 25" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-2xl font-semibold">Marea</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Entiende el flujo y reflujo de tu dinero.
          </h1>
          <p className="text-brand-100 text-lg leading-relaxed">
            Marea es tu sistema financiero personal. Diseñado alrededor de tu día de pago,
            te ayuda a anticipar gastos, controlar tarjetas y alcanzar metas.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-brand-100">
          <Sparkles className="h-4 w-4" />
          <span>Tus datos viven en tu servidor — privado por diseño</span>
        </div>
        <svg className="absolute bottom-0 left-0 right-0 opacity-20" viewBox="0 0 800 200" preserveAspectRatio="none">
          <path d="M0,100 Q 200,40 400,100 T 800,100 V200 H0 Z" fill="#BFDBFE" />
          <path d="M0,130 Q 200,70 400,130 T 800,130 V200 H0 Z" fill="#93C5FD" />
        </svg>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-brand-900 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="h-7 w-7">
                <path d="M4 20 Q 8 14, 12 20 T 20 20 T 28 20" stroke="#BFDBFE" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M4 25 Q 8 19, 12 25 T 20 25 T 28 25" stroke="#60A5FA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-2xl font-semibold text-brand-900">Marea</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-brand-900">Bienvenido de vuelta</h2>
            <p className="text-sm text-ink-muted mt-1">Inicia sesión para continuar.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-sm text-center text-ink-muted">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
