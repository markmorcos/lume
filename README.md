# LUMÉ — "Best Shot" Picture Picker

Pick up to 20 near-identical photos; LUMÉ scores each on photographic + facial
craft **entirely on-device** and returns a ranked top three. Three presets
(Dating / LinkedIn / Social) bias the scoring; toggles fine-tune it. Premium
($6.99/mo, 7-day trial) gates export, history, group + posture scoring and custom
weighting.

Built with **React Native + Expo (SDK 56)**, TypeScript. Atelier visual
direction (Bodoni Moda / Archivo / Space Mono; ink `#0b0b0f`, accent `#7c5cff`).

## Run

```bash
npm install
npm run ios          # or: npm run android
```

The photo picker, scoring, presets, results, save-winner and paywall all run in
**Expo Go** on a device (the engine uses a pure-JS deterministic CV path — no
native modules required). The simulator works too but has an empty photo library.

```bash
npm run check        # tsc --noEmit + engine math sanity checks
```

## Architecture

```
src/
  theme/        Swappable token bundle (Atelier) + font loading + ThemeContext
  state/        types, preset weight tables, analytics funnel, SessionContext (state machine)
  engine/       on-device scoring: decode → faceRegion → scorers → aggregate → engine
  iap/          entitlement layer (mock StoreKit provider, swappable)
  components/    UI primitives (Screen, Display/Body/Kicker, buttons)
  screens/      Empty · Picker · Criteria · Analyzing · Result · Paywall
```

Flow (`src/state/types.ts` `Route`): `empty → picker → criteria → analyzing →
result`; paywall floats over any screen.

### Scoring engine (the defining decision: 100% on-device, classic CV)

Per image: downscale (`expo-image-manipulator`) → decode to RGBA (`upng-js`) →
localise the face → compute six 0–10 sub-scores → weighted aggregate → rank.

| Criterion | Method (`src/engine/scorers.ts`) |
|---|---|
| Clarity | Laplacian variance (edge energy) on the face crop |
| Light & colour | Exposure / dynamic-range / white-balance / warmth on the face |
| Proportion | Face position on thirds, frame fill, head pose |
| Eye contact | Upper-face contrast energy (or ML eye-open prob) |
| Smile | Mouth-region brightness/contrast (or ML smiling prob) |
| Good hair day | Hair-band tidiness/evenness heuristic — the fuzzy one (v1) |

Aggregate: `overall = round(100 × Σ(wᵢ·sᵢ) / Σwᵢ / 10)`. Presets are weight maps;
toggling a criterion off sets its weight to 0. Tie-break: clarity → eye contact.

Raw 0–10 scores are cached per shot, so switching preset/toggles **re-ranks
instantly** without re-decoding.

## Upgrading the engine with a native face detector (optional, EAS build)

The face-dependent criteria (smile, eye contact, proportion) improve markedly
with real landmarks. The engine is detector-agnostic: implement a
`FaceProvider` and register it once at startup.

```ts
// e.g. an adapter around @react-native-ml-kit/face-detection or a
// VisionCamera frame processor — requires a dev/EAS build, not Expo Go.
import { setFaceProvider } from "./src/engine/faceDetect";
setFaceProvider({ name: "mlkit", detect: async (buf, uri) => /* MLFace | null */ });
```

When present, ML `smilingProbability` / `*EyeOpenProbability` / head angles drive
those scorers directly; otherwise the heuristic path is used. UI never changes.

## StoreKit 2 wiring (replace the mock)

`src/iap/purchases.ts` ships a `MockProvider` so the paywall, trial, gating and
restore are fully exercisable without a build. For production, implement a
`PurchaseProvider` backed by StoreKit 2 (`Transaction.currentEntitlements` for
on-device verification) and register it:

```ts
import { setPurchaseProvider } from "./src/iap/purchases";
setPurchaseProvider(myStoreKitProvider);
```

Product: `lume.premium.monthly` — $6.99/mo with a 7-day intro free trial.
Everything is gated behind a single `session.isPremium` check.

## Privacy

