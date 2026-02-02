import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Image, ScrollView, StatusBar, Alert, TextInput, 
  Platform, PermissionsAndroid, KeyboardAvoidingView 
} from 'react-native';
import { 
  ChevronLeft, Camera, Bluetooth, Wifi, Check, Sprout, 
  ChevronDown, ChevronUp, Lock, RefreshCw, Send 
} from 'lucide-react-native';
import { Device } from 'react-native-ble-plx'; // Apenas os tipos são necessários aqui
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import WifiManager from 'react-native-wifi-reborn';

// IMPORTANTE: Ajuste o caminho conforme sua estrutura de pastas
import { BleService } from '../services/bleService'; 
import { colors } from '../styles/theme'; 

// Inicializa o Serviço (Singleton)
const bleService = new BleService((msg) => console.log(msg));

// --- DATABASE DE PLANTAS ---
const PLANT_DATABASE: Record<string, string> = {
  "Jiboia": "Epipremnum aureum",
  "Samambaia": "Nephrolepis exaltata",
  "Espada de São Jorge": "Sansevieria trifasciata",
  "Suculenta": "Echeveria elegans",
  "Cacto": "Cactaceae",
  "Orquídea": "Orchidaceae",
  "Hortelã": "Mentha spicata",
  "Manjericão": "Ocimum basilicum",
  "Alecrim": "Salvia rosmarinus",
  "Zamioculca": "Zamioculcas zamiifolia",
  "Costela de Adão": "Monstera deliciosa"
};

const PREDEFINED_NAMES = Object.keys(PLANT_DATABASE);
const PREDEFINED_SPECIES = Array.from(new Set(Object.values(PLANT_DATABASE)));

