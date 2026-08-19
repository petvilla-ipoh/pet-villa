import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(name, condition) {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(name);
}

const hostPage = read("apps/web/app/host/page.tsx");
const hostI18n = read("apps/web/app/lib/hostI18n.tsx");

expect("Uses native Web Audio", hostPage.includes("new AudioContextClass()"));
expect("Keeps one reusable audio context", hostPage.includes("let hostAlertAudioContext: AudioContext | null = null"));
expect("Unlocks audio after a Host interaction", hostPage.includes('window.addEventListener("pointerdown", unlockAudio, true)'));
expect("Gracefully skips a blocked autonomous alert", hostPage.includes('context.state !== "running") return false'));
expect("Uses a two-tone Ding-Dong", hostPage.includes("frequency: 880") && hostPage.includes("frequency: 659.25"));
expect("Removes the dog-bark oscillator pattern", !hostPage.includes("barkTimes") && !hostPage.includes('oscillator.type = "sawtooth"'));
expect("Keeps the initial-order baseline and duplicate guard", hostPage.includes("knownOrderIdsRef.current") && hostPage.includes("!knownOrderIdsRef.current?.has(order.orderId)"));
expect("Respects the persisted sound preference", hostPage.includes("settingsRef.current.notificationSound"));
expect("Provides the professional English setting copy", hostPage.includes("Play a professional Ding-Dong alert when a new order arrives.") && hostPage.includes("Test Ding-Dong"));
expect("Provides the Chinese setting copy", hostI18n.includes('"Test Ding-Dong": "测试叮咚提示音"') && hostI18n.includes('"Play a professional Ding-Dong alert when a new order arrives.": "新订单到达时播放专业的叮咚提示音。"'));

if (failures.length) {
  console.error(`\nHost Ding-Dong validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nHost Ding-Dong validation passed.");
