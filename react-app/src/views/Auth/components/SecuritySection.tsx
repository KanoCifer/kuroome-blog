import { IconGitHub } from '@/components/basic/icon/IconGitHub';
import { Key, Trash2 } from 'lucide-react';

interface SecuritySectionProps {
  hasPasskey: boolean;
  addingPasskey: boolean;
  deletingPasskey: boolean;
  passkeyMessage: string;
  passkeyMessageType: 'success' | 'error';
  hasGitHubBound: boolean;
  bindingGitHub: boolean;
  unbindingGitHub: boolean;
  githubMessage: string;
  githubMessageType: 'success' | 'error';
  onAddPasskey: () => void;
  onBindGitHub: () => void;
  onOpenPasskeyDialog: () => void;
  onOpenGithubDialog: () => void;
}

export function SecuritySection({
  hasPasskey,
  addingPasskey,
  deletingPasskey,
  passkeyMessage,
  passkeyMessageType,
  hasGitHubBound,
  bindingGitHub,
  unbindingGitHub,
  githubMessage,
  githubMessageType,
  onAddPasskey,
  onBindGitHub,
  onOpenPasskeyDialog,
  onOpenGithubDialog,
}: SecuritySectionProps) {
  return (
    <>
      {/* Divider */}
      <div className="my-5 flex items-center justify-center text-center">
        <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700"></div>
        <span className="px-3 text-[11px] font-bold tracking-wider text-[#6b7280] uppercase dark:text-gray-400">
          Security
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700"></div>
      </div>

      {/* Passkeys */}
      <div className="mb-4">
        {!hasPasskey ? (
          <button
            type="button"
            onClick={onAddPasskey}
            disabled={addingPasskey}
            className="flex w-full items-center justify-center space-x-2 rounded-full bg-emerald-500 py-4 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(5,150,105,0.2)] transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-70"
          >
            {addingPasskey ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Adding Passkey...</span>
              </>
            ) : (
              <>
                <Key className="size-5" />
                <span>Add Passkey</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenPasskeyDialog}
            disabled={deletingPasskey}
            className="flex w-full items-center justify-center space-x-2 rounded-full bg-red-500 py-4 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(220,38,38,0.2)] transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-70"
          >
            {deletingPasskey ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Deleting Passkey...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-5" />
                <span>Delete Passkey</span>
              </>
            )}
          </button>
        )}
        {passkeyMessage && (
          <div
            className={`mt-3 text-center text-[12px] font-medium p-2 rounded-2xl ${
              passkeyMessageType === 'success'
                ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
            }`}
          >
            {passkeyMessage}
          </div>
        )}
      </div>

      {/* GitHub */}
      <div className="mb-6">
        {!hasGitHubBound ? (
          <button
            type="button"
            onClick={onBindGitHub}
            disabled={bindingGitHub}
            className="flex w-full items-center justify-center space-x-2.5 rounded-full bg-[#0f172a] py-4 text-[15px] font-bold text-white shadow-md transition-all hover:bg-black active:scale-[0.98] disabled:opacity-70 dark:border dark:border-white/10 dark:bg-black/50"
          >
            {bindingGitHub ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Binding GitHub...</span>
              </>
            ) : (
              <>
                <IconGitHub />
                <span>Bind GitHub Account</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenGithubDialog}
            disabled={unbindingGitHub}
            className="flex w-full items-center justify-center space-x-2.5 rounded-full bg-[#0f172a] py-4 text-[15px] font-bold text-white shadow-md transition-all hover:bg-black active:scale-[0.98] disabled:opacity-70 dark:border dark:border-white/10 dark:bg-black/50"
          >
            {unbindingGitHub ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Unbinding GitHub...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-5" />
                <span>Unbind GitHub Account</span>
              </>
            )}
          </button>
        )}
        {githubMessage && (
          <div
            className={`mt-3 text-center text-[12px] font-medium p-2 rounded-2xl ${
              githubMessageType === 'success'
                ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
            }`}
          >
            {githubMessage}
          </div>
        )}
      </div>
    </>
  );
}
