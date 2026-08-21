import { Polar } from "@polar-sh/sdk";

const environment = process.env.POLAR_ENV === "production" ? "production" : "sandbox";
const client = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: environment,
});

try {
  const product = await client.products.get({ id: process.env.POLAR_PRODUCT_ID });
  if (product.isArchived) throw new Error("The configured Polar product is archived.");
  if (product.isRecurring) throw new Error("The bid product must be a one-time product.");
  console.log(`Polar check passed (${environment}, active one-time product).`);
} catch (error) {
  console.error(`Polar check failed (${environment}).`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
