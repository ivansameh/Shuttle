import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/axios";
import { Bus, Loader2, UserCircle, Truck } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [role, setRole] = useState<"RIDER" | "DRIVER">("RIDER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.post("/auth/register", { ...form, role });

      if (role === "DRIVER") {
        setSuccess(
          "Account created! Your driver account is pending admin approval. You will be able to log in once approved.",
        );
      } else {
        setSuccess("Account created! Redirecting to login…");
        setTimeout(() => navigate("/login"), 1800);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Brand Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-16">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-8 backdrop-blur-md border border-white/20">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            Your daily commute,
            <br />
            reimagined.
          </h2>
          <p className="text-primary-100 text-lg max-w-md">
            Create an account to track your routes, secure your seats, and ride
            in comfort every day.
          </p>
        </div>

        {/* Decorative graphic patterns */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-800 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-950 rounded-full blur-3xl opacity-50 -translate-x-1/4 translate-y-1/4" />

        <div className="relative z-10">
          <p className="text-primary-200 text-sm font-medium">
            © {new Date().getFullYear()} Shuttle. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 relative overflow-y-auto pt-16 pb-8 lg:py-0">
        <div className="w-full max-w-sm mx-auto animate-slide-up">
          {/* Header */}
          <div className="mb-10">
            <div className="lg:hidden inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-6 shadow-lg shadow-primary-500/30">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">
              Join Shuttle.
            </h1>
            <p className="text-muted">
              Create your account and start moving smarter.
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-success/10 border border-success/30 text-success text-sm rounded-xl px-4 py-3">
                {success}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("RIDER")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    role === "RIDER"
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-border bg-surface text-muted hover:border-primary-200"
                  }`}
                >
                  <UserCircle className="w-6 h-6" />
                  <div className="text-left">
                    <span className="block text-sm font-bold">Rider</span>
                    <span className="block text-[10px] opacity-70">
                      Book shuttle rides
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("DRIVER")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    role === "DRIVER"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted hover:border-accent/30"
                  }`}
                >
                  <Truck className="w-6 h-6" />
                  <div className="text-left">
                    <span className="block text-sm font-bold">Driver</span>
                    <span className="block text-[10px] opacity-70">
                      Drive shuttles
                    </span>
                  </div>
                </button>
              </div>
              {role === "DRIVER" && (
                <p className="text-xs text-warning mt-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                  ⏳ Driver accounts require admin approval before you can log
                  in.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {(
                [
                  {
                    id: "reg-name",
                    key: "name",
                    label: "Full Name",
                    type: "text",
                    placeholder: "John Doe",
                  },
                  {
                    id: "reg-email",
                    key: "email",
                    label: "Email Address",
                    type: "email",
                    placeholder: "name@example.com",
                  },
                  {
                    id: "reg-phone",
                    key: "phone",
                    label: "Phone Number",
                    type: "tel",
                    placeholder: "+20 100 000 0000",
                  },
                  {
                    id: "reg-password",
                    key: "password",
                    label: "Password",
                    type: "password",
                    placeholder: "Create a strong password",
                  },
                ] as const
              ).map(({ id, key, label, type, placeholder }) => (
                <div key={key}>
                  <Input
                    id={id}
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    label={label}
                    required
                  />
                </div>
              ))}

              <p className="text-xs text-muted text-center pt-1">
                By creating an account you agree to our{" "}
                <span className="text-primary-600 cursor-pointer">
                  Terms of Service
                </span>
                .
              </p>

              <Button
                id="register-submit"
                type="submit"
                disabled={loading || !!success}
                isLoading={loading}
                fullWidth
                size="lg"
              >
                {loading ? "Creating Account…" : "Create My Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted">
              Already a member?{" "}
              <Link
                to="/login"
                className="text-primary-600 font-bold hover:text-primary-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
