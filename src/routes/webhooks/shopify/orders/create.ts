import { createFileRoute } from '@tanstack/react-router';
import { handleShopifyWebhook } from '@/lib/shopify.webhook';

// Minimal Route export so the router-generator includes this file in the route tree
export const Route = createFileRoute('/webhooks/shopify/orders/create')({});

export async function POST(request: Request) {
  return handleShopifyWebhook(request);
}
