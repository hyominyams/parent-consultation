"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type RouteToastProps = {
  type?: "success" | "error" | "info";
  message?: string;
  toastId?: string;
};

export function RouteToast({ type = "info", message, toastId }: RouteToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const sender = type === "success" ? toast.success : type === "error" ? toast.error : toast;
    sender(message, {
      id: toastId,
    });
  }, [message, toastId, type]);

  return null;
}
