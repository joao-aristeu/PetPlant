import mqtt from 'mqtt';

// Usando Broker Público da HiveMQ via WebSockets (WSS)
const BROKER_URL = 'ws://broker.hivemq.com:8000/mqtt';

class MqttService {
  client: mqtt.MqttClient | null = null;
  onLog: (msg: string) => void;
  // Callback dinâmico para mensagens
  private onMessageCallback: ((topic: string, msg: string) => void) | null = null;

  constructor(
    onLog: (msg: string) => void = console.log
  ) {
    this.onLog = onLog;
  }

  // Método chamado pela DashboardScreen para definir quem recebe os dados
  setMessageCallback(callback: (topic: string, msg: string) => void) {
    this.onMessageCallback = callback;
  }

  connect() {
    this.onLog(`🔌 Conectando a ${BROKER_URL}...`);

    this.client = mqtt.connect(BROKER_URL, {
      clientId: `app_plant_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
      this.onLog('✅ MQTT Conectado!');
    });

    this.client.on('error', (err) => {
      this.onLog(`❌ Erro MQTT: ${err.message}`);
    });

    this.client.on('message', (topic, message) => {
      const payload = message.toString();
      
      // Chama o callback definido na tela (Dashboard)
      if (this.onMessageCallback) {
        this.onMessageCallback(topic, payload);
      }
    });
  }

  // Agora aceita string OU objeto
  publish(topic: string, message: string | object) {
    if (this.client && this.client.connected) {
      let payload: string;

      // Se for string (ex: "ON", "OFF"), envia crua. 
      // Se for objeto, converte para JSON.
      if (typeof message === 'string') {
        payload = message;
      } else {
        payload = JSON.stringify(message);
      }

      this.client.publish(topic, payload, { qos: 0, retain: false });
      this.onLog(`📤 Enviado para [${topic}]: ${payload}`);
    } else {
      this.onLog('⚠️ Não conectado. Falha no envio.');
    }
  }

  subscribe(topic: string) {
    if (this.client) {
      this.client.subscribe(topic, (err) => {
        if (!err) this.onLog(`👂 Inscrito em ${topic}`);
      });
    }
  }

  unsubscribe(topic: string) {
    if (this.client && this.client.connected) {
      try {
        this.client.unsubscribe(topic);
        console.log(`[MQTT] Unsubscribed from: ${topic}`);
      } catch (error) {
        console.warn(`[MQTT] Failed to unsubscribe from ${topic}:`, error);
      }
    } else {
      console.log('[MQTT] Client not connected, cannot unsubscribe.');
    }
  }
}

export default MqttService;