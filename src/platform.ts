import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { SensiAPI, DeviceStatePacket } from './sensi-api';
import { SensiThermostatAccessory } from './sensi-thermostat-accessory';
import { SensiSensorAccessory } from './sensi-sensor-accessory';

export class SensiPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private readonly config: PlatformConfig;
  private readonly accessories: PlatformAccessory[] = [];
  private readonly seenDevices = new Set<string>();
  private sensiApi!: SensiAPI;

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    this.config = config;

    this.api.on('didFinishLaunching', () => {
      this.initialize().catch((e) => this.log.error('[Sensi] Init error:', e));
    });
  }

  async initialize(): Promise<void> {
    if (!this.config.refreshToken) {
      this.log.warn('[Sensi] Refresh token missing – cannot connect.');
      return;
    }

    try {
      this.sensiApi = new SensiAPI(this.config.refreshToken as string, this.log);
      await this.sensiApi.authenticate();
      await this.sensiApi.connect();

      this.sensiApi.onDeviceUpdate((dev: DeviceStatePacket) => {
        this.handleDeviceUpdate(dev);
      });

      this.log.info('[Sensi] Platform initialized successfully');
    } catch (error) {
      this.log.error('[Sensi] Initialization failed:', error instanceof Error ? error.message : String(error));
    }
  }

  private handleDeviceUpdate(dev: DeviceStatePacket): void {
    if (!dev.icd_id) {
      this.log.warn('[Sensi] Device update missing icd_id');
      return;
    }

    const id = dev.icd_id.toLowerCase();
    
    // Only register each device once
    if (this.seenDevices.has(id)) {
      return;
    }
    this.seenDevices.add(id);

    const name = dev.registration?.name ?? 'Sensi Thermostat';
    const uuid = this.api.hap.uuid.generate(id);
    const accessory = new this.api.platformAccessory(name, uuid);
    accessory.context.deviceId = id;

    try {
      // Register thermostat accessory
      new SensiThermostatAccessory(this.log, accessory, this.sensiApi, this.api.hap);
      this.api.registerPlatformAccessories('homebridge-sensi', 'SensiPlatform', [accessory]);
      this.accessories.push(accessory);

      // Register sensor accessory
      new SensiSensorAccessory(this.log, accessory, this.sensiApi, this.api.hap);

      this.log.info(`[Sensi] Registered device: ${name} (${id})`);
    } catch (error) {
      this.log.error(`[Sensi] Failed to register device ${name}:`, error instanceof Error ? error.message : String(error));
    }
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory);
  }
}