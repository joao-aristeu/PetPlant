import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

// UUIDs do ESP32 (Devem ser iguais aos do código Arduino)
const TARGET_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab'; 
const TARGET_CHAR_UUID    = 'abcd1234-5678-90ab-cdef-1234567890ab'; 

export class BleService {
  manager: BleManager;
  onLog: (msg: string) => void;

  constructor(onLog: (msg: string) => void = console.log) {
    this.manager = new BleManager();
    this.onLog = onLog;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') return true;

    // Garante que a versão seja tratada como número
    const apiLevel = typeof Platform.Version === 'number' 
      ? Platform.Version 
      : parseInt(String(Platform.Version), 10);

    if (apiLevel >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  scan(onDeviceFound: (device: Device) => void) {
    this.manager.stopDeviceScan();
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        this.onLog(`❌ Erro Scan: ${error ? error.message : 'Desconhecido'}`);
        return;
      }
      if (device && device.name) {
        onDeviceFound(device);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
  }

  async connectAndSendWifi(deviceId: string, ssid: string, pass: string): Promise<boolean> {
    try {
      this.stopScan();
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      const payload = JSON.stringify({ ssid, password: pass });
      const base64Data = Buffer.from(payload).toString('base64');

      await device.writeCharacteristicWithResponseForService(
        TARGET_SERVICE_UUID,
        TARGET_CHAR_UUID,
        base64Data
      );
      
      await this.manager.cancelDeviceConnection(deviceId);
      return true;
    } catch (error) {
      this.onLog(`❌ Falha BLE: ${error}`);
      return false;
    }
  }
}