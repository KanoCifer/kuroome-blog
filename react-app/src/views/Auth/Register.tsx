import { useNotificationStore } from '@/stores/notificationState';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import request from '@/api/request';

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
  const [sendCodeText, setSendCodeText] = useState('SendCode');
  const [isSent, setIsSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="flex min-h-dvh items-center">
      <div className="squircle mx-auto max-w-md bg-blue-50/50 px-12 py-14 shadow-2xl dark:bg-gray-800/50">
        <p className="text-center font-serif text-2xl font-bold text-shadow-md dark:text-white">
          Register
        </p>
        <p className="mb-12 text-center font-serif text-gray-500 italic dark:text-gray-400">
          Create an account to start managing your reading list!
        </p>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="form-group">
            <input
              type="text"
              autoComplete="off"
              placeholder="Username"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
              required
            />
            {errors.username && (
              <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                {errors.username}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <input
              type="email"
              autoComplete="off"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
              required
            />
            {errors.email && (
              <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && (
              <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.confirmPassword && (
              <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Email Code */}
          <div className="mt-4 flex items-end gap-2">
            <div className="form-group mb-0 flex w-full items-center gap-2">
              <input
                type="text"
                autoComplete="off"
                placeholder="Email Code"
                value={form.emailCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, emailCode: e.target.value }))
                }
                className="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
                required
              />
              <button
                type="button"
                id="send-code"
                onClick={sendEmailCode}
                disabled={isSendingCode || isSent}
                className="h-full items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-progress disabled:bg-blue-950 dark:ring-offset-gray-800"
              >
                {sendCodeText}
              </button>
            </div>
          </div>
          {errors.emailCode && (
            <span className="mt-1 block text-sm text-red-600 dark:text-red-400">
              {errors.emailCode}
            </span>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>

          {errors.submit && (
            <span className="mt-2 block text-center text-sm text-red-600 dark:text-red-400">
              {errors.submit}
            </span>
          )}
        </form>

        <p className="mt-8 text-center font-serif text-gray-400">
          Kuroome's Blog
        </p>
        <div className="mb-4 text-center text-gray-400 dark:text-gray-300">
          Already have an account?
          <Link
            to="/login"
            className="underline transition duration-100 hover:font-bold"
          >
            {' '}
            Login here.{' '}
          </Link>
        </div>
      </div>
    </div>
  );
}
