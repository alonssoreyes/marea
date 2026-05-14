import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useFinance } from "@/store/data";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowRight } from "lucide-react";
import { ApiError, authApi } from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const resetToEmpty = useFinance((s) => s.resetToEmpty);
  const updateUser = useFinance((s) => s.updateUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await authApi.register({ name, email, password });
      login({ email: user.email, name: user.name, token, userId: user.id });
      resetToEmpty();
      updateUser({
        email: user.email,
        name: user.name,
        onboardingStep: user.onboardingStep,
      });
      navigate("/onboarding");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No se pudo conectar al servidor. Verifica que esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-brand-900 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="h-7 w-7">
              <path d="M4 20 Q 8 14, 12 20 T 20 20 T 28 20" stroke="#BFDBFE" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M4 25 Q 8 19, 12 25 T 20 25 T 28 25" stroke="#60A5FA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-2xl font-semibold text-brand-900">Marea</span>
        </div>

        <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl shadow-card p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-brand-900">Crea tu cuenta</h1>
            <p className="text-sm text-ink-muted mt-1">
              En unos minutos tendrás tu sistema financiero personal listo.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-sm text-center text-ink-muted">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
