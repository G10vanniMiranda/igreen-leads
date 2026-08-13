import type { IGreenConfig } from "@/types/igreen";

type IGreenEnvironment = Readonly<{
  IGREEN_BASE_URL: string | undefined;
  IGREEN_REFERRAL_ID: string | undefined;
  IGREEN_SEND_CONTRACT: string | undefined;
}>;

function requireValue(name: keyof IGreenEnvironment, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(
      `[config] ${name} é obrigatória. Consulte o arquivo .env.example.`,
    );
  }

  return normalized;
}

function parseHttpsUrl(name: keyof IGreenEnvironment, value: string | undefined) {
  const normalized = requireValue(name, value);

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("A URL deve usar HTTPS e não pode conter credenciais.");
    }

    return url;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "URL inválida";
    throw new Error(`[config] ${name} é inválida: ${reason}`);
  }
}

function parseBoolean(name: keyof IGreenEnvironment, value: string | undefined) {
  const normalized = requireValue(name, value).toLowerCase();

  if (normalized !== "true" && normalized !== "false") {
    throw new Error(`[config] ${name} deve ser "true" ou "false".`);
  }

  return normalized === "true";
}

function parseReferralId(value: string | undefined) {
  const referralId = requireValue("IGREEN_REFERRAL_ID", value);

  if (/\s|[\u0000-\u001F\u007F]/u.test(referralId)) {
    throw new Error(
      "[config] IGREEN_REFERRAL_ID não pode conter espaços ou caracteres de controle.",
    );
  }

  return referralId;
}

export function parseIGreenConfig(env: IGreenEnvironment): IGreenConfig {
  return Object.freeze({
    baseUrl: parseHttpsUrl("IGREEN_BASE_URL", env.IGREEN_BASE_URL),
    referralId: parseReferralId(env.IGREEN_REFERRAL_ID),
    sendContract: parseBoolean(
      "IGREEN_SEND_CONTRACT",
      env.IGREEN_SEND_CONTRACT,
    ),
  });
}

export function getIGreenConfig(): IGreenConfig {
  return parseIGreenConfig({
    IGREEN_BASE_URL: process.env.IGREEN_BASE_URL,
    IGREEN_REFERRAL_ID: process.env.IGREEN_REFERRAL_ID,
    IGREEN_SEND_CONTRACT: process.env.IGREEN_SEND_CONTRACT,
  });
}
