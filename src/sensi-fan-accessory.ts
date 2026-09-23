import { Logging, PlatformAccessory, Service, API, CharacteristicValue } from 'homebridge';
import { SensiAPI, DeviceStatePacket } from './sensi-api';

export class SensiFanAccessory {
  private service: Service;

  constructor(
    private readonly log: Logging,
    private readonly accessory: PlatformAccessory,
    private readonly api: SensiAPI,
    private readonly hap: API['hap']
  ) {
    this.service =
      this.accessory.getService(this.hap.Service.Fanv2) ||
      this.accessory.addService(this.hap.Service.Fanv2);

    this.api.onDeviceUpdate((dev: DeviceStatePacket) => {
      if (dev.icd_id.toLowerCase() === this.accessory.context.deviceId) {
        this.updateFromState(dev);
      }
    });

    this.service
      .getCharacteristic(this.hap.Characteristic.Active)
      .onSet(async (value: CharacteristicValue) => {
        try {
          const devId = this.accessory.context.deviceId;
          const fanMode = value === this.hap.Characteristic.Active.ACTIVE ? 'on' : 'auto';

          this.log.info('[Sensi] Setting fan mode', { deviceId: devId, fanMode });
          this.api.setFanMode(devId, fanMode);
        } catch (error) {
          this.log.error('[Sensi] Error setting fan mode:', error instanceof Error ? error.message : String(error));
        }
      });
  }

  private updateFromState(dev: DeviceStatePacket): void {
    try {
      const s = dev.state;
      if (!s) return;

      const fanMode = s.fan_mode;
      if (fanMode === undefined) {
        this.log.debug('[Sensi] Skipping fan mode update: missing fan_mode', s.fan_mode);
        return;
      }

      // Sensi fan_mode is 'on' | 'auto' | 'smart'. HomeKit's Fan Active is a
      // simple on/off, so treat anything other than 'on' as inactive.
      const active =
        fanMode === 'on'
          ? this.hap.Characteristic.Active.ACTIVE
          : this.hap.Characteristic.Active.INACTIVE;

      this.service.updateCharacteristic(this.hap.Characteristic.Active, active);
    } catch (error) {
      this.log.error('[Sensi] Error updating fan state:', error instanceof Error ? error.message : String(error));
    }
  }
}
