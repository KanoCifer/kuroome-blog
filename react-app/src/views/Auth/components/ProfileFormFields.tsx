import { Eye, EyeOff, Lock, Mail, Phone, ShieldUser, User } from 'lucide-react';
import type { ProfileForm } from '@/types';

interface ProfileFormFieldsProps {
  form: ProfileForm;
  errors: {
    name?: string;
    username?: string;
    email?: string;
    mobile?: string;
    password?: string;
  };
  showPassword: boolean;
  toggleGender: (value: string) => void;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ProfileFormFields({
  form,
  errors,
  showPassword,
  toggleGender,
  setForm,
  setShowPassword,
}: ProfileFormFieldsProps) {
  return (
    <>
      {/* Display Name */}
      <div className="mb-5">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Display Name
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
            <User className="size-5" />
          </div>
          <input
            type="text"
            autoComplete="off"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
            placeholder="Your name"
          />
        </div>
        {errors.name && (
          <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
            {errors.name}
          </span>
        )}
      </div>

      {/* Username */}
      <div className="mb-5">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Username <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
            <ShieldUser className="size-5" />
          </div>
          <input
            type="text"
            autoComplete="off"
            value={form.username}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, username: e.target.value }))
            }
            className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
            placeholder="Login username"
            required
          />
        </div>
        {errors.username && (
          <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
            {errors.username}
          </span>
        )}
      </div>

      {/* Gender */}
      <div className="mb-5">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Gender
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="group relative cursor-pointer">
            <input
              type="radio"
              value="male"
              checked={form.gender === 'male'}
              onChange={() => toggleGender('male')}
              className="peer sr-only"
            />
            <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 py-3.5 transition-all duration-300 group-active:scale-95 peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb]/10 peer-checked:shadow-lg peer-checked:shadow-blue-500/10 hover:border-blue-200 dark:border-slate-600 dark:bg-slate-700/50 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/20">
              <span className="text-sm font-medium text-gray-600 transition-colors peer-checked:text-[#2563eb] dark:text-gray-300 dark:peer-checked:text-blue-400">
                Male
              </span>
            </div>
          </label>
          <label className="group relative cursor-pointer">
            <input
              type="radio"
              value="female"
              checked={form.gender === 'female'}
              onChange={() => toggleGender('female')}
              className="peer sr-only"
            />
            <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 py-3.5 transition-all duration-300 group-active:scale-95 peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb]/10 peer-checked:shadow-lg peer-checked:shadow-blue-500/10 hover:border-blue-200 dark:border-slate-600 dark:bg-slate-700/50 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/20">
              <span className="text-sm font-medium text-gray-600 transition-colors peer-checked:text-[#2563eb] dark:text-gray-300 dark:peer-checked:text-blue-400">
                Female
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
            <Mail className="size-5" />
          </div>
          <input
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
            placeholder="your@email.com"
          />
        </div>
        {errors.email && (
          <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
            {errors.email}
          </span>
        )}
      </div>

      {/* Mobile */}
      <div className="mb-5">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Mobile
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
            <Phone className="size-5" />
          </div>
          <input
            type="tel"
            autoComplete="off"
            value={form.mobile}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, mobile: e.target.value }))
            }
            className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
            placeholder="Phone number"
          />
        </div>
        {errors.mobile && (
          <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
            {errors.mobile}
          </span>
        )}
      </div>

      {/* Password */}
      <div className="mb-6">
        <label className="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
            <Lock className="size-5" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
            className="w-full rounded-2xl border-0 bg-gray-100 py-3.5 pr-12 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
            placeholder="Leave empty to keep current"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#9ca3af] transition-all duration-200 hover:text-[#2563eb] dark:hover:text-blue-400"
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <span className="mt-1 block pl-1 text-[12px] font-medium text-red-500">
            {errors.password}
          </span>
        )}
      </div>
    </>
  );
}