// --- Componente Combo (Dropdown) ---
const EditableSelect = ({ label, value, onChangeText, options, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleSelect = (item: string) => { 
    onChangeText(item); 
    setIsOpen(false); 
  };
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.comboContainer}>
        <TextInput 
          style={styles.comboInput} 
          placeholder={placeholder} 
          placeholderTextColor="#9CA3AF" 
          value={value} 
          onChangeText={onChangeText} 
        />
        <TouchableOpacity style={styles.comboIcon} onPress={() => setIsOpen(!isOpen)}>
          {isOpen ? <ChevronUp size={20} color={colors.primary} /> : <ChevronDown size={20} color="#9CA3AF" />}
        </TouchableOpacity>
      </View>
      {isOpen && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {options.map((item: string, index: number) => (
            <TouchableOpacity key={index} style={styles.dropdownItem} onPress={() => handleSelect(item)}>
              <Text style={styles.dropdownText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

interface AddPotProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

export const AddPotScreen: React.FC<AddPotProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ 
    name: '', plant: '', plantType: '', location: '', description: '', image: null as string | null 
  });
  
  // Estados BLE
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [scanning, setScanning] = useState(false);

  // Estados Wi-Fi
  const [wifiList, setWifiList] = useState<any[]>([]);
  const [isWifiScanning, setIsWifiScanning] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  
  const [connectionInfo, setConnectionInfo] = useState({ ip: '', ssid: '' });
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [credentialsSentSuccess, setCredentialsSentSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Auto-preenchimento
  const handlePlantNameChange = (text: string) => {
    const correspondingSpecies = PLANT_DATABASE[text];
    setData(prev => ({
      ...prev,
      plant: text,
      plantType: correspondingSpecies ? correspondingSpecies : prev.plantType
    }));
  };

  // --- 1. SCAN BLE (Usando o Service) ---
  const startScan = useCallback(async () => {
    const hasPerm = await bleService.requestPermissions();
    if (!hasPerm) { 
      Alert.alert('Permissão', 'Permissões de Bluetooth/Localização negadas.'); 
      return; 
    }

    setScanning(true);
    setDevices([]);

    // Usa o método do serviço
    bleService.startScan((device) => {
      setDevices(prev => {
        if (!prev.find(d => d.id === device.id)) {
          return [...prev, device];
        }
        return prev;
      });
    });

    // Timeout de 10s
    setTimeout(() => {
      bleService.stopScan();
      setScanning(false);
    }, 10000);
  }, []);

  // Inicia scan ao entrar no passo 2
  useEffect(() => {
    if (step === 2) startScan();
    return () => { bleService.stopScan(); };
  }, [step, startScan]);


  // --- 2. SCAN WIFI ---
  const scanWifiNetworks = async () => {
    setIsWifiScanning(true);
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }
      const list = await WifiManager.loadWifiList();
      const unique = Array.from(new Set(list.filter(w=>w.SSID).map(w=>w.SSID))).map(ssid => ({ ssid }));
      setWifiList(unique);
    } catch (e) { 
      console.log("Wifi Scan Error", e); 
    } finally { 
      setIsWifiScanning(false); 
    }
  };

  useEffect(() => {
    if (step === 3) scanWifiNetworks();
  }, [step]);


  // --- 3. ENVIAR CREDENCIAIS (Usando o Service) ---
  const sendCredentialsToDevice = async () => {
    if (!selectedDevice || !selectedSsid || !password) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }
    
    setSendingCredentials(true);
    setStatusMessage("Conectando ao Vaso...");

    try {
      // Chamada simplificada graças ao BleService!
      const result = await bleService.sendWifiCredentials(
        selectedDevice, 
        selectedSsid, 
        password
      );

      // Sucesso
      setConnectionInfo({ ip: result.ip, ssid: result.ssid });
      setCredentialsSentSuccess(true);
      setStatusMessage(`Conectado! IP: ${result.ip}`);
      Alert.alert("Sucesso", `Vaso conectado!\nIP: ${result.ip}`);

    } catch (error: any) {
      console.error(error);
      setStatusMessage("Falha na conexão.");
      Alert.alert("Erro", error.message || "Não foi possível conectar o vaso ao Wi-Fi.");
    } finally {
      setSendingCredentials(false);
    }
  };

  const handleFinish = () => {
    onComplete({ 
      name: data.name,
      plant: data.plant, 
      plantType: data.plantType,
      location: data.location,
      image: data.image,
      description: data.description,
      macAddress: selectedDevice?.id || 'UNKNOWN',
      ip: connectionInfo.ip,
      ssid: connectionInfo.ssid
    });
  };

  const handleSkip = () => {
    onComplete({ 
      name: data.name,
      plant: data.plant,
      plantType: data.plantType,
      location: data.location,
      image: data.image,
      description: data.description,
      macAddress: 'UNKNOWN',
      ip: '0.0.0.0',
      ssid: ''
    });
  };

  const handleImagePick = async (type: 'camera' | 'gallery') => {
      if (type === 'camera' && Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      const fn = type === 'camera' ? launchCamera : launchImageLibrary;
      fn({ mediaType: 'photo', quality: 0.5, saveToPhotos: false }, (res) => {
         if (res.assets?.[0]?.uri) setData(prev => ({ ...prev, image: res.assets![0].uri || null }));
      });
  };

  // --- RENDERS ---
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.imageUploadContainer}>
        <TouchableOpacity style={styles.imageCircle} onPress={() => Alert.alert("Foto", "Origem:", [{text:"Câmera", onPress:()=>handleImagePick('camera')}, {text:"Galeria", onPress:()=>handleImagePick('gallery')}])}>
          {data.image ? <Image source={{ uri: data.image }} style={styles.uploadedImage} /> : <Camera size={40} color={colors.white} />}
        </TouchableOpacity>
        <Text style={{color:'#666', fontSize: 12, marginTop: 4}}>Toque para editar</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nome do Vaso</Text>
        <TextInput style={styles.input} placeholder="Ex: Vaso da Sala" placeholderTextColor="#9CA3AF" value={data.name} onChangeText={(t) => setData({ ...data, name: t })} />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Localização</Text>
        <TextInput style={styles.input} placeholder="Ex: Varanda" placeholderTextColor="#9CA3AF" value={data.location} onChangeText={(t) => setData({ ...data, location: t })} />
      </View>
      
      <EditableSelect label="Planta (Nome Popular)" value={data.plant} onChangeText={handlePlantNameChange} options={PREDEFINED_NAMES} placeholder="Selecione..." />
      <EditableSelect label="Espécie Técnica" value={data.plantType} onChangeText={(t: string) => setData({ ...data, plantType: t })} options={PREDEFINED_SPECIES} placeholder="Automático..." />

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Observações..." placeholderTextColor="#9CA3AF" value={data.description} onChangeText={(t) => setData({ ...data, description: t })} multiline numberOfLines={3} textAlignVertical="top" />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.scanHeader}>
        <Bluetooth size={48} color={colors.primary} />
        <Text style={styles.scanTitle}>{scanning ? 'Buscando dispositivos...' : 'Dispositivos Encontrados'}</Text>
        <Text style={styles.scanSubtitle}>Certifique-se que o vaso está ligado.</Text>
        {scanning && <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />}
      </View>

      <ScrollView style={styles.deviceList} nestedScrollEnabled>
        {devices.length === 0 && !scanning && <Text style={styles.noDeviceText}>Nenhum dispositivo encontrado.</Text>}
        
        {devices.map((device) => (
          <TouchableOpacity key={device.id} style={[styles.deviceItem, selectedDevice?.id === device.id && styles.deviceItemSelected]} onPress={() => setSelectedDevice(device)}>
            <View style={styles.deviceIcon}><Sprout size={24} color={selectedDevice?.id === device.id ? '#fff' : colors.primary} /></View>
            <View style={{flex: 1}}>
              <Text style={[styles.deviceName, selectedDevice?.id === device.id && styles.deviceNameSelected]}>
                {device.name || 'Dispositivo Desconhecido'}
              </Text>
              <Text style={[styles.deviceMac, selectedDevice?.id === device.id && styles.deviceMacSelected]}>{device.id}</Text>
            </View>
            {selectedDevice?.id === device.id && <View style={styles.checkCircle}><Check size={16} color={colors.primary} /></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!scanning && (
        <TouchableOpacity onPress={startScan} style={styles.rescanBtn}>
          <RefreshCw size={20} color={colors.primary} />
          <Text style={styles.rescanText}> Escanear Novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.connectHeader}>
        <Wifi size={32} color={colors.primary} />
        <Text style={styles.connectTitle}>Conectar ao Wi-Fi</Text>
        <Text style={styles.connectSubtitle}>O vaso precisa de internet para funcionar.</Text>
      </View>

      <View style={styles.wifiListContainer}>
        <View style={styles.wifiHeaderRow}>
          <Text style={styles.label}>Selecione sua Rede (2.4GHz)</Text>
          <TouchableOpacity onPress={scanWifiNetworks} disabled={isWifiScanning}>
              {isWifiScanning ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={16} color={colors.primary} />}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.wifiScrollView} nestedScrollEnabled>
          {wifiList.map((wifi, index) => (
            <TouchableOpacity key={`${wifi.ssid}_${index}`} style={[styles.wifiItem, selectedSsid === wifi.ssid && styles.wifiItemSelected]} onPress={() => setSelectedSsid(wifi.ssid)}>
              <Text style={[styles.wifiText, selectedSsid === wifi.ssid && styles.wifiTextSelected]}>{wifi.ssid}</Text>
              {selectedSsid === wifi.ssid && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedSsid ? (
        <View style={styles.passwordContainer}>
          <Text style={styles.label}>Senha da rede "{selectedSsid}"</Text>
          <View style={styles.inputWithIcon}>
              <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput style={[styles.input, { paddingLeft: 40 }]} placeholder="Senha" placeholderTextColor="#9CA3AF" secureTextEntry value={password} onChangeText={setPassword} />
          </View>
          
          <TouchableOpacity style={[styles.sendCredsButton, (sendingCredentials || credentialsSentSuccess || !password) && styles.buttonDisabled]} onPress={sendCredentialsToDevice} disabled={sendingCredentials || credentialsSentSuccess || !password}>
            {sendingCredentials ? <ActivityIndicator color="#fff" size="small" /> : credentialsSentSuccess ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Check size={18} color="#fff" style={{marginRight: 8}} /><Text style={styles.sendCredsButtonText}>Configurado!</Text></View>
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Send size={18} color="#fff" style={{marginRight: 8}} /><Text style={styles.sendCredsButtonText}>Enviar Dados</Text></View>
            )}
          </TouchableOpacity>
          {statusMessage !== '' && <Text style={{textAlign: 'center', marginTop: 8, color: '#666', fontSize: 12}}>{statusMessage}</Text>}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}><ChevronLeft color="#fff" size={28} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Adicionar Planta</Text>
          <View style={{ width: 28 }} /> 
        </View>
        <View style={styles.stepperContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= i ? styles.stepActive : styles.stepInactive]}>
                <Text style={[styles.stepText, step >= i ? { color: colors.primary } : { color: '#fff' }]}>{i}</Text>
              </View>
              {i < 3 && <View style={[styles.stepLine, step > i && { backgroundColor: '#fff' }]} />}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.contentCard}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.actionButton, ((step === 1 && !data.name) || (step === 2 && !selectedDevice) || (step === 3 && !credentialsSentSuccess)) ? styles.buttonDisabled : {}]}
              disabled={(step === 1 && !data.name) || (step === 2 && !selectedDevice) || (step === 3 && !credentialsSentSuccess)}
              onPress={() => step < 3 ? setStep(step + 1) : handleFinish()}
            >
              <Text style={styles.actionButtonText}>{step === 3 ? 'FINALIZAR' : 'CONTINUAR'}</Text>
            </TouchableOpacity>
            
            {step >= 2 && !credentialsSentSuccess && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Pular Configuração de Conexão</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: { paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50, paddingHorizontal: 24, paddingBottom: 30, backgroundColor: colors.primary },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 4 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  stepActive: { backgroundColor: '#fff' },
  stepInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  stepText: { fontWeight: 'bold', fontSize: 14 },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  contentCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' },
  scrollContent: { padding: 30, paddingBottom: 150 },
  stepContainer: { flex: 1 },
  imageUploadContainer: { alignItems: 'center', marginBottom: 30 },
  imageCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#D9D9D9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#D9D9D9', marginBottom: 12, overflow: 'hidden' },
  uploadedImage: { width: 100, height: 100 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 16, color: '#1F2937' },
  textArea: { height: 100, paddingTop: 16 },
  inputWithIcon: { justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  comboContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16 },
  comboInput: { flex: 1, padding: 16, fontSize: 16, color: '#1F2937' },
  comboIcon: { padding: 16 },
  dropdownList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, maxHeight: 150, elevation: 3 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownText: { fontSize: 14, color: '#374151' },
  scanHeader: { alignItems: 'center', marginBottom: 20 },
  scanTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 10 },
  scanSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 5 },
  deviceList: { maxHeight: 300 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  deviceItemSelected: { backgroundColor: '#ECFDF5', borderColor: colors.primary },
  deviceIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  deviceName: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  deviceNameSelected: { color: colors.primary },
  deviceMac: { fontSize: 12, color: '#9CA3AF' },
  deviceMacSelected: { color: colors.primaryLight },
  noDeviceText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },
  checkCircle: { marginLeft: 'auto', backgroundColor: '#fff', borderRadius: 10, padding: 4 },
  rescanBtn: { flexDirection: 'row', justifyContent:'center', alignItems: 'center', padding: 10, marginTop: 10 },
  rescanText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6 },
  connectHeader: { alignItems: 'center', marginBottom: 20 },
  connectTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  connectSubtitle: { textAlign: 'center', color: '#6B7280', paddingHorizontal: 20 },
  wifiListContainer: { marginBottom: 20 },
  wifiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  wifiScrollView: { maxHeight: 200, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  wifiItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  wifiItemSelected: { backgroundColor: '#ECFDF5' },
  wifiText: { marginLeft: 12, flex: 1, fontSize: 16, color: '#374151' },
  wifiTextSelected: { fontWeight: 'bold', color: colors.primary },
  passwordContainer: { marginTop: 10, marginBottom: 20 },
  sendCredsButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sendCredsButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 },
  footer: { padding: 30, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionButton: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skipButton: { marginTop: 16, alignItems: 'center', padding: 8 },
  skipButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' }
});