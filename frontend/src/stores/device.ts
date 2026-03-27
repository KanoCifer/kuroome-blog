import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useMediaQuery } from "@vueuse/core";

export const useDeviceStore = defineStore("device", () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return { isMobile };
});
