# Installing PNW Home on a Samsung TV

These steps were run from an Apple Silicon Mac against a 2018 UN65NU8000 (Tizen 4.0). Menu names differ a little between model years. Allow an hour the first time; updates afterwards take a minute.

You need the TV and the computer on the same network, a free [Samsung account](https://account.samsung.com/), Node.js 22+ and Git.

## 1. Developer Mode on the TV

1. Home → **Apps**, press OK to open the panel (highlighting it is not enough).
2. Type **1 2 3 4 5** on the remote. No number keys? Press **123** for the on-screen keypad, or use the SmartThings app's remote.
3. Set **Developer mode** On and enter your computer's IP as **Host PC IP**. Find it with `ipconfig getifaddr en0` on a Mac.
4. Power-cycle the TV (unplug for 15 seconds). The Host PC IP does not take effect until a real reboot.

Check it applied: `curl -s http://<TV_IP>:8001/api/v2/` should show `"developerMode": "1"` and your computer's address in `developerIP`.

## 2. Samsung's Tizen CLI

```sh
curl -fLO https://download.tizen.org/sdk/Installer/tizen-sdk_10.0/web-cli_Tizen_SDK_10.0_macos-64.bin
chmod +x web-cli_Tizen_SDK_10.0_macos-64.bin
./web-cli_Tizen_SDK_10.0_macos-64.bin --show-license       # read it
./web-cli_Tizen_SDK_10.0_macos-64.bin --accept-license ~/tizen-studio
```

About 330 MB, installs to `~/tizen-studio`, no admin password. The binaries are Intel; on Apple Silicon they run under Rosetta 2. Linux and Windows builds exist at the same location.

On macOS `sdb start-server` dies immediately. Run it as a background job instead:

```sh
~/tizen-studio/tools/sdb fork-server server &
```

## 3. Samsung certificate for your TV

A plain Tizen certificate will not install on a Samsung TV. Samsung's open-source certificate tool does it from the command line:

```sh
git clone https://github.com/Samsung/tizen-agent-skills ~/tizen-agent-skills
node ~/tizen-agent-skills/tizen-sdk-skills/common/lib/cli/sdk-init-cli.js ~/tizen-studio
```

Connect and read the TV's device ID:

```sh
export PATH="$HOME/tizen-studio/tools:$HOME/tizen-studio/tools/ide/bin:$PATH"
sdb connect <TV_IP>:26101
sdb -s <TV_IP>:26101 shell 0 getduid
```

Make the certificates (the first command opens a Samsung sign-in in your browser):

```sh
CERTCLI=~/tizen-agent-skills/tizen-sdk-skills/common/lib/cli/cert-manager-cli.js
mkdir -p ~/.tizen-secrets && chmod 700 ~/.tizen-secrets
(umask 077; printf 'TIZEN_CERTIFICATE_PASSWORD=%sAa1\n' "$(openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | cut -c1-20)" > ~/.tizen-secrets/cert-password.env)

node "$CERTCLI" generate-samsung-author --profile-name PnwHome --identity "Your Name" --country US --password-file ~/.tizen-secrets/cert-password.env
node "$CERTCLI" generate-samsung-distributor --profile-name PnwHome --duid-list "<DUID>" --privilege Public --password-file ~/.tizen-secrets/cert-password.env
```

Register them as the active signing profile:

```sh
CERT_DIR=~/tizen-studio-data/keystore/samsung/PnwHome
cp ~/tizen-agent-skills/tizen-sdk-skills/common/assets/samsung-tv-ca/vd_tizen_dev_public2.crt "$CERT_DIR/"
PW="$(sed -n 's/^TIZEN_CERTIFICATE_PASSWORD=//p' ~/.tizen-secrets/cert-password.env)"
tizen security-profiles add -n PnwHome -A -a "$CERT_DIR/author.p12" -p "$PW" -d "$CERT_DIR/distributor.p12" -dp "$PW" -dc "$CERT_DIR/vd_tizen_dev_public2.crt"
unset PW
tizen cli-config "profiles.path=$HOME/tizen-studio-data/profile/profiles.xml"
```

**Back up `author.p12` and the password file.** Every later update must be signed with the same author certificate. The certificates are valid for one year.

## 4. Build and install

```sh
cp scripts/tizen-env.example.sh scripts/tizen-env.sh    # fill in TV_IP, PROFILE, DUID
. scripts/tizen-env.sh
scripts/build.sh && scripts/install.sh
```

`install.sh` runs `tizen install-permit` each time, which copies a small permission file to the TV, then installs and launches the app.

## 5. Make it the start screen

1. **Apps → App Settings → PNW Home → Add to Home**; move it to the front of the row.
2. **Settings → General → Smart Features**: **Autorun Smart Hub** off, **Autorun Last App** on.
3. Open PNW Home, power the TV off and on. It should start in PNW Home.

## 6. Developer Mode off

Same 1 2 3 4 5 dialog, Developer mode **Off**, OK, restart. The app keeps working. It leaves a debug port open on your network and can interfere with DRM playback, so turn it back on only to install an update.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `sdb connect` fails; port accepts then drops | Host PC IP not set or TV not rebooted | Redo step 1 and power-cycle |
| `install failed[118019]` | Package ID is not exactly 10 characters | Keep `package="PnwHome001"` (or any 10-char alphanumeric ID) |
| Certificate or device ID rejected | DUID in the distributor certificate does not match the TV | `sdb shell 0 getduid` and regenerate the distributor certificate |
| Headings render in Arial on the TV | Web fonts did not load | The TV needs internet access to use.typekit.net and fonts.googleapis.com |
| App disappeared after a TV software update | Large Tizen upgrades can remove sideloaded apps | Reinstall with step 4 |

## Removing

**Apps → App Settings → PNW Home → Delete.** Turn Autorun Last App off if you like. To remove the tooling from the Mac: delete `~/tizen-studio`, `~/tizen-studio-data`, `~/.package-manager`, `~/.tizen`, `~/.tizen.sdk.path.config`, `~/tizen-agent-skills` and `~/.tizen-secrets`, plus the two `certificate-manager` items in your login Keychain.
