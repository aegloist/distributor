import { PaymentStatus } from "./payment-status";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkoutId?: string }>;
}) {
  const { checkoutId = "" } = await searchParams;
  return <PaymentStatus checkoutId={checkoutId} />;
}
