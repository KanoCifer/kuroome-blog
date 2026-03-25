<template>
  <div class="min-h-screen">
    <div
      class="squircle mx-auto max-w-2xl border border-white/70 bg-white/40 p-10 shadow-2xl dark:border-gray-700/30 dark:bg-gray-900/40"
      style="animation: fadeInUp 0.6s ease-out"
    >
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1
          class="bg-linear-to-r from-blue-600 to-sky-600 bg-clip-text text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-transparent dark:from-blue-400 dark:to-sky-400"
        >
          Profile Settings
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your profile and preferences here
        </p>
      </div>

      <!-- Avatar Section -->
      <div class="mb-12 flex justify-center">
        <div class="group relative">
          <div
            class="h-32 w-32 overflow-hidden rounded-full border-[6px] border-white shadow-2xl transition-all duration-300 group-hover:shadow-blue-500/20 dark:border-gray-800"
          >
            <img
              :src="avatarUrl"
              alt="Avatar"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div class="absolute -right-2 -bottom-2">
            <input
              id="photo-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              class="sr-only"
              @change="handlePhotoUpload"
            />
            <label
              for="photo-upload"
              class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-sky-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="pointer-events-none h-5 w-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
            </label>
          </div>
        </div>
      </div>

      <!-- Form Section -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Form Grid -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <!-- Name -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Name
            </label>
            <div class="relative">
              <input
                v-model="form.name"
                type="text"
                autocomplete="off"
                class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Your name"
              />
            </div>
            <p v-if="errors.name" class="mt-1 text-xs text-red-500">
              {{ errors.name }}
            </p>
          </div>

          <!-- Username -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
              <span class="ml-1 text-xs text-red-400">*</span>
            </label>
            <div class="relative">
              <input
                v-model="form.username"
                type="text"
                autocomplete="off"
                class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Login username"
              />
            </div>
            <p v-if="errors.username" class="mt-1 text-xs text-red-500">
              {{ errors.username }}
            </p>
          </div>
        </div>

        <!-- Gender -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"> Gender </label>
          <div class="grid grid-cols-2 gap-4">
            <label class="group relative cursor-pointer">
              <input
                v-model="form.gender"
                type="radio"
                value="male"
                class="peer sr-only"
                @click="toggleGender('male')"
              />
              <div
                class="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 px-4 py-4 transition-all duration-300 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-linear-to-r peer-checked:from-blue-50 peer-checked:to-sky-50 peer-checked:shadow-lg peer-checked:shadow-blue-500/10 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-800/50 dark:peer-checked:border-blue-500 dark:peer-checked:bg-linear-to-r dark:peer-checked:from-blue-900/20 dark:peer-checked:to-sky-900/20"
              >
                <span
                  class="text-sm font-medium text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400"
                  >Male</span
                >
              </div>
            </label>
            <label class="group relative cursor-pointer">
              <input
                v-model="form.gender"
                type="radio"
                value="female"
                class="peer sr-only"
                @click="toggleGender('female')"
              />
              <div
                class="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white/70 px-4 py-4 transition-all duration-300 group-active:scale-95 peer-checked:border-sky-500 peer-checked:bg-linear-to-r peer-checked:from-sky-50 peer-checked:to-cyan-50 peer-checked:shadow-lg peer-checked:shadow-sky-500/10 hover:border-sky-200 dark:border-gray-600 dark:bg-gray-800/50 dark:peer-checked:border-sky-500 dark:peer-checked:bg-linear-to-r dark:peer-checked:from-sky-900/20 dark:peer-checked:to-cyan-900/20"
              >
                <span
                  class="text-sm font-medium text-gray-600 transition-colors peer-checked:text-sky-700 dark:text-gray-300 dark:peer-checked:text-sky-400"
                  >Female</span
                >
              </div>
            </label>
          </div>
        </div>

        <!-- Contact Grid -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <!-- Email -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div class="relative">
              <input
                v-model="form.email"
                type="email"
                autocomplete="off"
                class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="your@email.com"
              />
            </div>
            <p v-if="errors.email" class="mt-1 text-xs text-red-500">
              {{ errors.email }}
            </p>
          </div>

          <!-- Mobile -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile
            </label>
            <div class="relative">
              <input
                v-model="form.mobile"
                type="tel"
                autocomplete="off"
                class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="Phone number"
              />
            </div>
            <p v-if="errors.mobile" class="mt-1 text-xs text-red-500">
              {{ errors.mobile }}
            </p>
          </div>
        </div>

        <!-- Password -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div class="relative">
            <input
              v-model="form.password"
              type="password"
              class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
              placeholder="Leave empty to keep current"
            />
          </div>
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">
            {{ errors.password }}
          </p>
        </div>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div class="relative flex justify-center">
            <span
              class="rounded-full bg-white px-4 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400"
            >
              Security
            </span>
          </div>
        </div>

        <!-- Passkey Section -->
        <div class="space-y-3">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Passkeys</h3>
          <button
            v-if="!hasPasskey"
            type="button"
            @click="handleAddPasskey"
            :disabled="addingPasskey"
            class="w-full rounded-2xl bg-linear-to-r from-emerald-500 to-green-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/30 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            <span v-if="addingPasskey" class="flex items-center justify-center gap-2">
              <span
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Adding Passkey...
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
              Add Passkey
            </span>
          </button>
          <AlertDialog v-else>
            <AlertDialogTrigger as-child>
              <button
                type="button"
                :disabled="deletingPasskey"
                class="w-full rounded-2xl bg-linear-to-r from-red-500 to-rose-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-red-500/30 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                <span v-if="deletingPasskey" class="flex items-center justify-center gap-2">
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></span>
                  Deleting Passkey...
                </span>
                <span v-else class="flex items-center justify-center gap-2">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                  Delete Passkey
                </span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent class="rounded-2xl border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle class="text-xl font-bold"
                  >Are you absolutely sure?</AlertDialogTitle
                >
                <AlertDialogDescription class="text-gray-600 dark:text-gray-400">
                  This action cannot be undone. You will need to use your password to log in after
                  deleting your passkey.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter class="gap-3">
                <AlertDialogCancel
                  class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  @click="handleDeletePasskey"
                  class="rounded-xl bg-linear-to-r from-red-500 to-rose-600 px-4 py-2 text-sm font-medium text-white hover:from-red-600 hover:to-rose-700"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p
            v-if="passkeyMessage"
            :class="[
              passkeyMessageType === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
              'text-center text-sm',
            ]"
          >
            {{ passkeyMessage }}
          </p>
        </div>

        <!-- GitHub Section -->
        <div class="space-y-3">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Account</h3>
          <button
            v-if="!hasGitHubBound"
            type="button"
            @click="handleBindGitHub"
            :disabled="bindingGitHub"
            class="w-full rounded-2xl bg-gray-900 px-6 py-3.5 font-medium text-white shadow-lg shadow-gray-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-gray-500/30 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            <span v-if="bindingGitHub" class="flex items-center justify-center gap-2">
              <span
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Binding GitHub...
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clip-rule="evenodd"
                />
              </svg>
              Bind GitHub Account
            </span>
          </button>
          <!-- <button
            v-else
            type="button"
            @click="handleBindGitHub"
            :disabled="bindingGitHub"
            class="w-full rounded-2xl bg-gray-900 px-6 py-3.5 font-medium text-white shadow-lg shadow-gray-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-gray-500/30 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            <span v-if="bindingGitHub" class="flex items-center justify-center gap-2">
              <span
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Binding GitHub...
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clip-rule="evenodd"
                />
              </svg>
              Bind GitHub Account
            </span>
          </button> -->
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <button
                v-if="hasGitHubBound"
                type="button"
                :disabled="unbindingGitHub"
                class="w-full rounded-2xl bg-gray-900 px-6 py-3.5 font-medium text-white shadow-lg shadow-gray-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-gray-500/30 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
              >
                <span v-if="unbindingGitHub" class="flex items-center justify-center gap-2">
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></span>
                  Unbinding GitHub...
                </span>
                <span v-else class="flex items-center justify-center gap-2">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                  Unbind GitHub Account
                </span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent class="rounded-2xl border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle class="text-xl font-bold"
                  >Are you absolutely sure?</AlertDialogTitle
                >
                <AlertDialogDescription class="text-gray-600 dark:text-gray-400">
                  This action will unbind your GitHub account from your profile. You will no longer
                  be able to log in with GitHub after this.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter class="gap-3">
                <AlertDialogCancel
                  class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  @click="handleUnbindGitHub"
                  class="rounded-xl bg-linear-to-r from-red-500 to-rose-600 px-4 py-2 text-sm font-medium text-white hover:from-red-600 hover:to-rose-700"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p
            v-if="githubMessage"
            :class="[
              githubMessageType === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
              'text-center text-sm',
            ]"
          >
            {{ githubMessage }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="saving"
          class="mt-4 w-full rounded-2xl bg-linear-to-r from-blue-500 to-sky-600 px-6 py-4 font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <span
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            ></span>
            Saving Changes...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            Save Changes
          </span>
        </button>

        <!-- Success/Error Messages -->
        <transition name="fade">
          <div v-if="message" class="mt-4">
            <div
              :class="[
                messageType === 'success'
                  ? 'border-green-200 bg-linear-to-r from-green-50 to-emerald-50 text-green-700 dark:border-green-800/30 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400'
                  : 'border-red-200 bg-linear-to-r from-red-50 to-rose-50 text-red-700 dark:border-red-800/30 dark:from-red-900/20 dark:to-rose-900/20 dark:text-red-400',
                'rounded-2xl border p-4 text-center text-sm',
              ]"
            >
              <div class="flex items-center justify-center gap-2">
                <svg
                  v-if="messageType === 'success'"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>{{ message }}</span>
              </div>
            </div>
          </div>
        </transition>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import type { ProfileForm } from "@/types";
