type SecurityEnvironment = Readonly<Record<string, string | undefined>>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function buildContentSecurityPolicy(env: SecurityEnvironment): string {
  const development = env.NODE_ENV === "development";
  const externalEnvironment = env.ANALYTICS_ENVIRONMENT === "test" || env.ANALYTICS_ENVIRONMENT === "preview";
  const ga = externalEnvironment && enabled(env.GA_ENABLED) && Boolean(env.GA_MEASUREMENT_ID?.trim());
  const meta = externalEnvironment && enabled(env.META_PIXEL_ENABLED) && Boolean(env.META_PIXEL_ID?.trim());
  const scriptSources = ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])];
  const connectSources = ["'self'"];
  const imageSources = ["'self'", "data:", "blob:"];

  if (ga) {
    scriptSources.push("https://www.googletagmanager.com");
    connectSources.push("https://www.google-analytics.com", "https://region1.google-analytics.com");
    imageSources.push("https://www.google-analytics.com");
  }
  if (meta) {
    scriptSources.push("https://connect.facebook.net");
    connectSources.push("https://www.facebook.com");
    imageSources.push("https://www.facebook.com");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "media-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (enabled(env.SECURITY_HTTPS_HEADERS_ENABLED)) directives.push("upgrade-insecure-requests");
  return `${directives.join("; ")};`;
}

export function createSecurityHeaders(env: SecurityEnvironment): Array<{ key: string; value: string }> {
  const headers = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
  if (enabled(env.SECURITY_HTTPS_HEADERS_ENABLED) && env.NODE_ENV === "production") {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  }
  if (!enabled(env.INDEXING_ENABLED)) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  }
  return headers;
}
