# NetGram APK build and install

## Important
The APK is an Android WebView client, not a self-hosted Node.js/SQLite server. A NetGram backend must run on a PC/server reachable from the phone. The APK asks for the server URL on first launch, for example `http://192.168.1.10:3000`. A Codespaces address is not a permanent local LAN server.

## Build with GitHub Actions (phone-friendly)
1. Upload/commit the whole project to your GitHub repository, including `android/` and `.github/workflows/build-apk.yml`.
2. Open the repository on GitHub and tap **Actions**.
3. Select **Build NetGram APK**.
4. Tap **Run workflow** and confirm.
5. Wait for the run to finish successfully.
6. Open that run, find **Artifacts**, and download **NetGram-debug-apk**.
7. Extract the downloaded ZIP; install `app-debug.apk` on Android. If prompted, allow installs from the browser or file manager.

## Build in Codespaces terminal
With Java 17 and Android SDK configured:
```bash
cd /workspaces/abdullahghafory/android
gradle --no-daemon assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Run the server on a PC
1. Install Node.js 20+.
2. In project root run `npm ci`.
3. Build frontend: `cd client && npm ci && npm run build && cd ..`.
4. Copy `.env.example` to `.env` and set `JWT_SECRET` to a unique random secret of 32+ characters.
5. Run `npm start`.
6. Permit inbound TCP port 3000 in the PC firewall on private networks.
7. Connect the phone to the same Wi-Fi/hotspot and enter `http://PC_LAN_IP:3000` in NetGram.

Do not expose the HTTP server publicly. HTTP is unencrypted; use HTTPS on untrusted networks. This debug APK is for testing, not a Play Store release.
