declare module "upng-js" {
  export interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: Uint8Array;
  }
  export function decode(buffer: ArrayBuffer): UPNGImage;
  export function toRGBA8(img: UPNGImage): ArrayBuffer[];
  export function encode(
    imgs: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number,
    dels?: number[]
  ): ArrayBuffer;
  const UPNG: {
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
    encode: typeof encode;
  };
  export default UPNG;
}
