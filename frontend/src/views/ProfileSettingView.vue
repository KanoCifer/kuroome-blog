<template>
  <div
    class="m-4 mx-auto max-w-md rounded-[40px] bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:bg-gray-800/50"
  >
    <p class="text-2xl font-bold dark:text-white">Profile Settings</p>
    <p class="mb-4 text-gray-500 italic dark:text-gray-400">
      Manage your profile and preferences here.
    </p>
    <!-- Avatar Section -->
    <div class="mb-8 flex justify-center">
      <div class="relative">
        <div
          class="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-gray-700"
        >
          <img
            :src="avatarUrl"
            alt="Avatar"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="absolute right-0 bottom-0">
          <input
            id="photo-upload"
            type="file"
            accept=".jpg,.jpeg,.png,.gif"
            class="sr-only"
            @change="handlePhotoUpload"
          />
          <label
            for="photo-upload"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-colors hover:bg-blue-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="pointer-events-none h-4 w-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </label>
        </div>
      </div>
    </div>

    <!-- Form Section -->
    <form @submit.prevent="handleSubmit">
      <!-- Name -->
      <div class="mb-4">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name
        </label>
        <input
          v-model="form.name"
          type="text"
          autocomplete="off"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Your display name"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-red-500">
          {{ errors.name }}
        </p>
      </div>

      <!-- Username -->
      <div class="mb-4">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Username
          <span class="text-xs text-red-400 italic">* Login-in name</span>
        </label>
        <input
          v-model="form.username"
          type="text"
          autocomplete="off"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Your username"
        />
        <p v-if="errors.username" class="mt-1 text-sm text-red-500">
          {{ errors.username }}
        </p>
      </div>

      <!-- Gender -->
      <div class="mb-4">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Gender
        </label>
        <div class="flex gap-4">
          <label class="group relative flex-1 cursor-pointer">
            <input
              v-model="form.gender"
              type="radio"
              value="male"
              class="peer sr-only"
              @click="toggleGender('male')"
            />
            <div
              class="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50"
            >
              <span
                class="text-sm font-semibold text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400"
                >Male</span
              >
            </div>
          </label>
          <label class="group relative flex-1 cursor-pointer">
            <input
              v-model="form.gender"
              type="radio"
              value="female"
              class="peer sr-only"
              @click="toggleGender('female')"
            />
            <div
              class="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50"
            >
              <span
                class="text-sm font-semibold text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400"
                >Female</span
              >
            </div>
          </label>
        </div>
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          v-model="form.email"
          type="email"
          autocomplete="off"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="your@email.com"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-500">
          {{ errors.email }}
        </p>
      </div>

      <!-- Mobile -->
      <div class="mb-4">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Mobile
        </label>
        <input
          v-model="form.mobile"
          type="tel"
          autocomplete="off"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Your phone number"
        />
        <p v-if="errors.mobile" class="mt-1 text-sm text-red-500">
          {{ errors.mobile }}
        </p>
      </div>

      <!-- Password -->
      <div class="mb-6">
        <label
          class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <input
          v-model="form.password"
          type="password"
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Leave empty to keep current"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-500">
          {{ errors.password }}
        </p>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="saving"
        class="mt-4 w-full rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
      >
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <span
            class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          ></span>
          Saving...
        </span>
        <span v-else>Save</span>
      </button>

      <!-- Success/Error Messages -->
      <div v-if="message" class="mt-4 text-center">
        <p
          :class="[
            messageType === 'success'
              ? 'bg-green-50 text-green-600'
              : 'bg-red-50 text-red-600',
            'rounded-3xl px-4 py-2',
          ]"
        >
          {{ message }}
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import type { ProfileForm } from "@/types";
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

const handleSubmit = async () => {
  saving.value = true;
  errors.value = {};
  message.value = "";

  try {
    const payload = {
      name: form.value.name,
      username: form.value.username,
      gender: form.value.gender || null,
      email: form.value.email || null,
      mobile: form.value.mobile || null,
      password: form.value.password || null,
    };

    const response = await request.post("/user/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.data.data.status === "success") {
      await authStore.fetchUser();
      form.value.password = "";
      message.value = "Profile updated successfully!";
      messageType.value = "success";
    } else {
      if (response.data.data.error) {
        message.value = response.data.data.error;
      } else {
        message.value = "Failed to update profile";
      }
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
});
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
