import { handleShopifyWebhook } from '@/lib/shopify.webhook';

export async function POST(request: Request) {
  return handleShopifyWebhook(request);
}