Photos and scores never leave the device in the free tier. Permissions are
requested just-in-time at the picker; limited-library selection is supported. The
analytics funnel (`src/state/analytics.ts`) records flow milestones only — never
photo data or identifiers. App Privacy nutrition label: **Data Not Collected**
for photos.

## Build & deploy (no EAS — `markmorcos/build-tooling`)

CI builds signed APKs on GitHub-hosted runners via the shared reusable
workflows, publishes a tagged GitHub Release per build, and renders a public QR
dashboard of all releases.

- `.github/workflows/smoke.yml` — typecheck + engine tests on every push/PR.
- `.github/workflows/build-android.yml` — `workflow_dispatch` → builds the APK
  (or AAB), attaches it to a GitHub Release. Inputs: `profile`, `artifact-type`.
- `.github/workflows/build-pages.yml` — `workflow_dispatch` → publishes the
  release dashboard to the `gh-pages` branch. Enable **Settings → Pages →
  `gh-pages` / (root)**; dashboard lives at `https://markmorcos.github.io/lume/`.

```bash
gh workflow run "Build Android" -F profile=production -F artifact-type=apk
gh release list   # the build shows up here; APK is attached
```

LUMÉ has no backend (scoring is 100% on-device), but the shared Android workflow
requires `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` to be
non-empty — they're set to placeholder repo secrets and never read at runtime.
Without an `ANDROID_KEYSTORE_BASE64` secret the APK is debug-signed (fine for
sideload); add the keystore secrets for a release-signed build.

`app.json` carries the bundle id (`dev.markmorcos.lume`), permission strings and
plugin config. **iOS** uses the build-tooling `build-ios.yml`, which is a
skeleton pending Apple signing secrets.

### Release signing

CI release-signs when `ANDROID_KEYSTORE_BASE64` + `ANDROID_KEYSTORE_PASSWORD` +
`ANDROID_KEY_ALIAS` + `ANDROID_KEY_PASSWORD` repo secrets are set. The upload
keystore lives at `~/lume-upload-key/` (back it up — the password is not
recoverable from CI). Bump `android.versionCode` in `app.json` before every new
Play upload.

```bash
gh workflow run "Build Android" -F profile=production -F artifact-type=aab
gh release list   # download the app-release.aab asset, upload to Play
```

## In-app subscriptions (Google Play)

Billing is implemented with **expo-iap** (`src/iap/googlePlay.ts`), plugged into
the `PurchaseProvider` interface and gated behind `session.isPremium`. It is
lazy-loaded; on iOS / Expo Go / sideloaded debug builds it falls back to the
`MockProvider`. **Real purchases only work for an app installed from Play
(internal testing track or higher), release-signed** — not for sideloaded APKs.

Play Console setup (one-time):

1. **Create the app** — Play Console → Create app → "LUMÉ", Free. Package
   `dev.markmorcos.lume` is registered on first AAB upload.
2. **Internal testing release** — Testing → Internal testing → Create release →
   upload `app-release.aab`. Play App Signing is on by default; the generated
   keystore is your *upload* key (Google holds the app-signing key).
3. **App content** — complete Privacy policy URL, Data safety (declare photos
   are processed on-device, **not collected/shared**), Content rating, Target
   audience, Ads = No.
4. **Testers** — Internal testing → Testers → add your Google account(s); also
   add them under Setup → License testing (test purchases, no charge).
5. **Subscription** — Monetize → Products → Subscriptions → Create:
   product ID **`lume.premium.monthly`** (must match `PRODUCT_ID`). Base plan:
   auto-renewing, **P1M**, **$6.99**. Add an **offer** → Free trial → New
   customers → **7 days (P7D)**. Activate base plan, offer, and subscription.
6. **Install from the internal-testing opt-in link** signed in as a tester. The
   paywall's "Start 7-day free trial" then shows the Play sheet with the trial.

## Calibration (pre-GTM, §10 of the brief)

Collect ~30–50 photo batches with human "best pick" labels; measure top-1 and
top-3 agreement; tune `PRESET_WEIGHTS` (`src/state/presets.ts`) and the score
normalisation curves (`curve`/`ramp` in `src/engine/pixels.ts`) to maximise it.
Be willing to drop "good hair day" if it won't calibrate.
