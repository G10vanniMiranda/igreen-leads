"use client";

import { useEffect } from "react";
import { getBrowserTracker } from "./client";

export function TrackingBootstrap() {
  useEffect(() => {
    getBrowserTracker()?.track("page_view");
  }, []);
  return null;
}
