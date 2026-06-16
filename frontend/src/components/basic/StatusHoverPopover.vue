<template>
  <!-- 文学手账风 mini-window：hover ~400ms 弹出，自渲染精简状态卡 -->
  <HoverCardRoot :open-delay="400" :close-delay="150">
    <HoverCardTrigger as-child>
      <slot name="trigger" />
    </HoverCardTrigger>

    <HoverCardPortal>
      <HoverCardContent
        :side="'top'"
        :align="'end'"
        :side-offset="8"
        :collision-padding="12"
        class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 z-[100] w-[420px] rounded-lg outline-none"
      >
        <div
          class="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 border-border/60 overflow-hidden rounded-lg border shadow-xl backdrop-blur-md"
        >
          <header
            class="border-border/40 bg-muted/30 flex items-center gap-2.5 border-b px-3 py-2"
          >
            <div class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-red-400/70" />
              <span class="h-2 w-2 rounded-full bg-yellow-400/70" />
              <span class="h-2 w-2 rounded-full bg-emerald-400/70" />
            </div>
            <span
              class="text-foreground/80 font-serif text-[12px] tracking-wide italic"
              >Service Status</span
            >
            <span
              class="text-muted-foreground/60 ml-auto font-mono text-[10px] tracking-[0.1em] lowercase"
              >/status</span
            >
          </header>

          <StatusMini />

          <footer
            class="border-border/40 text-muted-foreground/70 flex items-center justify-between border-t px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] uppercase"
          >
            <span>live preview</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="bg-success h-1 w-1 rounded-full" />
              <span>{{ visitorCount.count }} online</span>
            </span>
          </footer>
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<script setup lang="ts">
import { useVisitorCountStore } from '@/stores/visitorCount';
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui';
import StatusMini from './StatusMini.vue';

const visitorCount = useVisitorCountStore();
</script>