import { startRegistration } from "@simplewebauthn/browser";
import { computed, onMounted, ref } from "vue";
const authStore = useAuthStore();

const form = ref<ProfileForm>({
  name: "",
  username: "",
  gender: "",
  email: "",
  mobile: "",
  password: "",
});

const errors = ref<Record<string, string>>({});
const saving = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");

const avatarUrl = computed(() => {
  if (authStore.user?.photo?.startsWith("http")) {
    return authStore.user.photo;
  }
  if (authStore.user?.photo) {
    return `/api/v1/media/${authStore.user.photo}`;
  }
  return "/api/v1/media/default.png";
});

const loadUserData = () => {
  if (authStore.user) {
    form.value.name = authStore.user.name || "";
    form.value.username = authStore.user.username || "";
    form.value.gender = authStore.user.gender || "";
    form.value.email = authStore.user.email || "";
    const userWithMobile = authStore.user as { mobile?: string } | null;
    form.value.mobile = userWithMobile?.mobile || "";
    const userWithPasskey = authStore.user as { has_passkey?: boolean } | null;
    hasPasskey.value = !!userWithPasskey?.has_passkey;
    const userWithGitHub = authStore.user as { github_bound?: boolean } | null;
    hasGitHubBound.value = !!userWithGitHub?.github_bound;
  }
};

