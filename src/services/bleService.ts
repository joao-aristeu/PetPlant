import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHAR_UUID    = "abcd1234-5678-90ab-cdef-1234567890ab";

export class BleService {
  manager: BleManager;
  logCallback: (msg: string) => void;

  constructor(logCallback?: (msg: string) => void) {
    this.manager = new BleManager();
    this.logCallback = logCallback || console.log;
  }

  private log(msg: string) {
    this.logCallback(`[BleService] ${msg}`);
  }

  // Codificação/Decodificação Base64
  private toBase64(text: string) { return Buffer.from(text).toString('base64'); }
  private fromBase64(base64: string) { return Buffer.from(base64, 'base64').toString('utf-8'); }

  // Função Principal: Conecta, Envia e Fica Lendo (Polling)
  async sendWifiCredentials(device: Device, ssid: string, pass: string): Promise<{ ip: string; ssid: string }> {
    try {
      this.log("Parando scan para iniciar conexão...");
      this.manager.stopDeviceScan();

      // 1. Conectar
      this.log(`Conectando a ${device.name || device.id}...`);
      const connectedDevice = await device.connect({ timeout: 10000 });
      await connectedDevice.discoverAllServicesAndCharacteristics();
      this.log("Serviços descobertos.");

      // 2. Escrever Credenciais
      const payload = JSON.stringify({ ssid, password: pass });
      this.log("Escrevendo credenciais...");
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUID,
        this.toBase64(payload)
      );

      // 3. LOOP DE LEITURA (POLLING)
      // O ESP32 demora um pouco para conectar. Vamos ler a cada 2s.
      this.log("Aguardando conexão do Vaso (Polling)...");

      let attempts = 0;
      const maxAttempts = 20; // 20 * 2s = 40 segundos de espera máxima

      return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
          attempts++;
          this.log(`Leitura ${attempts}/${maxAttempts}...`);

          try {
            // AQUI ESTÁ A MÁGICA: READ ao invés de Monitor/Notify
            const char = await connectedDevice.readCharacteristicForService(SERVICE_UUID, CHAR_UUID);
            
            if (char.value) {
              const decoded = this.fromBase64(char.value);
              this.log(`Resposta bruta: ${decoded}`);

              try {
                const json = JSON.parse(decoded);

                // Cenário 1: Sucesso (Recebeu IP válido)
                if (json.ip && json.ip !== "0.0.0.0" && json.status !== "connecting") {
                  clearInterval(intervalId);
                  this.log("IP recebido com sucesso!");
                  // Opcional: Desconectar limpo ou deixar o ESP derrubar
                  // await connectedDevice.cancelConnection(); 
                  resolve({ ip: json.ip, ssid });
                }
                
                // Cenário 2: Falha explícita reportada pelo ESP32
                else if (json.status === "fail" || json.status === "error") {
                  clearInterval(intervalId);
                  reject(new Error("Senha incorreta ou falha de conexão no Vaso."));
                }
                
                // Cenário 3: "connecting" ou "idle" -> Continua o loop
                else {
                   // Apenas aguarda o próximo ciclo
                }

              } catch (parseError) {
                // JSON inválido (pode acontecer se ler enquanto o ESP escreve)
                this.log("JSON incompleto, ignorando...");
              }
            }
          } catch (readError) {
            // Erro de leitura Bluetooth (perda de sinal momentânea)
            this.log(`Erro de leitura: ${readError}`);
          }

          // Timeout do App
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            reject(new Error("Tempo esgotado. O Vaso não confirmou a conexão."));
          }

        }, 2000); // Executa a cada 2 segundos
      });

    } catch (error: any) {
      this.log(`Erro Fatal: ${error.message}`);
      throw error;
    }
  }

  // Scan Wrapper
  async requestPermissions() { /* Mesma lógica de permissão anterior */ return true; } // Simplificado para brevidade, use o do código anterior
  
  startScan(onDeviceFound: (device: Device) => void) {
    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        if (error.errorCode !== 600) console.log(error);
        return;
      }
      if (device && (device.name || device.serviceUUIDs)) {
        onDeviceFound(device);
      }
    });
  }

  stopScan() {
    this.manager.stopDeviceScan();
  }
}