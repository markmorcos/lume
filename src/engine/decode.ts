import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import UPNG from "upng-js";

export interface PixelBuffer {
  width: number;
  height: number;
  // RGBA, row-major, 4 bytes per pixel.
  data: Uint8Array;
}

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Self-contained base64 -> bytes (no reliance on atob being present in the JS engine).
function base64ToBytes(b64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  let len = b64.length;
  while (len > 0 && b64[len - 1] === "=") len--;
  const out = new Uint8Array((len * 3) >> 2);
  let p = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    buf = (buf << 6) | lookup[b64.charCodeAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}

// Downscale to a small working size then decode to raw RGBA. The long edge is
// capped (default 220px) so 20 images stay cheap on older devices (§12).
export async function loadPixels(
  uri: string,
  maxEdge = 220
): Promise<PixelBuffer> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: maxEdge });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.PNG,
    base64: true,
    compress: 1,
  });
  if (!saved.base64) throw new Error("decode: no base64 produced");
  // Strip a possible "data:image/png;base64," prefix before decoding.
  const comma = saved.base64.indexOf(",");
  const b64 =
    saved.base64.startsWith("data:") && comma >= 0
      ? saved.base64.slice(comma + 1)
      : saved.base64;
  const bytes = base64ToBytes(b64);
  const png = UPNG.decode(bytes.buffer as ArrayBuffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);
  return { width: png.width, height: png.height, data: rgba };
}
