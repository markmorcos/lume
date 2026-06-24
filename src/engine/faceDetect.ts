import { PixelBuffer } from "./decode";
import { FaceRegion } from "./faceRegion";

// Normalised face signal an OS face detector can provide. All probabilities
// 0..1; angles in degrees. Optional because the heuristic path supplies none.
export interface MLFace {
  bounds: { x: number; y: number; w: number; h: number }; // pixels in the working buffer
  smilingProbability?: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  yaw?: number; // head Euler Y
  roll?: number; // head Euler Z
  pitch?: number; // head Euler X
}

export interface FaceProvider {
  name: string;
  detect: (buf: PixelBuffer, uri: string) => Promise<MLFace | null>;
}

let provider: FaceProvider | null = null;

// Wire a native detector here in a dev/EAS build, e.g. an adapter around
// @react-native-ml-kit/face-detection or a VisionCamera frame processor.
// Left null by default so the project bundles and runs in Expo Go on the
// deterministic heuristic path (§5).
export function setFaceProvider(p: FaceProvider | null) {
  provider = p;
}

export function hasNativeFaces(): boolean {
  return provider != null;
}

export async function detectFace(
  buf: PixelBuffer,
  uri: string,
  fallback: FaceRegion
): Promise<{ region: FaceRegion; ml: MLFace | null }> {
  if (!provider) return { region: fallback, ml: null };
  try {
    const ml = await provider.detect(buf, uri);
    if (!ml) return { region: fallback, ml: null };
    return {
      region: {
        rect: ml.bounds,
        confidence: 0.95,
        found: true,
      },
      ml,
    };
  } catch {
    return { region: fallback, ml: null };
  }
}
