
# Homebridge Sensi

[![npm version](https://badge.fury.io/js/homebridge-sensi.svg)](https://badge.fury.io/js/homebridge-sensi)
[![homebridge verified](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

A Homebridge plugin for Emerson Sensi thermostats using the official WebSocket API.  
Provides real‑time updates, automatic reconnect, and full HomeKit integration.

**Current Version:** v1.2.0

Created because I wanted a plugin for homebridge. I referenced the work of the 
HomeAssistant Sensi plugin made by @iprak (https://github.com/iprak/sensi) for parts of
the API Code.

---

## ✨ Features
- Real‑time thermostat and sensor updates via WebSocket
- Automatic reconnect and keep‑alive pings
- Control temperature, mode, fan, and circulating fan
- Proper Celsius conversion for HomeKit compatibility
- Simple configuration: only requires a refresh token
- Comprehensive error handling and logging

---

## 📦 Installation

1. Clone or download this repository.

2. From the plugin root, run:
   ```bash
   npm install
   npm run build
   npm install -g .
   ```

3. Restart Homebridge.

### Updating from Previous Versions

If you're updating from **v1.1.4 or earlier**, this version includes critical fixes for HomeKit control functionality:

```bash
cd /path/to/homebridge-sensi
npm install
npm run build
sudo systemctl restart homebridge
```

See [CHANGELOG.md](CHANGELOG.md) for detailed upgrade information.

---

## ⚙️ Configuration

Use the Homebridge Config UI — you'll see a single field for the Sensi Refresh Token.

If you are unable to configure via the UI for any reason, then:

Add the following to your Homebridge config.json:

```json
{
  "platforms": [
    {
      "platform": "SensiPlatform",
      "refreshToken": "YOUR_REFRESH_TOKEN"
    }
  ]
}
```

---

## 🔑 Obtaining the Refresh Token

You need to capture the refresh_token from the Sensi web app (https://manager.sensicomfort.com). This requires opening Developer Tools in your browser and watching the network requests.

### Safari

1. Open Safari and go to Preferences → Advanced
2. Enable "Show Develop menu in menu bar"
3. Log in to manager.sensicomfort.com
4. In the Develop menu, choose Show Web Inspector
5. Go to the Storage Tab
6. Look for the refresh token under Session Storage
7. Copy the token value and paste into the plugin config

### Chrome

1. Open Chrome and log in to manager.sensicomfort.com
2. Press F12 or Cmd+Option+I (Mac) to open Developer Tools
3. Go to the Network tab
4. Reload the page if necessary
5. Find the request to https://oauth.sensiapi.io/token
6. Click it, then check the Response panel
7. Copy the refresh_token value

### Edge

1. Open Edge and log in to manager.sensicomfort.com
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Reload the page if necessary
5. Find the request to https://oauth.sensiapi.io/token
6. Click it, then check the Response panel
7. Copy the refresh_token value

⚠️ **Important**: The refresh token is long and case‑sensitive. Paste it exactly into your Homebridge config.

---

## 🐛 Troubleshooting

### Controls not working in HomeKit?
- Check the Homebridge logs for any `[Sensi]` error messages
- Verify your refresh token is correct and valid
- Try restarting Homebridge after updating to v1.2.0
- Enable debug logging: `homebridge -D` to see detailed command logs

### Device not appearing in HomeKit?
- Ensure the device is online in the Sensi app
- Check that the refresh token is still valid
- Look for `Registered device` messages in the logs

### WebSocket disconnecting frequently?
- Check your network connection stability
- Verify that firewalls aren't blocking WebSocket connections to `wss://rt.sensiapi.io`
- This is normal behavior; the plugin automatically reconnects

---

## 📚 Development

Source code is in src/.
Run `npm run build` to compile to dist/.
Entry point is src/index.ts.

I welcome suggestions, improvements, and people interested in helping to maintain this plugin. Especially since chances are my ADHD will forget this even exists until mine stops working.

Thanks for downloading it!

Kitra Drago
