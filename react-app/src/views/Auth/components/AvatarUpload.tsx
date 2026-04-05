function IconCamera({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 36L12 26L18 34L26 22L34 32L40 24L46 36"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="16" r="10" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

interface AvatarUploadProps {
  avatarUrl: string;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AvatarUpload({ avatarUrl, onPhotoUpload }: AvatarUploadProps) {
  return (
    <div className="mb-8 flex flex-col items-center">
      <div className="group relative">
        <div className="h-28 w-28 overflow-hidden rounded-full border-[4px] border-white shadow-xl transition-all duration-300 dark:border-slate-700">
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
            onChange={onPhotoUpload}
          />
          <label
            htmlFor="photo-upload"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50 active:scale-95"
          >
            <IconCamera className="size-5" />
          </label>
        </div>
      </div>
    </div>
  );
}
