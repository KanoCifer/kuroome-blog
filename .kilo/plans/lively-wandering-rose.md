# Plan: Add Dropdown Menu to MobileNav More Button

## Overview
Replace the static "More" button in `MobileNav.vue` with a shadcn-vue dropdown menu that opens upward, containing profile, login, logout, messages, and analytics items.

## Current State
- `MobileNav.vue` has a static "More" button that does nothing
- shadcn-vue `dropdown-menu` components are already installed at `@/components/ui/dropdown-menu/`
- Required icons exist: `IconUser`, `LoginIcon`, `LogoutIcon`, `MessageIcon`, `IconAnalytics`
- Routes exist: `/login`, `/messages`, `/analytics`, `/settings` (profile)
- Auth store has `logout()` function at `@/stores/auth`

## Changes

### File: `frontend/src/components/basic/MobileNav.vue`

1. **Update imports** - Add shadcn-vue dropdown components and icons:
   - `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger`
   - `IconUser`, `LoginIcon`, `LogoutIcon`, `MessageIcon`, `IconAnalytics` from `../icons`
   - `useRouter` from `vue-router` (for programmatic navigation)
   - `useAuthStore` from `@/stores/auth` (for logout)

2. **Replace "More" button section** (lines 70-80) with:
   - `DropdownMenu` wrapper
   - `DropdownMenuTrigger` wrapping the existing icon button
   - `DropdownMenuContent` with `side="top"` to open upward, `:side-offset="8"` for spacing
   - Menu items:
     - **Profile** (`IconUser`) → navigate to `/settings`
     - **Login** (`LoginIcon`) → navigate to `/login` (only shown when not authenticated)
     - **Messages** (`MessageIcon`) → navigate to `/messages`
     - **Analytics** (`IconAnalytics`) → navigate to `/analytics`
     - **Separator**
     - **Logout** (`LogoutIcon`) → call `authStore.logout()` (the store already navigates to `/` internally), only shown when authenticated, with `variant="destructive"`

3. **Style dropdown content** to match nav's glassmorphism aesthetic:
   - Use consistent `dark:` variants
   - Keep `font-['Inter']` for labels
   - Match the backdrop-blur and transparency style

## Verification
- Run `pnpm run type-check` to ensure no TypeScript errors
- Run `pnpm run lint` to check for lint issues