const toggleGender = (value: string) => {
  if (form.value.gender === value) {
    form.value.gender = "";
  } else {
    form.value.gender = value;
  }
};

const handlePhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  console.log("Selected file:", input.files?.[0]);
  const file = input.files?.[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await request.put("/user/upload-pic", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data) {
      await authStore.fetchUser();
      message.value = "Avatar updated successfully!";
      messageType.value = "success";
    } else {
      message.value = response.data?.message || "Failed to upload avatar";
      messageType.value = "error";
    }
  } catch (error) {
    console.error("Avatar upload error:", error);
    message.value = "Network error, please try again";
    messageType.value = "error";
  }

  input.value = "";
};

// Passkey 相关
const addingPasskey = ref(false);
const deletingPasskey = ref(false);
const passkeyMessage = ref("");
const passkeyMessageType = ref<"success" | "error">("success");
const hasPasskey = ref(false);

// GitHub 相关
const bindingGitHub = ref(false);
const unbindingGitHub = ref(false);
const githubMessage = ref("");
const githubMessageType = ref<"success" | "error">("success");
const hasGitHubBound = ref<boolean>(false);

const handleAddPasskey = async () => {
  addingPasskey.value = true;
  passkeyMessage.value = "";

  try {
    // 获取注册选项
    const optionsRes = await request.get("/auth/passkey/registration-options");
    const options = optionsRes.data.data;

    // 调用浏览器 Passkey 注册
    const credential = await startRegistration(options);

    // 提交注册结果
    await request.post("/auth/passkey/register", {
      response: credential,
    });

    passkeyMessage.value = "Passkey added successfully!";
    passkeyMessageType.value = "success";
    hasPasskey.value = true;
  } catch (error) {
    console.error("Add passkey error:", error);
    passkeyMessage.value = "Failed to add passkey";
    passkeyMessageType.value = "error";
  } finally {
    addingPasskey.value = false;
  }
};

