import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, LogBox, Alert } from 'react-native';

import MqttService from './src/services/mqttService';
import { StorageService, Pot } from './src/services/storageService';

import { DashboardScreen } from './src/screens/dashboardScreen';
import { AddPotScreen } from './src/screens/addPotScreen';
import PlantDetailsScreen from './src/screens/plantDetailScreen'; 
import { NotificationsScreen, AppNotification } from './src/screens/NotificationsScreen';

import PlantListScreen from './src/screens/PlantListScreen';
import { ConnectionDetailsScreen } from './src/screens/ConnectionDetailsScreen'; 
import { ConnectionsScreen } from './src/screens/ConnectionsScreen'; 

LogBox.ignoreLogs(['new NativeEventEmitter']);

export default function App() {
  const [screen, setScreen] = useState<'dashboard' | 'addPot' | 'details' | 'plantList' | 'connectionDetails' | 'globalConnections' | 'notifications'>('dashboard');
  
  const [selectedPot, setSelectedPot] = useState<Pot | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado Global de Notificações
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const mqttService = useRef(new MqttService()).current;

  // Adiciona notificação
  const handleAddNotification = (title: string, body: string) => {
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title,
      message: body,
      date: new Date(),
      read: false, // Começa como não lida
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Marca uma como lida
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  // Limpa todas
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const storedPots = await StorageService.getPots();
        setPots(storedPots);
        mqttService.connect();
        // storedPots.forEach(p => mqttService.subscribe(`/status`));
      } catch (error) {
        console.error("Erro init:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [mqttService]);

  const handleAddPot = async (data: any) => {
    const newPot: Pot = {
      id: Date.now().toString(),
      name: data.name,
      plantType: data.plantType,
      image: data.image,
      description: data.description,
      location: data.location,
      moisture: 50, lightOn: false, pumpOn: false,
      macAddress: data.macAddress || 'UNKNOWN',
      ssid: data.ssid,
      ip: data.ip
    };
    const updated = [...pots, newPot];
    setPots(updated);
    await StorageService.savePots(updated);
    
    mqttService.subscribe(`jardim/${newPot.id}/status`);
    setSelectedPot(newPot);
    setScreen('connectionDetails');
  };

  const handleUpdatePot = async (updatedPot: Pot) => {
    const updated = pots.map(p => p.id === updatedPot.id ? updatedPot : p);
    setPots(updated);
    await StorageService.savePots(updated);
    if (selectedPot && selectedPot.id === updatedPot.id) setSelectedPot(updatedPot);
  };

  const handleDeletePot = async (id: string) => {
    const updatedPots = pots.filter(p => p.id !== id);
    setPots(updatedPots);
    await StorageService.savePots(updatedPots);
    if (selectedPot && selectedPot.id === id) setSelectedPot(null);
    if (screen === 'details' || screen === 'connectionDetails') setScreen('dashboard');
  };

  const handleOpenDetails = (pot: Pot) => {
     setSelectedPot(pot);
     setScreen('details');
  };

  const handleNavigateToList = () => {
     setScreen('plantList');
  };

  const handleNavigateToConnections = () => {
    setScreen('globalConnections');
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#065f46" />
      </View>
    );
  }

  // --- ROTEAMENTO ---

  if (screen === 'addPot') {
    return <AddPotScreen onBack={() => setScreen('dashboard')} onComplete={handleAddPot} />;
  }

  if (screen === 'notifications') {
    return (
      <NotificationsScreen 
        notifications={notifications}
        onBack={() => setScreen('dashboard')} 
        onClearAll={handleClearNotifications}
        onMarkAsRead={handleMarkAsRead} // Passando a nova função
      />
    );
  }

  if (screen === 'plantList') {
    return (
      <PlantListScreen 
        pots={pots}
        onBack={() => setScreen('dashboard')}
        onSelect={handleOpenDetails}
        onDeleteConfirmed={handleDeletePot}
        onNavigateAdd={() => setScreen('addPot')}
      />
    );
  }

  if (screen === 'globalConnections') {
    return (
      <ConnectionsScreen 
        pots={pots} 
        onBack={() => setScreen('dashboard')} 
      />
    );
  }

  if (screen === 'connectionDetails' && selectedPot) {
    return (
      <ConnectionDetailsScreen
        route={{ params: { plant: selectedPot } }}
        navigation={{
          goBack: () => setScreen('dashboard'),
          navigate: (screenName: string) => { 
            if (screenName === 'AddPotScreen') setScreen('addPot'); 
          }
        }}
      />
    );
  }

  if (screen === 'details' && selectedPot) {
      return <PlantDetailsScreen 
        plant={selectedPot} 
        onBack={() => { setSelectedPot(null); setScreen('dashboard'); }} 
        onDelete={handleDeletePot} 
        onEdit={() => Alert.alert("Editar", "Em breve")} 
      />;
  }

  return (
    <DashboardScreen 
      pots={pots}
      onNavigateAdd={() => setScreen('addPot')}
      onUpdatePot={handleUpdatePot}
      mqttService={mqttService}
      onSelectPot={handleOpenDetails}
      onNavigateToList={handleNavigateToList}
      onNavigateToConnections={handleNavigateToConnections}
      onOpenNotifications={() => setScreen('notifications')}
      
      notificationList={notifications}
      onAddNotification={handleAddNotification}
    />
  );
}