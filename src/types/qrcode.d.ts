declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
}
