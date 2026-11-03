/** Gate 1 component test: real Chrome MediaRecorder + IndexedDB, fake room transport.
 * Does NOT certify login, server authorization, full meeting UI, or physical devices.
 * node scripts/e2e/jumpa-recording-gate.cjs
 * JUMPA_QA_SCENARIOS=close,reload,... JUMPA_QA_DIR=<artifacts>
 * JUMPA_QA_MUTATE_NO_TIMESLICE=1 must fail recovery after close/crash/kill.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const cp = require('node:child_process');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const scenarios = (process.env.JUMPA_QA_SCENARIOS || 'close,reload,end,offline,quota,crash,kill').split(',');
// Locked before execution. Graceful loss is never permitted: 150ms is the
// fixed encoder/frame scheduling allowance for this synthetic 15fps source.
// Also require an emitted final chunk + completed checkpoint for graceful exit.
const policy = { repeats: 3, timesliceMs: 5000, recordMs: 6400, frameAllowanceMs: 150, maxCrashLossMs: 7000 };
const artifacts = process.env.JUMPA_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'jumpa-gate-'));
fs.mkdirSync(artifacts, { recursive: true });
const mutation = process.env.JUMPA_QA_MUTATE_NO_TIMESLICE === '1';
async function killProfile(profile) {
  if (process.platform === 'win32') {
    const escaped = profile.replaceAll("'", "''");
    const pids = cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -like '*${escaped}*' -and $_.CommandLine -notlike '*--type=*' } | Select-Object -ExpandProperty ProcessId`], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
    if (!pids.length) throw Error('NO_ISOLATED_CHROME_PID');
    for (const pid of pids) { const result = cp.spawnSync('taskkill', ['/PID', pid, '/T', '/F']); if (result.status) throw Error('TASKKILL_FAILED'); }
  } else {
    const rows = cp.execFileSync('ps', ['-eo', 'pid,args'], { encoding: 'utf8' }).split('\n');
    const row = rows.find(row => row.includes('--user-data-dir=' + profile) && !row.includes('--type='));
    if (!row) throw Error('NO_ISOLATED_CHROME_PID');
    process.kill(Number(row.trim().split(/\s+/)[0]), 'SIGKILL');
  }
}
(async () => {
  const entry = 'export {startLocalRecording} from "./components/jumpa/local-recording"; export * from "./components/jumpa/recording-checkpoint";';
  const js = (await esbuild.build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'browser' })).outputFiles[0].text;
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/module.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/module.js' ? js : '<!doctype html><html lang="id"><title>JUMPA QA</title><body>Uji rekaman</body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const launch = profile => chromium.launchPersistentContext(profile, { channel: process.env.CHROME ? undefined : 'chrome', executablePath: process.env.CHROME || undefined, headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'] });
  const results = [];
  try {
    for (const scenario of scenarios) for (let repeat = 1; repeat <= policy.repeats; repeat++) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jumpa-gate-profile-'));
      let context;
      const result = { scenario, repeat, ok: false };
      try {
        context = await launch(profile);
        let page = context.pages()[0] || await context.newPage();
        await page.goto(url);
        await page.evaluate(async ({ mutation }) => {
          const mod = await import('/module.js');
          if (mutation) { const nativeStart = MediaRecorder.prototype.start; MediaRecorder.prototype.start = function () { return nativeStart.call(this); }; }
          const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
          const g = canvas.getContext('2d'); let frame = 0;
          const paint = () => { g.fillStyle = frame++ % 2 ? 'red' : 'blue'; g.fillRect(0, 0, 320, 180); };
          paint(); window.__paint = setInterval(paint, 1000 / 15);
          navigator.mediaDevices.getDisplayMedia = async () => canvas.captureStream(15);
          const room = { localParticipant: { identity: "qa-recorder", audioTrackPublications: new Map() }, remoteParticipants: new Map(), on() {}, off() {} };
          window.__events = []; window.__start = performance.now();
          window.__session = await mod.startLocalRecording(room, new AbortController().signal, {
            onComplete: blob => { window.__blob = blob; window.__events.push('complete'); },
            onError: () => window.__events.push('error'), onLimit: () => window.__events.push('limit'), onStorageLow: () => window.__events.push('limit'),
            onStopped: () => { window.__elapsed = performance.now() - window.__start; window.__events.push('stopped'); },
          });
          window.__ready = performance.now();
        }, { mutation });
        if (scenario === 'offline') { await context.setOffline(true); await page.waitForTimeout(1800); await context.setOffline(false); }
        await page.waitForTimeout(scenario === 'offline' ? policy.recordMs - 1800 : policy.recordMs);
        let expectedMs = await page.evaluate(() => performance.now() - window.__ready);
        if (scenario === 'close') { await page.close(); page = await context.newPage(); }
        else if (scenario === 'reload') await page.reload();
        else if (scenario === 'crash') { const cdp = await context.newCDPSession(page); await Promise.race([cdp.send('Page.crash').catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]); await page.close().catch(() => {}); page = await context.newPage(); }
        else if (scenario === 'kill') { await killProfile(profile); context = null; await new Promise(resolve => setTimeout(resolve, 1000)); context = await launch(profile); page = context.pages()[0] || await context.newPage(); }
        else {
          if (scenario === 'quota') {
            const cdp = await context.newCDPSession(page);
            await cdp.send('Storage.overrideQuotaForOrigin', { origin: url, quotaSize: 33 * 1024 * 1024 });
          } else await page.evaluate(() => window.__session.stop());
          await page.waitForFunction(() => window.__events.includes('stopped'), null, { timeout: 10000 });
          result.events = await page.evaluate(() => window.__events);
          expectedMs = await page.evaluate(() => window.__elapsed);
          if (scenario === 'quota' && !result.events.includes('limit')) throw Error('QUOTA_DID_NOT_STOP');
          await page.reload();
        }
        await page.goto(url);
        const recovered = await page.evaluate(async () => {
          const mod = await import('/module.js'); const sessions = await mod.listRecordingCheckpoints();
          const session = sessions.filter(s => !s.groupId).sort((a, b) => b.createdAt - a.createdAt)[0];
          if (!session) throw Error('NO_SESSION');
          const blob = await mod.restoreRecordingCheckpoint(session.id);
          return { session, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
        });
        const file = path.join(artifacts, `${scenario}-${repeat}.webm`);
        fs.writeFileSync(file, Buffer.from(recovered.bytes));
        const probeRun = cp.spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:packet=pts_time,duration_time', '-of', 'json', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
        const probe = JSON.parse(probeRun.stdout);
        result.ffprobeErrors = probeRun.stderr.trim();
        const probeValid = probeRun.status === 0 && !result.ffprobeErrors;
        const durationMs = Number(probe.format.duration) * 1000;
        const packetEndMs = Math.max(...(probe.packets || []).map(p => (Number(p.pts_time) + Number(p.duration_time || 0)) * 1000));
        const hard = scenario === 'crash' || scenario === 'kill';
        Object.assign(result, { expectedMs, durationMs: Number.isFinite(durationMs) ? durationMs : null, packetEndMs, lossMs: expectedMs - packetEndMs, bytes: recovered.bytes.length, checkpoint: recovered.session, file });
        const durationValid = Number.isFinite(durationMs) && durationMs > 0 && durationMs <= expectedMs + 500;
        const tailValid = hard ? expectedMs - packetEndMs <= policy.maxCrashLossMs && packetEndMs >= 4800 : recovered.session.completed && expectedMs - packetEndMs <= policy.frameAllowanceMs;
        result.ok = probeValid && durationValid && tailValid && recovered.bytes.length > 0;
        if (!result.ok) result.reason = !probeValid ? 'FFPROBE_DECODE_ERROR' : !durationValid ? 'FFPROBE_DURATION_INVALID' : 'GRACEFUL_TAIL_OR_FINAL_COMMIT_MISSING';
      } catch (error) { result.error = String(error); if (context) result.diagnostic = await context.pages()[0]?.evaluate(async () => ({ events: window.__events, storage: await navigator.storage.estimate() })).catch(() => null); }
      finally { if (context) await context.close().catch(() => {}); fs.rmSync(profile, { recursive: true, force: true }); }
      results.push(result); console.log(JSON.stringify(result));
      fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ scope: 'real recorder, mocked room transport', policy, mutation, results }, null, 2));
    }
  } finally { server.close(); }
  const failures = results.filter(r => !r.ok).length;
  console.log(JSON.stringify({ artifacts, failures, total: results.length }));
  process.exitCode = failures ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
