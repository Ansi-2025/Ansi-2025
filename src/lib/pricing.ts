export const MUSIC_PRICE_CENTS = 1990;
export const SECOND_VERSION_PRICE_CENTS = 500;

export function getMusicPriceCents(secondVersion = false, basePriceCents = MUSIC_PRICE_CENTS) {
  return basePriceCents + (secondVersion ? SECOND_VERSION_PRICE_CENTS : 0);
}

export function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
