import request from '@/api/request';
import { useAuthStore } from '@/stores/authState';
import type { ProfileForm } from '@/types';
import { startRegistration } from '@simplewebauthn/browser';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  password?: string;
  submit?: string;
}

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border-none bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
              destructive
                ? 'bg-linear-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                : 'bg-linear-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettingView() {
  const [searchParams] = useSearchParams();
  const auth = useAuthStore();

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    username: '',
    gender: '',
    email: '',
    mobile: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>(
    'success',
  );
  const [avatarUrl, setAvatarUrl] = useState('/api/v1/media/default.png');
  const [showPassword, setShowPassword] = useState(false);

  const [hasPasskey, setHasPasskey] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [deletingPasskey, setDeletingPasskey] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState('');
  const [passkeyMessageType, setPasskeyMessageType] = useState<
    'success' | 'error'
  >('success');

  const [hasGitHubBound, setHasGitHubBound] = useState(false);
  const [bindingGitHub, setBindingGitHub] = useState(false);
  const [unbindingGitHub, setUnbindingGitHub] = useState(false);
  const [githubMessage, setGithubMessage] = useState('');
  const [githubMessageType, setGithubMessageType] = useState<
    'success' | 'error'
  >('success');

  const [passkeyDialogOpen, setPasskeyDialogOpen] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);

  useEffect(() => {
    if (auth.user) {
      setForm({
        name: auth.user.name || '',
        username: auth.user.username || '',
        gender: auth.user.gender || '',
        email: auth.user.email || '',
        mobile: auth.user.mobile || '',
        password: '',
      });
      setHasPasskey(!!auth.user.has_passkey);
      setHasGitHubBound(!!auth.user.github_bound);

      if (auth.user.photo?.startsWith('http')) {
        setAvatarUrl(auth.user.photo);
      } else if (auth.user.photo) {
        setAvatarUrl(`/api/v1/media/${auth.user.photo}`);
      }
    }
  }, [auth.user]);

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      const errorMessages: Record<string, string> = {
        not_logged_in: 'Please log in first to bind GitHub account',
        github_already_bound:
          'This GitHub account is already bound to another user',
        github_not_bound: 'Your account is not bound to GitHub',
        invalid_oauth_state: 'Invalid OAuth state, please try again',
        missing_pkce_info: 'Missing PKCE information, please try again',
        github_auth_failed: 'GitHub authentication failed, please try again',
      };
      setGithubMessage(errorMessages[error] || 'GitHub binding failed');
      setGithubMessageType('error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (success) {
      const successMessages: Record<string, string> = {
        github_bound: 'GitHub account bound successfully!',
        github_unbound: 'GitHub account unbound successfully!',
      };
      setGithubMessage(successMessages[success] || 'Operation successful');
      setGithubMessageType('success');
      auth.hydrateAuth();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, auth]);

  const toggleGender = (value: string) => {
    setForm((prev) => ({
      ...prev,
      gender: prev.gender === value ? '' : value,
    }));
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await request.put('/auth/upload-pic', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data) {
        await auth.hydrateAuth();
        setMessage('Avatar updated successfully!');
        setMessageType('success');
      }
    } catch {
      setMessage('Network error, please try again');
      setMessageType('error');
    }

    event.target.value = '';
  };

  const handleAddPasskey = async () => {
    setAddingPasskey(true);
    setPasskeyMessage('');

    try {
      const optionsRes = await request.get(
        '/auth/passkey/registration-options',
      );
      const options = optionsRes.data.data;

      const credential = await startRegistration({ optionsJSON: options });

      await request.post('/auth/passkey/register', {
        response: credential,
      });

      setPasskeyMessage('Passkey added successfully!');
      setPasskeyMessageType('success');
      setHasPasskey(true);
      await auth.hydrateAuth();
    } catch (err) {
      console.error('Add passkey error:', err);
      setPasskeyMessage('Failed to add passkey');
      setPasskeyMessageType('error');
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async () => {
    setDeletingPasskey(true);
    setPasskeyMessage('');

    try {
      await request.delete('/auth/passkey/delete');
      setPasskeyMessage('Passkey deleted successfully!');
      setPasskeyMessageType('success');
      setHasPasskey(false);
      await auth.hydrateAuth();
    } catch (err) {
      console.error('Delete passkey error:', err);
      setPasskeyMessage('Failed to delete passkey');
      setPasskeyMessageType('error');
    } finally {
      setDeletingPasskey(false);
    }
  };

  const handleBindGitHub = () => {
    setBindingGitHub(true);
    setGithubMessage('');
    window.location.href = '/api/v1/auth/github/bind';
  };

  const handleUnbindGitHub = async () => {
    setUnbindingGitHub(true);
    setGithubMessage('');

    try {
      await request.post('/auth/github/unbind');
      setGithubMessage('GitHub account unbound successfully!');
      setGithubMessageType('success');
      setHasGitHubBound(false);
      await auth.hydrateAuth();
    } catch (err) {
      console.error('Unbind GitHub error:', err);
      setGithubMessage('Failed to unbind GitHub account');
      setGithubMessageType('error');
    } finally {
      setUnbindingGitHub(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    setSaving(true);

    try {
      const payload = {
        name: form.name || '',
        username: form.username || '',
        gender: form.gender || null,
        email: form.email || null,
        mobile: form.mobile || null,
        password: form.password || null,
      };

      const response = await request.put('/auth/settings', payload);

      if (response.data.code === 200) {
        await auth.hydrateAuth();
        setForm((prev) => ({ ...prev, password: '' }));
        setMessage('Profile updated successfully!');
        setMessageType('success');
      } else {
        setMessage(response.data.message || 'Failed to update profile');
        setMessageType('error');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<
          string,
          string | string[] | undefined
        >;
        setErrors({
          name: typeof data.name === 'string' ? data.name : undefined,
          username:
            typeof data.username === 'string' ? data.username : undefined,
          email: typeof data.email === 'string' ? data.email : undefined,
          mobile: typeof data.mobile === 'string' ? data.mobile : undefined,
          password:
            typeof data.password === 'string' ? data.password : undefined,
          submit: typeof data.error === 'string' ? data.error : undefined,
        });
        if (!errors.submit) {
          setMessage('Failed to update profile');
          setMessageType('error');
        }
      } else {
        setMessage('Network error, please try again');
        setMessageType('error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-h-80vh overflow-y-auto py-10">
      <div
        className="squircle mx-auto max-w-2xl border border-white/70 bg-white/40 p-10 shadow-2xl dark:border-gray-700/30 dark:bg-gray-900/40"
        style={{ animation: 'fadeInUp 0.6s ease-out' }}
      >
        <div className="mb-12 text-center">
          <h1 className="bg-linear-to-r from-blue-600 to-sky-600 bg-clip-text text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-transparent dark:from-blue-400 dark:to-sky-400">
            Profile Settings
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your profile and preferences here
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-12 flex justify-center">
            <div className="group relative">
              <div className="h-32 w-32 overflow-hidden rounded-full border-[6px] border-white shadow-2xl transition-all duration-300 group-hover:shadow-blue-500/20 dark:border-gray-800">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute -right-2 -bottom-2">
                <input
                  id="photo-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif"
                  className="sr-only"
                  onChange={handlePhotoUpload}
                />
                <label
                  htmlFor="photo-upload"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-sky-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50 active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="pointer-events-none h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                    />
                  </svg>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display Name
              </label>
              <input
                type="text"
                autoComplete="off"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Your name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
                <span className="ml-1 text-xs text-red-400">*</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Login username"
                required
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="group relative cursor-pointer">
                <input
                  type="radio"
                  value="male"
                  checked={form.gender === 'male'}
                  onChange={() => toggleGender('male')}
                  className="peer sr-only"
                />
                <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 px-4 py-4 transition-all duration-300 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-linear-to-r peer-checked:from-blue-50 peer-checked:to-sky-50 peer-checked:shadow-lg peer-checked:shadow-blue-500/10 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-800/50 dark:peer-checked:border-blue-500 dark:peer-checked:from-blue-900/20 dark:peer-checked:to-sky-900/20">
                  <span className="text-sm font-medium text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400">
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
                <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 px-4 py-4 transition-all duration-300 group-active:scale-95 peer-checked:border-sky-500 peer-checked:bg-linear-to-r peer-checked:from-sky-50 peer-checked:to-cyan-50 peer-checked:shadow-lg peer-checked:shadow-sky-500/10 hover:border-sky-200 dark:border-gray-600 dark:bg-gray-800/50 dark:peer-checked:border-sky-500 dark:peer-checked:from-sky-900/20 dark:peer-checked:to-cyan-900/20">
                  <span className="text-sm font-medium text-gray-600 transition-colors peer-checked:text-sky-700 dark:text-gray-300 dark:peer-checked:text-sky-400">
                    Female
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mobile
              </label>
              <input
                type="tel"
                autoComplete="off"
                value={form.mobile}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mobile: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Phone number"
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-500">{errors.mobile}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Leave empty to keep current"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="rounded-full bg-white px-4 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                Security
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Passkeys
            </h3>
            {!hasPasskey ? (
              <button
                type="button"
                onClick={handleAddPasskey}
                disabled={addingPasskey}
                className="w-full rounded-2xl bg-linear-to-r from-emerald-500 to-green-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/30 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                {addingPasskey ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Adding Passkey...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      ></path>
                    </svg>
                    Add Passkey
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPasskeyDialogOpen(true)}
                disabled={deletingPasskey}
                className="w-full rounded-2xl bg-linear-to-r from-red-500 to-rose-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-red-500/30 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                {deletingPasskey ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Deleting Passkey...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    Delete Passkey
                  </span>
                )}
              </button>
            )}
            {passkeyMessage && (
              <p
                className={`text-center text-sm ${
                  passkeyMessageType === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {passkeyMessage}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              GitHub Account
            </h3>
            {!hasGitHubBound ? (
              <button
                type="button"
                onClick={handleBindGitHub}
                disabled={bindingGitHub}
                className="w-full rounded-2xl bg-gray-900 px-6 py-3.5 font-medium text-white shadow-lg shadow-gray-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-gray-500/30 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                {bindingGitHub ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Binding GitHub...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    Bind GitHub Account
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setGithubDialogOpen(true)}
                disabled={unbindingGitHub}
                className="w-full rounded-2xl bg-gray-900 px-6 py-3.5 font-medium text-white shadow-lg shadow-gray-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-gray-500/30 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                {unbindingGitHub ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Unbinding GitHub...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    Unbind GitHub Account
                  </span>
                )}
              </button>
            )}
            {githubMessage && (
              <p
                className={`text-center text-sm ${
                  githubMessageType === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {githubMessage}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-linear-to-r from-blue-500 to-sky-600 px-6 py-4 font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Saving Changes...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Save Changes
              </span>
            )}
          </button>

          {message && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-center text-sm ${
                messageType === 'success'
                  ? 'border-green-200 bg-linear-to-r from-green-50 to-emerald-50 text-green-700 dark:border-green-800/30 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400'
                  : 'border-red-200 bg-linear-to-r from-red-50 to-rose-50 text-red-700 dark:border-red-800/30 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {messageType === 'success' ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                )}
                <span>{message}</span>
              </div>
            </div>
          )}
        </form>
      </div>

      <AlertDialog
        open={passkeyDialogOpen}
        onOpenChange={setPasskeyDialogOpen}
        title="Are you absolutely sure?"
        description="This action cannot be undone. You will need to use your password to log in after deleting your passkey."
        onConfirm={handleDeletePasskey}
        destructive
      />

      <AlertDialog
        open={githubDialogOpen}
        onOpenChange={setGithubDialogOpen}
        title="Are you absolutely sure?"
        description="This action will unbind your GitHub account from your profile. You will no longer be able to log in with GitHub after this."
        onConfirm={handleUnbindGitHub}
        destructive
      />
    </div>
  );
}
