# Android (Google Play) submission — LUMÉ

Stepwise playbook. Copy lives in `assets/store/listing.md`; visual assets in
`assets/store/`. Prerequisite: a release-signed `.aab` (produced by the
`Build Android` workflow with `artifact-type: aab`).

## 1. Create the Play Console app record
1. Play Console → All apps → **Create app**.
2. App name `LUMÉ`, default language English (US), App, Free. Accept the policy
   declarations.

## 2. Internal testing release
1. Testing → **Internal testing** → **Create release**.
2. Upload `app-release.aab` (download from the GitHub Release the build created).
   Play App Signing is on by default — the CI keystore is your *upload* key.
3. Add testers (an email list) and share the opt-in link; also add the same
   emails under **Setup → License testing** so test purchases aren't charged.

## 3. Store listing (Grow → Store presence → Main store listing)
- **App name:** `LUMÉ — best shot picker`
- **Short description / Full description:** from `assets/store/listing.md` §1–§2.
- **App icon:** `assets/store/icon-512.png`
- **Feature graphic:** `assets/store/play-feature-graphic.png`
- **Phone screenshots:** `assets/store/screenshots/play/en/0{1..4}-*.png`
- **7" tablet:** `assets/store/screenshots/play/en/tablet-7/*`
- **10" tablet:** `assets/store/screenshots/play/en/tablet-10/*`

## 4. App content (Policy → App content)
- **Privacy policy:** `https://markmorcos.github.io/lume/privacy.html`
- **Data safety:** No data collected, no data shared (photos processed
  on-device; subscription handled by Google Play). No third-party SDKs.
- **Content rating:** complete the questionnaire → Everyone.
- **Target audience:** 13+. **Ads:** No. **News app:** No.
- **Government app / financial / health:** No.

## 5. Subscription product (Monetize → Products → Subscriptions)
1. **Create subscription** → product ID **`lume.premium.monthly`** (must match
   `PRODUCT_ID` in `src/iap/purchases.ts`).
2. **Base plan:** auto-renewing, billing period **P1M**, price **$6.99** (set
   per-currency as needed). Activate.
3. **Offer** on the base plan → **Free trial** → eligibility *New customers* →
   free phase **7 days (P7D)**. Activate.
4. Activate the subscription.

## 6. Pricing & distribution
- Free app, with in-app purchases. Select countries. Accept content guidelines +
  US export laws.

## 7. Test billing
Install via the internal-testing opt-in link signed in as a license tester. The
paywall's **Start 7-day free trial** should fetch the product and show the Play
sheet with the trial. Verify purchase unlocks premium and **Restore** works.

## 8. Roll out
Promote the internal testing release (or create a Production release) → submit
for review. First review is typically 1–3 days.

## Notes
- Bump `android.versionCode` in `app.json` before each new upload.
- Outstanding `<TBD>`: support email and developer/publisher entity (Play
  requires both); update `assets/store/listing.md` and `dashboard/privacy.html`.
