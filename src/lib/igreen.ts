import { getIGreenConfig } from "@/config/env";
import type { IGreenConfig } from "@/types/igreen";

export function buildIGreenReferralUrl(
  config: IGreenConfig = getIGreenConfig(),
): URL {
  const referralUrl = new URL(config.baseUrl);

  referralUrl.searchParams.set("id", config.referralId);
  referralUrl.searchParams.set("sendcontract", String(config.sendContract));

  return referralUrl;
}
