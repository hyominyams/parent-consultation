"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{
        className:
          "!rounded-[1.5rem] !border-0 !bg-white !text-[color:var(--text-strong)] !shadow-[0_22px_50px_rgba(30,57,75,0.12)]",
      }}
    />
  );
}
