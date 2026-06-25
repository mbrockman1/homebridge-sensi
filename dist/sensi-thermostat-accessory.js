"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensiThermostatAccessory = void 0;
class SensiThermostatAccessory {
    constructor(log, accessory, api, hap) {
        this.log = log;
        this.accessory = accessory;
        this.api = api;
        this.hap = hap;
        this.service =
            this.accessory.getService(this.hap.Service.Thermostat) ||
                this.accessory.addService(this.hap.Service.Thermostat);

        /* Listen for updates from the Sensi API */
        this.api.onDeviceUpdate((dev) => {
            if (dev.icd_id.toLowerCase() === this.accessory.context.deviceId) {
                this.updateFromState(dev);
            }
        });

        /* Target temperature set from HomeKit (Heat or Cool mode) */
        this.service
            .getCharacteristic(this.hap.Characteristic.TargetTemperature)
            .onSet(async (value) => {
            const tempC = Number(value);
            if (!Number.isFinite(tempC)) {
                this.log.warn('Invalid TargetTemperature from HomeKit:', value);
                return;
            }
            const devId = this.accessory.context.deviceId;
            const state = this.accessory.context.lastState;
            const scale = state?.state?.display_scale ?? 'f';
            const mode = state?.state?.operating_mode ?? 'heat';
            let tempToSend;
            if (scale === 'f') {
                tempToSend = Math.round(tempC * 9 / 5 + 32);
            }
            else {
                tempToSend = tempC;
            }
            this.log.debug('Setting temperature', { devId, tempToSend, mode, scale });
            this.api.setTemperature(devId, tempToSend, mode, scale);
        });

        /* Heating threshold — lower bound in Auto mode */
        this.service
            .addCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature)
            .onSet(async (value) => {
            const tempC = Number(value);
            if (!Number.isFinite(tempC)) {
                this.log.warn('Invalid HeatingThresholdTemperature from HomeKit:', value);
                return;
            }
            const devId = this.accessory.context.deviceId;
            const state = this.accessory.context.lastState;
            const scale = state?.state?.display_scale ?? 'f';
            let tempToSend;
            if (scale === 'f') {
                tempToSend = Math.round(tempC * 9 / 5 + 32);
            }
            else {
                tempToSend = tempC;
            }
            this.log.debug('Setting heating threshold (auto)', { devId, tempToSend, scale });
            this.api.setTemperature(devId, tempToSend, 'heat', scale);
        });

        /* Cooling threshold — upper bound in Auto mode */
        this.service
            .addCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature)
            .onSet(async (value) => {
            const tempC = Number(value);
            if (!Number.isFinite(tempC)) {
                this.log.warn('Invalid CoolingThresholdTemperature from HomeKit:', value);
                return;
            }
            const devId = this.accessory.context.deviceId;
            const state = this.accessory.context.lastState;
            const scale = state?.state?.display_scale ?? 'f';
            let tempToSend;
            if (scale === 'f') {
                tempToSend = Math.round(tempC * 9 / 5 + 32);
            }
            else {
                tempToSend = tempC;
            }
            this.log.debug('Setting cooling threshold (auto)', { devId, tempToSend, scale });
            this.api.setTemperature(devId, tempToSend, 'cool', scale);
        });

        /* Heating/cooling mode set from HomeKit */
        this.service
            .getCharacteristic(this.hap.Characteristic.TargetHeatingCoolingState)
            .onSet(async (value) => {
            const devId = this.accessory.context.deviceId;
            const mode = this.mapHapMode(Number(value));
            this.api.setMode(devId, mode);
        });
    }

    /** Update HomeKit characteristics from a device state packet */
    updateFromState(dev) {
        this.accessory.context.lastState = dev;
        const s = dev.state;
        if (!s)
            return;
        this.log.debug('Device state update', { id: dev.icd_id, state: s });
        const scale = s.display_scale ?? 'f';

        // Current temperature
        if (s.display_temp !== undefined && Number.isFinite(s.display_temp)) {
            const currentTempC = scale === 'f' ? (s.display_temp - 32) * 5 / 9 : s.display_temp;
            this.service.updateCharacteristic(this.hap.Characteristic.CurrentTemperature, currentTempC);
        }

        // HVAC mode — determine first so we know how to handle temps
        const hvacMode = s.operating_mode;
        this.service.updateCharacteristic(this.hap.Characteristic.CurrentHeatingCoolingState, this.mapApiModeCurrent(hvacMode));
        this.service.updateCharacteristic(this.hap.Characteristic.TargetHeatingCoolingState, this.mapApiModeTarget(hvacMode));

        if (hvacMode === 'auto') {
            // AUTO MODE — set both thresholds independently
            if (s.current_heat_temp !== undefined && Number.isFinite(s.current_heat_temp)) {
                const heatThresholdC = scale === 'f' ? (s.current_heat_temp - 32) * 5 / 9 : s.current_heat_temp;
                this.service.updateCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature, heatThresholdC);
                // Keep TargetTemperature in sync as fallback
                this.service.updateCharacteristic(this.hap.Characteristic.TargetTemperature, heatThresholdC);
            }
            if (s.current_cool_temp !== undefined && Number.isFinite(s.current_cool_temp)) {
                const coolThresholdC = scale === 'f' ? (s.current_cool_temp - 32) * 5 / 9 : s.current_cool_temp;
                this.service.updateCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature, coolThresholdC);
            }
        } else {
            // HEAT or COOL mode — single target temperature
            const targetTempF = hvacMode === 'heat' ? s.current_heat_temp : s.current_cool_temp;
            if (targetTempF !== undefined && Number.isFinite(targetTempF)) {
                const targetTempC = scale === 'f' ? (targetTempF - 32) * 5 / 9 : targetTempF;
                this.service.updateCharacteristic(this.hap.Characteristic.TargetTemperature, targetTempC);
                if (hvacMode === 'heat') {
                    this.service.updateCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature, targetTempC);
                } else {
                    this.service.updateCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature, targetTempC);
                }
            }
        }
    }

    /** Map API mode string to HomeKit CurrentHeatingCoolingState */
    mapApiModeCurrent(mode) {
        switch (mode) {
            case 'heat':
                return this.hap.Characteristic.CurrentHeatingCoolingState.HEAT;
            case 'cool':
                return this.hap.Characteristic.CurrentHeatingCoolingState.COOL;
            case 'off':
            default:
                return this.hap.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }

    /** Map API mode string to HomeKit TargetHeatingCoolingState */
    mapApiModeTarget(mode) {
        switch (mode) {
            case 'heat':
                return this.hap.Characteristic.TargetHeatingCoolingState.HEAT;
            case 'cool':
                return this.hap.Characteristic.TargetHeatingCoolingState.COOL;
            case 'auto':
                return this.hap.Characteristic.TargetHeatingCoolingState.AUTO;
            case 'off':
            default:
                return this.hap.Characteristic.TargetHeatingCoolingState.OFF;
        }
    }

    /** Convert HomeKit TargetHeatingCoolingState number to API mode string */
    mapHapMode(value) {
        switch (value) {
            case this.hap.Characteristic.TargetHeatingCoolingState.HEAT:
                return 'heat';
            case this.hap.Characteristic.TargetHeatingCoolingState.COOL:
                return 'cool';
            case this.hap.Characteristic.TargetHeatingCoolingState.AUTO:
                return 'auto';
            case this.hap.Characteristic.TargetHeatingCoolingState.OFF:
            default:
                return 'off';
        }
    }
}
exports.SensiThermostatAccessory = SensiThermostatAccessory;
