import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Compass, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@app/shared";
import { getErrorMessage } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import type { LoginInput } from "@app/shared";

/** Login page styled as AI Homesworld Travel with blue branding. */
export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    try {
      await login(data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-lg">
        {/* Logo & header */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <Compass size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">AI Homesworld Travel</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Đăng nhập để bắt đầu hành trình của bạn
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
              {serverError}
            </p>
          )}

          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
                {...register("email")}
                className={cn(
                  "h-11 w-full rounded-xl border bg-gray-50 dark:bg-gray-800 py-2 pl-10 pr-4 text-sm text-[var(--foreground)]",
                  "placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "disabled:opacity-50",
                  errors.email ? "border-red-400" : "border-gray-200 dark:border-gray-700",
                )}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isSubmitting}
                {...register("password")}
                className={cn(
                  "h-11 w-full rounded-xl border bg-gray-50 dark:bg-gray-800 py-2 pl-10 pr-10 text-sm text-[var(--foreground)]",
                  "placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "disabled:opacity-50",
                  errors.password ? "border-red-400" : "border-gray-200 dark:border-gray-700",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Remember me */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-blue-600"
            />
            Ghi nhớ đăng nhập
          </label>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập →"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Kết nối bảo mật doanh nghiệp
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Chưa có tài khoản?{" "}
            <span className="font-medium text-blue-600 dark:text-blue-400">Liên hệ Leader</span>
          </p>
        </div>
      </div>
    </div>
  );
}
