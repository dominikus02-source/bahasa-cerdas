/**
 * One-time OAuth 2.0 authorization for Google Drive access.
 *
 * Run: npx tsx scripts/drive-auth.ts
 *
 * This will:
 * 1. Open browser to Google OAuth consent screen
 * 2. You authorize → redirects to localhost
 * 3. Saves token.json for subsequent scanner runs
 *
 * Only needs to be run once (token auto-refreshes after).
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as url from "url";

const CREDENTIALS_PATH = path.resolve(
  process.env.GOOGLE_OAUTH_CLIENT_PATH || "credentials/google-oauth-client.json"
);
const TOKEN_PATH = path.resolve("credentials/google-oauth-token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const REDIRECT_PORT = 80;

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`❌ Credentials not found at ${CREDENTIALS_PATH}`);
    console.error("   Download from Google Cloud Console → APIs & Services → Credentials");
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${REDIRECT_PORT}`
  );

  // Check for existing valid token
  if (fs.existsSync(TOKEN_PATH)) {
    const existingToken = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(existingToken);

    // Test if token is still valid
    try {
      const drive = google.drive({ version: "v3", auth: oAuth2Client });
      await drive.files.list({ pageSize: 1 });
      console.log("✅ Existing token is valid. No re-auth needed.");
      console.log(`   Token: ${TOKEN_PATH}`);
      return;
    } catch {
      console.log("⚠️  Existing token expired. Re-authorizing...");
    }
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n🔑 Google Drive OAuth Authorization");
  console.log("━".repeat(50));
  console.log("\nOpening browser for authorization...\n");
  console.log(`If browser doesn't open, visit:\n${authUrl}\n`);

  // Try to open browser
  const { exec } = await import("child_process");
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? `open "${authUrl}"` :
    platform === "win32" ? `start "${authUrl}"` :
    `xdg-open "${authUrl}"`;
  exec(cmd, () => {});

  // Start local server to catch redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || "", true);
      const code = parsedUrl.query.code as string;

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html><body style="font-family:system-ui;text-align:center;padding:60px">
            <h2>✅ Authorization successful!</h2>
            <p>You can close this tab and return to the terminal.</p>
          </body></html>
        `);
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end("Missing code parameter");
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`⏳ Waiting for authorization on port ${REDIRECT_PORT}...`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timed out (5 min)"));
    }, 300_000);
  });

  // Exchange code for tokens
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Save token
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log(`\n✅ Token saved to ${TOKEN_PATH}`);
  console.log("   This token auto-refreshes. You won't need to re-authorize.\n");

  // Verify access
  const drive = google.drive({ version: "v3", auth: oAuth2Client });
  const res = await drive.about.get({ fields: "user" });
  console.log(`   Authenticated as: ${res.data.user?.displayName} (${res.data.user?.emailAddress})`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
