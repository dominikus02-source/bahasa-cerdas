#!/usr/bin/env bash
# Smoke emulator Android (CI): pasang APK debug, luncurkan, uji deep link OAuth
# (batal + input berbahaya), periksa proses hidup & buffer crash logcat.
# Tidak memakai kredensial; jaringan/login nyata/izin media TIDAK diklaim.
set -uo pipefail
APK="${1:?apk}"; PKG=com.bahasacerdas.app; OUT="${OUT:-emulator-smoke}"
mkdir -p "$OUT"; fail=0
step() { echo "== $*"; }
alive() { adb shell pidof "$PKG" >/dev/null 2>&1; }
adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb logcat -c || true
step "install"; adb install -r -g "$APK" | tee "$OUT/install.txt" | grep -q Success || { echo "FAIL install"; fail=1; }
step "launch"; adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 25; alive && echo "PASS launch: proses hidup" || { echo "FAIL launch: proses mati"; fail=1; }
adb exec-out screencap -p > "$OUT/01-launch.png" || true
step "deeplink batal"; adb shell am start -W -a android.intent.action.VIEW -d "'bahasacerdas://oauth/callback?flow=login&error=cancelled'" "$PKG" | tee "$OUT/deeplink-cancel.txt"
sleep 10; alive && echo "PASS deeplink batal: proses hidup" || { echo "FAIL deeplink batal"; fail=1; }
adb exec-out screencap -p > "$OUT/02-deeplink-cancel.png" || true
# Ditolak sebelum jaringan (flow tidak sah): tidak ada permintaan ke produksi.
step "deeplink berbahaya"; adb shell am start -W -a android.intent.action.VIEW -d "'bahasacerdas://oauth/callback?flow=evil&next=//evil.example/'" "$PKG" >/dev/null
sleep 6; alive && echo "PASS deeplink berbahaya: tidak crash" || { echo "FAIL deeplink berbahaya"; fail=1; }
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | head -3 | tee "$OUT/resumed.txt"
step "rotasi"; adb shell settings put system accelerometer_rotation 0; adb shell settings put system user_rotation 1; sleep 5
alive && echo "PASS rotasi landscape: tidak crash" || { echo "FAIL rotasi"; fail=1; }
adb exec-out screencap -p > "$OUT/03-landscape.png" || true
adb shell settings put system user_rotation 0
adb logcat -d -b crash > "$OUT/logcat-crash.txt" || true
adb logcat -d > "$OUT/logcat-full.txt" || true
if grep -q "Process: $PKG" "$OUT/logcat-crash.txt"; then echo "FAIL crash buffer memuat $PKG"; fail=1; else echo "PASS crash buffer bersih untuk $PKG"; fi
# Jangan pernah mencetak token/kode: saring baris yang memuat parameter sensitif.
grep -vE "code=|access_token|refresh_token" "$OUT/logcat-full.txt" > "$OUT/logcat.txt"; rm -f "$OUT/logcat-full.txt"
exit $fail
