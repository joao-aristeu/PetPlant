import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Pot {
  id: string;
  name: string;
  plant?: string; 
  plantType: string;
  image?: string;
  moisture: number;
  lightOn: boolean;
  pumpOn: boolean;
  macAddress?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string; // Salvaremos como ISO string para facilitar, mas exibiremos formatado
  read: boolean;
  type: 'thirsty' | 'scared' | 'happy';
}

const NOTIFICATIONS_KEY = '@petplant_notifications';
const POTS_KEY = '@smartplant_pots';

export const StorageService = {
  // --- VASOS ---
  getPots: async (): Promise<Pot[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(POTS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error("Erro ao carregar vasos", e);
      return [];
    }
  },

  savePots: async (pots: Pot[]): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(pots);
      await AsyncStorage.setItem(POTS_KEY, jsonValue);
    } catch (e) {
      console.error("Erro ao salvar vasos", e);
    }
  },

  // --- NOTIFICAÇÕES ---
  getNotifications: async (): Promise<AppNotification[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      return [];
    }
  },

  addNotification: async (notification: AppNotification) => {
    try {
      const current = await StorageService.getNotifications();
      // Adiciona no topo da lista
      const updated = [notification, ...current]; 
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  },
  
  clearNotifications: async () => {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
    } catch (e) {
      console.error(e);
    }
  }
};