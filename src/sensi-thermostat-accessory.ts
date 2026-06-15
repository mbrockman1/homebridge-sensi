import {
  Logging,
  PlatformAccessory,
  Service,
  API,
  CharacteristicValue,
} from 'homebridge';
import { SensiAPI, DeviceStatePacket } from './sensi-api';

export class SensiThermostatAccessory {
  private service: Service;

  constructor(
    private readonly log: Logging,
    private readonly accessory: PlatformAccessory,
    private readonly api: SensiAPI,
    private readonly hap: API['hap']
  ) {
    this.service =
      this.accessory.getService(this.hap.Service.Thermostat) ||
      this.accessory.addService(this.hap.Service.Thermostat);

    /* Listen for updates from the Sensi API */
    this.api.onDeviceUpdate((dev: DeviceStatePacket) => {
      if (dev.icd_id.toLowerCase() === this.accessory.context.deviceId) {
        this.updateFromState(dev);
      }
    });

    /* Target temperature set from HomeKit */
    this.service
      .getCharacteristic(this.hap.Characteristic.TargetTemperature)
      .onSet(async (value: CharacteristicValue) => {
        try {
          const tempC = Number(value); // HomeKit supplies Celsius
          if (!Number.isFinite(tempC)) {
            this.log.warn('[Sensi] Invalid TargetTemperature from HomeKit:', value);
            return;
          }

          const devId = this.accessory.context.deviceId;
          const state = this.accessory.context.lastState;
          const scale = state?.state?.display_scale ?? 'f';
          const mode = state?.state?.operating_mode ?? 'auto';

          // Convert to Fahrenheit only if the device expects it.
          // Round because the Sensi API requires integer Fahrenheit values.
          let tempToSend: number;
          if (scale === 'f') {
            tempToSend = Math.round(tempC * 9 / 5 + 32);
          } else {
            tempToSend = tempC;
          }

          this.log.info('[Sensi] Setting temperature', {
            deviceId: devId,
            tempToSend,
            mode,
            scale,
          });
          this.api.setTemperature(devId, tempToSend, mode, scale);
        } catch (error) {
          this.log.error('[Sensi] Error setting temperature:', error instanceof Error ? error.message : String(error));
        }
      });

    /* Heating/cooling mode set from HomeKit */
    this.service
      .getCharacteristic(this.hap.Characteristic.TargetHeatingCoolingState)
      .onSet(async (value: CharacteristicValue) => {
        try {
          const devId = this.accessory.context.deviceId;
          const mode = this.mapHapMode(Number(value));
          this.log.info('[Sensi] Setting operating mode:', { deviceId: devId, mode });
          this.api.setMode(devId, mode);
        } catch (error) {
          this.log.error('[Sensi] Error setting mode:', error instanceof Error ? error.message : String(error));
        }
      });
  }

  /** Update HomeKit characteristics from a device state packet */
  private updateFromState(dev: DeviceStatePacket): void {
    try {
      this.accessory.context.lastState = dev;
      const s = dev.state;
      if (!s) return;

      this.log.debug('[Sensi] Device state update', { id: dev.icd_id, state: s });

      const scale = s.display_scale ?? 'f';

      // Current temperature
      if (s.display_temp !== undefined && Number.isFinite(s.display_temp)) {
        const currentTempC =
          scale === 'f' ? (s.display_temp - 32) * 5 / 9 : s.display_temp;
        this.service.updateCharacteristic(
          this.hap.Characteristic.CurrentTemperature,
          currentTempC
        );
      } else {
        this.log.debug('[Sensi] Skipping current temperature update: missing or invalid', s.display_temp);
      }

      // Target temperature (heat or cool)
      const targetTempF = s.current_heat_temp ?? s.current_cool_temp;
      if (targetTempF !== undefined && Number.isFinite(targetTempF)) {
        const targetTempC =
          scale === 'f' ? (targetTempF - 32) * 5 / 9 : targetTempF;
        this.service.updateCharacteristic(
          this.hap.Characteristic.TargetTemperature,
          targetTempC
        );
      } else {
        this.log.debug('[Sensi] Skipping target temperature update: missing or invalid', targetTempF);
      }

      // HVAC mode
      const hvacMode = s.operating_mode;
      this.service.updateCharacteristic(
        this.hap.Characteristic.CurrentHeatingCoolingState,
        this.mapApiModeCurrent(hvacMode)
      );
      this.service.updateCharacteristic(
        this.hap.Characteristic.TargetHeatingCoolingState,
        this.mapApiModeTarget(hvacMode)
      );
    } catch (error) {
      this.log.error('[Sensi] Error updating thermostat state:', error instanceof Error ? error.message : String(error));
    }
  }

  /** Map API mode string to HomeKit CurrentHeatingCoolingState */
  private mapApiModeCurrent(mode: string): number {
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
  private mapApiModeTarget(mode: string): number {
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
  private mapHapMode(value: number): string {
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