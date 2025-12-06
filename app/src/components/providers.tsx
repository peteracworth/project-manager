"use client";

import { ReactNode } from "react";
import { ViewProvider } from "@/contexts/view-context";

export function Providers({ children }: { children: ReactNode }) {
  return <ViewProvider>{children}</ViewProvider>;
}

