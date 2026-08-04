// The Arena login screen, mounted inside /arena.
//
// It exists as its own route because the Android APK scopes itself to /arena:
// any navigation outside that prefix opens a browser tab with an address bar, so
// sending an unauthenticated student to /auth/arena-login or /login would knock
// them out of the app on the very first launch — before they ever see Arena.
//
// The screen itself is unchanged and still lives at its original path; this route
// only remounts it. lib/supabase/proxy.ts sends /arena/* here instead of /login.
export { default } from "@/app/auth/arena-login/page";
