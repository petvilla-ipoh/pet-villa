import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const hostPage = fs.readFileSync("apps/web/app/host/page.tsx", "utf8");
const reviews = fs.readFileSync("apps/web/app/lib/reviews.ts", "utf8");
const diary = fs.readFileSync("apps/web/app/lib/diaryUpdates.ts", "utf8");
const legacyImagePath = "apps/web/public/reviews/legacy-5e5b5e66-6454-4238-b81c-b00a5366aa65-f8a0444a45e055bb.png";

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

const globalSyncStart = hostPage.indexOf("const sync = async (background = false, allowAutomations = false)");
const globalSyncEnd = hostPage.indexOf("useEffect(() => {", globalSyncStart + 1);
const globalSync = hostPage.slice(globalSyncStart, globalSyncEnd);

check("Host global sync exists", globalSyncStart >= 0 && globalSyncEnd > globalSyncStart);
check("Reviews are absent from the 12-second global sync", !globalSync.includes("loadPublicReviews"));
check("Diary rows are absent from the 12-second global sync", !globalSync.includes("loadPetDiaryUpdatesForHost"));
check("Diary configuration is absent from the 12-second global sync", !globalSync.includes("checkPrivateDiaryConfiguration"));
check("Review refresh is workspace-scoped", hostPage.includes('activeWorkspace !== "reviews"') && hostPage.includes('hasStaffPermission(staffPermissions, "reviews.view")'));
check("Diary refresh is workspace-scoped", hostPage.includes('activeWorkspace !== "diary"') && hostPage.includes('hasStaffPermission(staffPermissions, "diary.view")'));
check("Targeted refresh uses a five-minute interval", (hostPage.match(/5 \* 60_000/g) || []).length >= 2);
check("Hidden Diary workspace is not mounted", hostPage.includes('{activeWorkspace === "diary" ? <section id="gallery"') && !hostPage.includes('id="gallery" className={activeWorkspace === "diary"'));
check("Signed Diary URLs are cached by storage path", diary.includes("signedMediaUrlCache.get(item.path)") && diary.includes("signedMediaUrlCache.set(item.path"));
check("Signed Diary URLs have an expiry refresh buffer", diary.includes("signedUrlRefreshBufferMs") && diary.includes("cached.expiresAt - Date.now()"));
check("Signed URL failures do not become empty media URLs", diary.includes("if (error || !data?.signedUrl) throw"));
check("Production Diary entries are not persisted to localStorage", diary.includes("if (allowDevelopmentFallback) window.localStorage.setItem(localKey"));
check("Review payload omits the duplicate photo", reviews.includes("delete reviewPayload.photo") && reviews.includes("review_payload: reviewPayload"));
check("New data-image URLs are blocked from Review rows", reviews.includes('review.photo?.startsWith("data:") ? null'));
check("Production Review query failures do not become an empty list", reviews.includes('throw new Error("Reviews could not be refreshed.")'));
check("Legacy Review image exact copy exists", fs.existsSync(legacyImagePath));

const image = fs.readFileSync(legacyImagePath);
check("Legacy Review image is a valid PNG", image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
check("Legacy Review image hash matches migration evidence", crypto.createHash("sha256").update(image).digest("hex") === "f8a0444a45e055bbccac4e49d84a7e07fee37497dfdb47652a3037d06069fa9f");

console.log(`Egress regression checks passed: ${checks.length}/${checks.length}`);
for (const name of checks) console.log(`PASS ${name}`);
