# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-15

### 🔧 Fixed
- **CRITICAL: Fixed socket.io frame format** - Commands were not being sent to thermostats due to incorrect frame format (`'421'` → `'42'`). This resolves [Issue #3](https://github.com/kitradrago/homebridge-sensi/issues/3) where HomeKit controls were not working for Sensi Lite thermostats.
- Fixed device deduplication logic - `seenDevices` Set was being recreated per update, causing duplicate device registration. Now maintained at platform level.
- Fixed WebSocket connection cleanup - Old connections were not explicitly closed during reconnection, causing potential memory leaks.
- Fixed authentication response validation - Added checks for missing or malformed `access_token` in OAuth responses.

### ✨ Added
- Enhanced error handling throughout API and accessory classes with try-catch blocks and detailed error logging.
- Improved logging with device context (IDs, names) for better debugging and issue diagnosis.
- WebSocket cleanup method (`closeWebSocket()`) for explicit connection management.
- Validation for device updates with `icd_id` checks before registration.
- Better error context in log messages using Error object inspection.

### 📚 Changed
- Refactored device update handling in `platform.ts` into dedicated `handleDeviceUpdate()` method for clarity.
- Improved temperature and mode change logging with full context (device ID, values, scales).
- Updated error messages to provide more actionable debugging information.
- Documentation improvements in README with better formatting and clarity.

### 🐛 Fixed (Documentation)
- Fixed typo in README: "tempeårature" → "temperature"
- Fixed grammar in config.schema.json: "obtained Emerson Sensi" → "obtained from Emerson Sensi"

---

## [1.1.4] - 2026-02-02

### 🔧 Fixed
- Various minor stability improvements

---

## [1.1.0] - 2026-02-01

### ✨ Added
- Added publish.yml for NPMjs publishing
- Debug logging of incoming device state for diagnostics

### 🐛 Fixed
- Prevent "characteristic value expected valid finite number" warnings by validating temperature values
- Validate TargetTemperature values from HomeKit before sending to device
- Restore and implement `mapHapMode()` helper function
- Added guards on sensor accessory for temperature and humidity validation

### 📚 Changed
- Improved temperature conversion and validation logic
- Enhanced logging to aid diagnosing mode mismatches

---

## [1.0.0] - 2025-12-07

### ✨ Initial Release
- Implements official Sensi WebSocket API
- Real-time thermostat and sensor updates
- Automatic WebSocket reconnect with keep-alive pings
- Full HomeKit integration via Homebridge
- Temperature mode control (heat, cool, auto, off)
- Temperature and humidity sensor support
- Proper Celsius/Fahrenheit conversion for HomeKit compatibility
- Simple configuration with refresh token only