const handleDeletePasskey = async () => {
  deletingPasskey.value = true;
  passkeyMessage.value = "";

  try {
    await request.delete("/auth/passkey/delete");
    passkeyMessage.value = "Passkey deleted successfully!";
    passkeyMessageType.value = "success";
    hasPasskey.value = false;
  } catch (error) {
    console.error("Delete passkey error:", error);
    passkeyMessage.value = "Failed to delete passkey";
    passkeyMessageType.value = "error";
  } finally {
    deletingPasskey.value = false;
  }
};

// GitHub 绑定相关
const handleBindGitHub = () => {
  bindingGitHub.value = true;
  githubMessage.value = "";
  // 跳转到后端 GitHub 绑定接口
  window.location.href = "/api/v1/auth/github/bind";
};

const handleUnbindGitHub = async () => {
  unbindingGitHub.value = true;
  githubMessage.value = "";

  try {
    await request.post("/auth/github/unbind");
    githubMessage.value = "GitHub account unbound successfully!";
    githubMessageType.value = "success";
    hasGitHubBound.value = false;
    // 刷新用户信息
    await authStore.fetchUser();
  } catch (error) {
    console.error("Unbind GitHub error:", error);
    githubMessage.value = "Failed to unbind GitHub account";
    githubMessageType.value = "error";
  } finally {
    unbindingGitHub.value = false;
  }
};

const handleSubmit = async () => {
  saving.value = true;
  errors.value = {};
  message.value = "";

  try {
    const payload = {
      name: form.value.name || "",
      username: form.value.username || "",
      gender: form.value.gender || null,
      email: form.value.email || null,
      mobile: form.value.mobile || null,
      password: form.value.password || null,
    };

    const response = await request.put("/user/settings", payload);

    if (response.data.code === 200) {
      await authStore.fetchUser();
      form.value.password = "";
      message.value = "Profile updated successfully!";
      messageType.value = "success";
    } else {
      message.value = response.data.message || "Failed to update profile";
      messageType.value = "error";
    }
  } catch (error) {
    console.error("Settings update error:", error);
    message.value = "Network error, please try again";
    messageType.value = "error";
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadUserData();

  // 处理 URL 中的 GitHub 绑定结果参数
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  const success = urlParams.get("success");

  if (error) {
    const errorMessages: Record<string, string> = {
      not_logged_in: "Please log in first to bind GitHub account",
      github_already_bound: "This GitHub account is already bound to another user",
      github_not_bound: "Your account is not bound to GitHub",
      invalid_oauth_state: "Invalid OAuth state, please try again",
      missing_pkce_info: "Missing PKCE information, please try again",
      github_auth_failed: "GitHub authentication failed, please try again",
    };
    githubMessage.value = errorMessages[error] || "GitHub binding failed";
    githubMessageType.value = "error";
    // 清除 URL 参数
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (success) {
    const successMessages: Record<string, string> = {
      github_bound: "GitHub account bound successfully!",
      github_unbound: "GitHub account unbound successfully!",
    };
    githubMessage.value = successMessages[success] || "Operation successful";
    githubMessageType.value = "success";
    // 刷新用户信息
    authStore.fetchUser();
    // 清除 URL 参数
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
