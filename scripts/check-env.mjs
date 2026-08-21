const production = process.argv.includes("--production");
const errors = [];
const warnings = [];

function required(name, minimumLength = 1) {
  const value = process.env[name] ?? "";
  if (value.length < minimumLength) errors.push(`${name} is missing or too short.`);
  return value;
}

function validUrl(name, value) {
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} must be a valid absolute URL.`);
    return null;
  }
}

validUrl("DATABASE_URL", required("DATABASE_URL", 12));
required("POLAR_ACCESS_TOKEN", 20);
const productId = required("POLAR_PRODUCT_ID", 20);
if (productId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
  errors.push("POLAR_PRODUCT_ID must be a Polar UUID.");
}
required("POLAR_WEBHOOK_SECRET", 20);
required("ADMIN_PASSWORD", 16);
required("CLICK_SALT", production ? 32 : 16);

const polarEnvironment = process.env.POLAR_ENV;
if (polarEnvironment !== "sandbox" && polarEnvironment !== "production") {
  errors.push('POLAR_ENV must be exactly "sandbox" or "production".');
}

const appUrl = validUrl(
  "NEXT_PUBLIC_APP_URL",
  required("NEXT_PUBLIC_APP_URL", 8),
);
if (production) {
  if (polarEnvironment !== "production") errors.push("POLAR_ENV must be production for launch.");
  if (appUrl?.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for launch.");
  required("UPSTASH_REDIS_REST_URL", 12);
  required("UPSTASH_REDIS_REST_TOKEN", 12);
} else if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  warnings.push("Redis is unset; rate limits are disabled in this environment.");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length > 0) process.exit(1);
console.log(`Environment check passed (${production ? "production" : "development"}).`);
