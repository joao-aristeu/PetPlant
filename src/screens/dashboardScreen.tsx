import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar, 
  Modal, 
  Animated, 
  TouchableWithoutFeedback, 
  Pressable 
} from 'react-native';
import { 
  Menu, Bell, ChevronLeft, ChevronRight, Home, PlusSquare, 
  Link as LinkIcon, LogOut, Droplets, Sun, Thermometer, Sprout, PlusCircle, List 
} from 'lucide-react-native';
import notifee, { AndroidImportance } from '@notifee/react-native'; // BIBLIOTECA DE NOTIFICAÇÃO

import { Pot } from '../services/StorageService';
import { colors } from '../styles/theme';
import MqttService from '../services/MqttService';
import { PlantStatusVideo } from '../components/PlantStatusVideo'; 
import { AppNotification } from './NotificationsScreen'; // Importando tipagem para notificações

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75; 
const CARD_WIDTH = 300; 
const CARD_HEIGHT = 450;

const WEATHER_API_KEY = 'eb97c49987068593cc5c3fecabf8f2c1'; 
const CITY_NAME = 'Manaus'; 

interface DashboardProps {
  pots: Pot[];
  onNavigateAdd: () => void;
  onUpdatePot: (pot: Pot) => void;
  mqttService: MqttService;
  onSelectPot: (pot: Pot) => void; 
  onNavigateToList: () => void;
  onNavigateToConnections: () => void;
  onOpenNotifications: () => void;
  // NOVAS PROPS DE NOTIFICAÇÃO
  notificationList?: AppNotification[];
  onAddNotification?: (title: string, body: string) => void;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ 
  pots, onNavigateAdd, onUpdatePot, onSelectPot, onNavigateToList, onNavigateToConnections, mqttService, onOpenNotifications,
  notificationList, onAddNotification // Recebendo props
}) => {
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [weatherTemp, setWeatherTemp] = useState<string>('--');
  
  // O contador agora é derivado da lista de notificações passada via props
  const notificationCount = notificationList 
    ? notificationList.filter(n => !n.read).length 
    : 0;

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Estado para controlar o vídeo
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref para guardar o status anterior e comparar mudanças
  const prevStatusRef = useRef<'happy' | 'thirsty' | 'scared' | null>(null);

  const currentPot = pots[currentIndex];

  useEffect(() => {
    fetchWeather();
  }, []);

  // --- LÓGICA DE DETECÇÃO DE MUDANÇA DE STATUS E NOTIFICAÇÃO ---
  useEffect(() => {
    if (!currentPot) return;

    const currentStatus = getPlantStatus(currentPot);

    // Se é a primeira renderização ou se o status mudou
    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      handleStatusChange(currentStatus, currentPot.name);
    }

    // Atualiza o ref para o próximo ciclo
    prevStatusRef.current = currentStatus;
  }, [currentPot?.moisture, currentPot?.lightOn]); // Dependências específicas para evitar loops

  const handleStatusChange = async (newStatus: string, plantName: string) => {
    let title = '';
    let body = '';

    switch (newStatus) {
      case 'thirsty':
        title = `${plantName} está com sede!`;
        body = 'A umidade do solo está baixa. Que tal regar agora?';
        break;
      case 'scared':
        title = `${plantName} precisa de atenção!`;
        body = 'As condições de luz ou temperatura não estão ideais.';
        break;
      case 'happy':
        // Opcional: Notificar felicidade ou apenas registrar
        // title = `${plantName} está feliz!`;
        // body = 'Todas as condições estão perfeitas.';
        break;
    }

    if (title) {
      await triggerLocalNotification(title, body);
      // Chama a função passada pelo pai para atualizar o estado global
      if (onAddNotification) {
        onAddNotification(title, body);
      }
    }
  };

  const triggerLocalNotification = async (title: string, body: string) => {
    try {
      // Solicita permissão (obrigatório no iOS)
      await notifee.requestPermission();

      // Cria um canal (obrigatório no Android)
      const channelId = await notifee.createChannel({
        id: 'plant-status',
        name: 'Status das Plantas',
        importance: AndroidImportance.HIGH,
      });

      // Exibe a notificação
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher', // Ícone padrão do app (ajuste se tiver um específico)
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (error) {
      console.log('Erro ao enviar notificação:', error);
    }
  };
  // -------------------------------------------------------------

  useEffect(() => {
    const sensorTopic = "plant/sensors/humidity";
    mqttService.subscribe(sensorTopic);

    const handleMqttMessage = (topic: string, message: string) => {
      if (topic === sensorTopic && currentPot) {
        const moistureValue = parseFloat(message);
        if (!isNaN(moistureValue)) {
          onUpdatePot({ ...currentPot, moisture: moistureValue });
        }
      }
    };

    if (mqttService.setMessageCallback) {
        mqttService.setMessageCallback(handleMqttMessage);
    } else {
        (mqttService as any).onMessage = handleMqttMessage;
    }
  }, [currentPot, mqttService]);

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY_NAME}&units=metric&appid=${WEATHER_API_KEY}`
      );
      const data = await response.json();
      if (data.main && data.main.temp) {
        setWeatherTemp(`${Math.round(data.main.temp)}`);
      }
    } catch (error) {
      console.error("Erro clima:", error);
    }
  };

  const getPlantStatus = (pot: Pot): 'happy' | 'thirsty' | 'scared' => {
    if (pot.moisture < 30) return 'thirsty';
    if (pot.lightOn) return 'happy';
    return 'scared';
  };

  const getStatusColors = (status: 'happy' | 'thirsty' | 'scared') => {
    switch (status) {
      case 'scared': 
        return { nameColor: '#FFFFFF', badgeBg: '#FF968D', badgeText: '#000000', separator: '#40409C', statLabel: '#E5E7EB' };
      case 'thirsty': 
        return { nameColor: '#000000', badgeBg: '#A8E2FF', badgeText: '#000000', separator: '#FFFFFF', statLabel: '#000000' };
      default: 
        return { nameColor: '#1F2937', badgeBg: '#CDF598', badgeText: '#374151', separator: '#FFFFFF', statLabel: '#374151' };
    }
  };

  const toggleMenu = (open: boolean) => {
    if (open) {
      setIsMenuOpen(true);
      slideAnim.setValue(-SIDEBAR_WIDTH); 
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start(() => setIsMenuOpen(false));
    }
  };

  const handleNext = () => { if (pots.length > 0) setCurrentIndex(prev => (prev < pots.length - 1 ? prev + 1 : 0)); };
  const handlePrev = () => { if (pots.length > 0) setCurrentIndex(prev => (prev > 0 ? prev - 1 : pots.length - 1)); };

  const sendCommand = (actuator: 'pump' | 'light', currentState: boolean) => {
    if (!currentPot) return;
    const newState = !currentState;
    const topic = actuator === 'light' ? "plant/actuators/light" : "plant/actuators/pump";
    mqttService.publish(topic, newState ? 'OFF' : 'ON');
    onUpdatePot({ ...currentPot, [actuator === 'pump' ? 'pumpOn' : 'lightOn']: newState });
  };

  // Lógica do Vídeo
  const handleLongPress = () => {
    setIsVideoPlaying(true);
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
    videoTimeoutRef.current = setTimeout(() => setIsVideoPlaying(false), 8000); 
  };
  const handlePressOut = () => {
    setIsVideoPlaying(false);
    if (videoTimeoutRef.current) clearTimeout(videoTimeoutRef.current);
  };

  // --- RENDERIZAÇÃO ---

  // 1. CARD VAZIO (Estilo exato da imagem enviada)
  const renderEmptyState = () => (
    <View style={styles.emptyCardContainer}>
      <Image 
        source={require('../../assets/Ellipse.png')} 
        style={styles.ellipseBg}
        resizeMode="cover"
      />
      {/* Setas visuais (como na imagem) */}
      <View style={[styles.arrowCircle, {position: 'absolute', left: -20, opacity: 0.5}]}>
          <ChevronLeft color="#9CA3AF" size={24} />
      </View>
      <View style={[styles.arrowCircle, {position: 'absolute', right: -20, opacity: 0.5}]}>
          <ChevronRight color="#9CA3AF" size={24} />
      </View>

      <View style={styles.emptyCardContent}>
        <Text style={styles.welcomeTitle}>Bem-vindo ao Pet Plant!</Text>
        
        <Text style={styles.welcomeSubtitle}>
          Para começar, adicione sua primeira planta.
        </Text>
        
        <TouchableOpacity style={styles.addPlantButton} onPress={onNavigateAdd}>
          <Text style={styles.addPlantButtonText}>+ Adicionar Planta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 2. CARD PRINCIPAL (Mantendo sua funcionalidade responsiva)
  const renderMainContent = () => {
    if (pots.length === 0) return renderEmptyState();

    const currentStatus = getPlantStatus(currentPot);
    const theme = getStatusColors(currentStatus);
    const shouldPauseVideo = !isVideoPlaying;

    return (
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        {/* Seta Esquerda */}
        <TouchableOpacity style={[styles.arrowButton, {marginRight: -2}]} onPress={handlePrev}>
            <View style={styles.arrowCircle}><ChevronLeft color="#9CA3AF" size={24} /></View>
        </TouchableOpacity>

        <Pressable 
            onPress={() => { if (onSelectPot) onSelectPot(currentPot); }}
            onLongPress={handleLongPress} 
            onPressOut={handlePressOut}   
            delayLongPress={200}          
            style={({ pressed }) => [styles.cardContainer, pressed && { opacity: 0.95 }]}
        >
            <View style={styles.videoBackgroundWrapper}>
                <PlantStatusVideo status={currentStatus} paused={shouldPauseVideo} />
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                <Text style={[styles.plantName, { color: theme.nameColor }]}>{currentPot.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: theme.badgeBg }]}>
                    <Text style={[styles.statusText, { color: theme.badgeText }]}>
                    {currentStatus === 'scared' ? 'Com Medo' : currentStatus === 'thirsty' ? 'Com Sede' : 'Feliz'}
                    </Text>
                </View>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Thermometer size={20} color="#EF4444" />
                    <Text style={[styles.statLabel, { color: theme.statLabel }]}>{weatherTemp}°C</Text>
                </View>
                <View style={styles.statItem}>
                    <Droplets size={20} color="#3B82F6" />
                    <Text style={[styles.statLabel, { color: theme.statLabel }]}>{currentPot.moisture}%</Text>
                </View>
                <View style={styles.statItem}>
                    <Sun size={20} color="#F59E0B" />
                    <Text style={[styles.statLabel, { color: theme.statLabel }]}>{currentPot.lightOn ? 'On' : 'Off'}</Text>
                </View>
                </View>
                <View style={{flex: 1}} />
                <View style={styles.controlsRow}>
                <TouchableOpacity style={[styles.controlBtn, currentPot.pumpOn ? styles.controlBtnActive : {}]} onPress={() => sendCommand('pump', currentPot.pumpOn)}>
                    <Text style={[styles.controlBtnText, { color: '#fff' }]}>{currentPot.pumpOn ? 'Água ON' : 'Água'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, currentPot.lightOn ? styles.controlBtnActiveLight : {}]} onPress={() => sendCommand('light', currentPot.lightOn)}>
                    <Text style={[styles.controlBtnText, currentPot.lightOn ? { color: '#374151' } : { color: '#fff' }]}>{currentPot.lightOn ? 'Luz ON' : 'Luz'}</Text>
                </TouchableOpacity>
                </View>
            </View>
        </Pressable>

        {/* Seta Direita */}
        <TouchableOpacity style={[styles.arrowButton, {marginLeft: -2}]} onPress={handleNext}>
            <View style={styles.arrowCircle}><ChevronRight color="#9CA3AF" size={24} /></View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* SIDEBAR MANTIDA IGUAL */}
      <Modal transparent visible={isMenuOpen} onRequestClose={() => toggleMenu(false)} animationType="none">
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={() => toggleMenu(false)}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.logoContainerCentered}>
                  <Image source={require('../../assets/menuTab-logo.png')} style={styles.sidebarLogoImage} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.sidebarItems}>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleMenu(false); onNavigateToList(); }}>
                <List color={colors.primary} size={24} />
                <Text style={styles.sidebarItemText}>Lista de Plantas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleMenu(false); onNavigateAdd(); }}>
                <PlusSquare color={colors.primary} size={24} />
                <Text style={styles.sidebarItemText}>Adicionar Planta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleMenu(false); onOpenNotifications(); }}>
                <Bell color={colors.primary} size={24} />
                <Text style={styles.sidebarItemText}>Notificações</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={onNavigateToConnections}>
                <LinkIcon color={colors.primary} size={24} />
                <Text style={styles.sidebarItemText}>Conexão</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sidebarFooter}>
               <TouchableOpacity style={styles.sidebarItem}>
                  <LogOut color={colors.primary} size={24} />
                  <Text style={styles.sidebarItemText}>Sair</Text>
               </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => toggleMenu(true)} style={styles.headerLeftBtn}>
          <Menu color={colors.primary} size={28} />
        </TouchableOpacity>
        <View style={styles.headerCenterLogo}>
          <Image source={require('../../assets/menuTab-logo.png')} style={styles.headerLogoImage} resizeMode="contain" />
        </View>
        <TouchableOpacity style={styles.headerRightBtn} onPress={onOpenNotifications}>
           <View>
              <Bell color={colors.primary} size={28} />
              {/* Badge dinâmico */}
              {notificationCount > 0 && <View style={styles.notifBadge}><Text style={styles.notifText}>{notificationCount}</Text></View>}
           </View>
        </TouchableOpacity>
      </View>

      {/* ÁREA PRINCIPAL */}
      <View style={styles.mainArea}>
        {renderMainContent()}
      </View>

      {/* BARRA INFERIOR */}
      <View style={styles.floatingNavContainer}>
        <View style={styles.floatingNavBackground}>
            
            {/* ITEM 1: HOME (Ativo) */}
            <TouchableOpacity style={styles.navItemActiveContainer}>
                <View style={styles.activeIconCircle}>
                    <Home color="#FFF" size={24} strokeWidth={2.5} />
                </View>
                <Text style={styles.navLabelActive}>Home</Text>
            </TouchableOpacity>

            {/* ITEM 2: PLANTAS */}
            <TouchableOpacity style={styles.navItem} onPress={onNavigateToList}>
                <Sprout color={colors.primary} size={24} />
                <Text style={styles.navLabel}>Plantas</Text>
            </TouchableOpacity>

            {/* ITEM 3: ADICIONAR */}
            <TouchableOpacity style={styles.navItem} onPress={onNavigateAdd}>
                <PlusSquare color={colors.primary} size={24} />
                <Text style={styles.navLabel}>Adicionar</Text>
            </TouchableOpacity>

            {/* ITEM 4: CONEXÃO */}
            <TouchableOpacity style={styles.navItem} onPress={onNavigateToConnections}>
                <LinkIcon color={colors.primary} size={24} />
                <Text style={styles.navLabel}>Conexão</Text>
            </TouchableOpacity>

        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // --- SIDEBAR & MODAL ---
  modalContainer: { flex: 1, flexDirection: 'row' },
  backdrop: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebar: { width: SIDEBAR_WIDTH, height: '100%', backgroundColor: '#fff', paddingVertical: 50, paddingHorizontal: 30, elevation: 10, justifyContent: 'space-between' },
  sidebarHeader: { marginBottom: 30 }, 
  logoContainerCentered: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sidebarLogoImage: { width: 180, height: 100 },
  sidebarItemText: { fontSize: 16, fontWeight: '600', color: '#374151', marginLeft: 16 },
  sidebarItems: { flex: 1 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
  
  // --- HEADER ---
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 30 : 50, paddingBottom: 20, backgroundColor: '#fff', zIndex: 10 },
  headerLeftBtn: { width: 50, alignItems: 'flex-start' },
  headerRightBtn: { width: 50, alignItems: 'flex-end' },
  headerCenterLogo: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 60 },
  headerLogoImage: { width: 160, height: 60 },
  notifBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#8AB530', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  notifText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // --- MAIN AREA ---
  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 90 },
  
  // CARD DE VAZIO (Estilo Imagem)
  emptyCardContainer: {
    width: CARD_WIDTH, 
    height: CARD_HEIGHT, 
    backgroundColor: '#E5FFAF', 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
    // overflow: 'hidden',
    elevation: 0,
    borderRadius: 12
  },
    ellipseBg: {
    position: 'absolute',
    top: -40, // Puxa para cima para cortar a imagem
    left: -50, // Ajuste lateral
    width: CARD_WIDTH + 100, // Maior que o card para fazer o arco
    height: 300, // Altura suficiente
    opacity: 0.8, // Transparência leve se precisar
  },
  emptyCardContent: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 50 },
  welcomeSubtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 40, paddingHorizontal: 10 },
  addPlantButton: { backgroundColor: '#8AB530', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.2, shadowRadius:3 },
  addPlantButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // CARD DA PLANTA (COM VÍDEO)
  cardContainer: { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: '#efffc8', borderRadius: 30, elevation: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  videoBackgroundWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  cardContent: { flex: 1, padding: 20, width: '100%', justifyContent: 'flex-start', alignItems: 'center', zIndex: 1 },
  separator: { height: 1, backgroundColor: '#FFFFFF', width: '100%', marginVertical: 15 },
  cardHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plantName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  statusBadge: { backgroundColor: '#CDF598', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#374151', fontWeight: 'bold', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 5 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: 'bold', marginTop: 4 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 15, marginBottom: 10 },
  controlBtn: { flex: 1, width: 124, height: 40, backgroundColor: '#8AB530', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  controlBtnActive: { backgroundColor: '#2563EB' },
  controlBtnActiveLight: { backgroundColor: '#F59E0B' },
  controlBtnText: { color: '#fff', fontWeight: 'bold' },
  
  // ARROWS
  arrowButton: { zIndex: 20 },
  arrowCircle: { backgroundColor: '#F3F4F6', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 2 },

  // --- FLOATING NAV BAR ---
  floatingNavContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
    zIndex: 50,
  },
  floatingNavBackground: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: '90%',
    height: 70,
    borderRadius: 35,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    paddingHorizontal: 10
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10
  },
  navItemActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20, 
  },
  activeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8AB530', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#8AB530',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#fff' 
  },
  navLabel: {
    fontSize: 10,
    color: '#8AB530',
    marginTop: 2
  },
  navLabelActive: {
    fontSize: 10,
    color: '#8AB530',
    fontWeight: 'bold'
  }
});