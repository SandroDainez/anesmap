"use client";

import { useEffect } from "react";
import { migrateLocalHistoryToAccount } from "@/lib/user-study";

export function AuthBootstrap() {
  useEffect(() => {
    void migrateLocalHistoryToAccount();
  }, []);

  return null;
}
