import { useNotificationStore } from '@/stores/notificationState';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldUser } from 'lucide-react';
import { useEffect } from 'react';
import axios from 'axios';
import request from '@/api/request';

function IconCloud({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 33C8.66666 33 4 31.5 4 25.5C4 18.5 11 17 13 17C14 13.5 16 8 24 8C31 8 34 12 35 15.5C35 15.5 44 16.5 44 25C44 31 40 33 36 33"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 33L24 38L32 28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  emailCode?: string;
  submit?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const notifier = useNotificationStore();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    emailCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [sendCodeText, setSendCodeText] = useState('Send Code');
  const [isSent, setIsSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsReady(true);
    }, 50);
  }, []);

  const sendEmailCode = async () => {
    if (!form.email) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter your email first',
      }));
      return;
    }

    setIsSendingCode(true);
    setSendCodeText('Sending...');

    try {
      await request.post('/auth/email/code', {
        email: form.email,
      });
      setSendCodeText('Sent!');
      notifier.success('验证码已发送到您的邮箱，请注意查收');
      setIsSent(true);
      let countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          setSendCodeText('SendCode');
          setIsSent(false);
        } else {
          setSendCodeText(`${countdown}s`);
        }
      }, 1000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrors((prev) => ({ ...prev, email: err.response?.data?.message }));
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await request.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
        email_code: form.emailCode,
      });

      if (response.data.status === 'success') {
        navigate('/login');
        notifier.success('注册成功！请使用您的账号登录');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<
          string,
          string | string[] | undefined
        >;
        setErrors({
          username:
            typeof data.username === 'string'
              ? data.username
              : data.username?.[0],
          email: typeof data.email === 'string' ? data.email : data.email?.[0],
          password:
            typeof data.password === 'string'
              ? data.password
              : data.password?.[0],
          confirmPassword:
            typeof data.confirm_password === 'string'
              ? data.confirm_password
              : data.confirm_password?.[0],
          emailCode:
            typeof data.email_code === 'string'
              ? data.email_code
              : data.email_code?.[0],
          submit: typeof data.error === 'string' ? data.error : undefined,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-body relative min-h-screen bg-gray-50 dark:bg-gray-800 overflow-hidden">
      {/* Main Content */}
      <main className="relative z-10 mt-4 flex flex-col items-center px-5 pt-8 pb-10">
        {/* Hero Section */}
        <div
          className={`mb-8 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
            isReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)]">
            <IconCloud className="size-8" />
          </div>
          <h2 className="font-headline text-center text-[28px] font-extrabold tracking-tight text-[#111827] dark:text-white">
            Join kanocifer
            <span className="text-[#2563eb] dark:text-blue-400">.chat</span>
          </h2>
          <p className="mt-1 text-center text-[15px] font-medium text-[#4b5563] dark:text-gray-400">
            Create your account to start managing your reading list!
          </p>
        </div>

        {/* Register Card */}
        <div
          className={`w-full max-w-100 rounded-4xl border border-white/50 bg-white/70 p-6 shadow-xl transition-all delay-100 duration-700 ease-out dark:border-slate-700/50 dark:bg-slate-800/60 ${
            isReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <form className="flex flex-col" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="mb-5">
              <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
                Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                  <ShieldUser className="size-6" />
                </div>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
                />
              </div>
              {errors.username && (
                <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
                  {errors.username}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div className="mb-5">
              <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
                />
              </div>
              {errors.email && (
                <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-12 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#9ca3af] transition-all duration-200 hover:text-[#2563eb] dark:hover:text-blue-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && (
                <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="mb-5">
              <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-12 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#9ca3af] transition-all duration-200 hover:text-[#2563eb] dark:hover:text-blue-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Email Code Field */}
            <div className="mb-5">
              <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
                Email Code
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Enter code"
                    value={form.emailCode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, emailCode: e.target.value }))
                    }
                    className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  id="send-code"
                  onClick={sendEmailCode}
                  disabled={isSendingCode || isSent}
                  className="shrink-0 rounded-full bg-blue-500 px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_16px_rgba(30,58,138,0.2)] transition-all hover:bg-[#1e3a8a]/90 active:scale-[0.98] disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-600/90"
                >
                  {isSendingCode ? '...' : isSent ? 'Sent!' : sendCodeText}
                </button>
              </div>
              {errors.emailCode && (
                <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
                  {errors.emailCode}
                </span>
              )}
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mb-4 w-full rounded-full bg-blue-500 py-4 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(30,58,138,0.2)] transition-all hover:bg-[#1e3a8a]/90 active:scale-[0.98] disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-600/90"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>

            {errors.submit && (
              <div className="mt-4 text-center text-[12px] font-medium text-red-500 p-2 bg-red-100 rounded-2xl">
                {errors.submit}
              </div>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-[14.5px] font-medium text-[#4b5563] dark:text-gray-300">
              Already have an account?
              <Link
                to="/login"
                className="ml-1 font-bold text-[#1d4ed8] hover:underline dark:text-blue-400"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
