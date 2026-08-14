"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicExperiencePath } from "@/config/route-scope";
import {
  CONSENT_CHANGED_EVENT,
  defaultConsentPreferences,
  readConsentPreferences,
  type ConsentPreferences,
} from "../privacy/consent";
import { configureBrowserProviders } from "./browser-providers";
import { getBrowserTracker } from "./client";
import type { AnalyticsConfig } from "./config";

export function TrackingBootstrap({ config }: Readonly<{ config: AnalyticsConfig }>) {
  const pathname = usePathname();
  useEffect(() => {
    const tracker = getBrowserTracker();
    if (!isPublicExperiencePath(pathname)) {
      tracker?.setProviders([]);
      return;
    }
    let active = configureBrowserProviders(
      config,
      readConsentPreferences(window.localStorage) ?? defaultConsentPreferences(),
    );
    tracker?.setProviders(active.providers);
    tracker?.track("page_view");

    const update = (event: Event) => {
      tracker?.setProviders([]);
      active.dispose();
      const preferences = event instanceof CustomEvent
        ? event.detail as ConsentPreferences
        : defaultConsentPreferences();
      active = configureBrowserProviders(config, preferences);
      tracker?.setProviders(active.providers);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, update);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, update);
      tracker?.setProviders([]);
      active.dispose();
    };
  }, [config, pathname]);
  return null;
}
