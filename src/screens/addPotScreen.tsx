import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  ScrollView, 
  StatusBar, 
  Dimensions, 
  Alert,
  TextInput,
  Platform,
  PermissionsAndroid,
  KeyboardAvoidingView,
} from 'react-native';
import { 
  ChevronLeft, 
  Camera, 
  Bluetooth, 
  Wifi, 
  Check, 
  Sprout,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
  Send
} from 'lucide-react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { colors } from '../styles/theme';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import WifiManager from 'react-native-wifi-reborn';
import { Buffer } from 'buffer'; 

const { width } = Dimensions.get('window');

// --- CONFIGURAÇÕES DO ESP32 ---
const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHAR_UUID    = "abcd1234-5678-90ab-cdef-1234567890ab";

const bleManager = new BleManager();

const toBase64 = (text: string) => Buffer.from(text).toString('base64');
const fromBase64 = (base64: string) => Buffer.from(base64, 'base64').toString('utf-8');

// --- DATABASE DE PLANTAS (Nome Popular -> Espécie Técnica) ---
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

// Componente Combo (Dropdown editável)
const EditableSelect = ({ label, value, onChangeText, options, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = (item: string) => { 
    onChangeText(item); // Chama a função pai para atualizar o estado
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
        <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
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
  onComplete: (data: { 
    name: string; 
    plant: string;
    plantType: string; 
    macAddress: string; 
    image?: string; 
    description?: string;
    ssid?: string;
    ip?: string;
  }) => void;
}

export const AddPotScreen: React.FC<AddPotProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ 
    name: '', 
    plant: '',      // Nome Popular (ex: Jiboia)
    plantType: '',  // Espécie (ex: Epipremnum aureum)
    location: '', 
    description: '', 
    image: null as string | null 
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

  // --- LÓGICA PRINCIPAL: Preenchimento Automático ---
  const handlePlantNameChange = (text: string) => {
    // 1. Procura se existe uma espécie técnica para o nome digitado/selecionado
    const correspondingSpecies = PLANT_DATABASE[text];
    
    setData(prev => ({
      ...prev,
      plant: text, // Atualiza o campo "Selecionar a Planta"
      // 2. Se encontrou a espécie no banco, preenche o campo "Espécie".
      //    Se não encontrou, mantém o que o usuário já tinha ou deixa vazio.
      plantType: correspondingSpecies ? correspondingSpecies : prev.plantType
    }));
  };

  // --- 1. PERMISSÕES ---
  const requestBlePermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return result['android.permission.BLUETOOTH_CONNECT'] === 'granted';
    }
    return true;
  };

  // --- 2. SCAN BLE ---
  const startScan = useCallback(async () => {
    const hasPerm = await requestBlePermissions();
    if (!hasPerm) { Alert.alert('Permissão', 'Necessário Bluetooth'); return; }
    setScanning(true); setDevices([]);
    
    bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (device && device.name) {
        setDevices(prev => (!prev.find(d => d.id === device.id) ? [...prev, device] : prev));
      }
    });
    setTimeout(() => { bleManager.stopDeviceScan(); setScanning(false); }, 10000);
  }, []);

  useEffect(() => { if (step === 2) startScan(); return () => bleManager.stopDeviceScan(); }, [step, startScan]);

  // --- 3. SCAN WIFI ---
  const scanWifiNetworks = async () => {
    setIsWifiScanning(true);
    try {
      if (Platform.OS === 'android') await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const list = await WifiManager.loadWifiList();
      const unique = Array.from(new Set(list.filter(w=>w.SSID).map(w=>w.SSID))).map(ssid=>({ssid}));
      setWifiList(unique as any[]);
    } catch (e) { console.log(e); } finally { setIsWifiScanning(false); }
  };
  useEffect(() => { if (step === 3) scanWifiNetworks(); }, [step]);

  // --- 4. ENVIAR CREDENCIAIS E CAPTURAR IP ---
  const sendCredentialsToDevice = async () => {
    if (!selectedDevice || !selectedSsid || !password) return;
    setSendingCredentials(true);
    setStatusMessage("Conectando ao vaso...");

    try {
      const connectedDevice = await selectedDevice.connect().then(d => d.discoverAllServicesAndCharacteristics());
      setStatusMessage("Enviando credenciais...");

      const jsonData = JSON.stringify({ ssid: selectedSsid, password: password });
      await connectedDevice.writeCharacteristicWithResponseForService(SERVICE_UUID, CHAR_UUID, toBase64(jsonData));

      setStatusMessage("Aguardando confirmação...");
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const readChar = await connectedDevice.readCharacteristicForService(SERVICE_UUID, CHAR_UUID);
          const responseJson = JSON.parse(fromBase64(readChar.value || ''));

          if (responseJson.status === 'success') {
            clearInterval(pollInterval);
            setConnectionInfo({ ip: responseJson.ip, ssid: selectedSsid });
            setCredentialsSentSuccess(true);
            setSendingCredentials(false);
            setStatusMessage("Conectado com sucesso!");
            Alert.alert("Sucesso", `Vaso conectado! IP: ${responseJson.ip}`);
          } 
          else if (responseJson.status === 'error' || attempts > 30) {
            clearInterval(pollInterval);
            throw new Error("Falha ou Tempo esgotado.");
          }
        } catch (e: any) {
           if(e.message.includes("disconnect") || attempts > 30) {
             clearInterval(pollInterval); setSendingCredentials(false); setStatusMessage("Erro de conexão.");
           }
        }
      }, 2000);
    } catch (error: any) {
      setSendingCredentials(false);
      setStatusMessage("Falha ao conectar.");
      Alert.alert("Erro", error.message);
    }
  };

 const handleFinish = () => {
  onComplete({ 
    name: data.name,
    plant: data.plant, // Nome popular
    plantType: data.plantType, // Espécie
    location: data.location, // <--- ADICIONE ESTA LINHA
    image: data.image,
    description: data.description,
    macAddress: selectedDevice?.id || '',
    ip: connectionInfo.ip,
    ssid: connectionInfo.ssid
  });
};

const handleSkip = () => {
  onComplete({ 
    name: data.name,
    plant: data.plant,
    plantType: data.plantType,
    location: data.location, // <--- ADICIONE ESTA LINHA TAMBÉM
    image: data.image,
    description: data.description,
    macAddress: '',
    ip: '',
    ssid: ''
  });
};
  const handleImagePick = async (type: 'camera' | 'gallery') => {
      if (type === 'camera' && Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Permissão de Câmera",
              message: "O App precisa de acesso à câmera para tirar fotos.",
              buttonNeutral: "Perguntar depois",
              buttonNegative: "Cancelar",
              buttonPositive: "OK"
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert("Permissão Negada", "Você precisa permitir o acesso à câmera para tirar fotos.");
            return;
          }
        } catch (err) {
          console.warn(err);
          return;
        }
      }

      const fn = type === 'camera' ? launchCamera : launchImageLibrary;
      
      try {
        const result = await fn({ 
            mediaType: 'photo', 
            quality: 0.7, 
            selectionLimit: 1,
            saveToPhotos: false 
        });

        if (result.didCancel) return;
        if (result.errorCode) {
            Alert.alert('Erro', result.errorMessage || 'Erro ao abrir câmera');
            return;
        }
        if (result.assets?.[0]?.uri) {
            setData(prev => ({ ...prev, image: result.assets![0].uri || null }));
        }
      } catch (error) {
          console.error("Erro no picker:", error);
      }
  };

  // --- RENDER STEP 1 ---
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.imageUploadContainer}>
        <TouchableOpacity style={styles.imageCircle} onPress={() => Alert.alert("Foto", "Origem:", [{text:"Câmera", onPress:()=>handleImagePick('camera')}, {text:"Galeria", onPress:()=>handleImagePick('gallery')}])}>
          {data.image ? <Image source={{ uri: data.image }} style={styles.uploadedImage} /> : <Camera size={40} color={colors.white} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPhotoButton} onPress={() => Alert.alert("Foto", "Origem:", [{text:"Câmera", onPress:()=>handleImagePick('camera')}, {text:"Galeria", onPress:()=>handleImagePick('gallery')}])}>
            <Text style={styles.addPhotoButtonText}>Inserir Foto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nome do vaso</Text>
        <TextInput style={styles.input} placeholder="Insira o nome do vaso" placeholderTextColor="#9CA3AF" value={data.name} onChangeText={(t) => setData({ ...data, name: t })} />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Local da Planta</Text>
        <TextInput style={styles.input} placeholder="Ex: na Varanda" placeholderTextColor="#9CA3AF" value={data.location} onChangeText={(t) => setData({ ...data, location: t })} />
      </View>
      
      {/* CAMPO 1: Selecionar Planta (Nome Popular) 
        Ao mudar este campo, dispara 'handlePlantNameChange' que preenche o campo abaixo.
      */}
      <EditableSelect 
        label="Selecionar nome popular da planta" 
        value={data.plant} 
        onChangeText={handlePlantNameChange} 
        options={PREDEFINED_NAMES} 
        placeholder="Selecione ou digite..." 
      />
      
      {/* CAMPO 2: Espécie da Planta (Detalhes Técnicos)
        Este campo recebe automaticamente o valor da espécie baseado no campo acima.
      */}
      <EditableSelect 
        label="Espécie da Planta" 
        value={data.plantType} 
        onChangeText={(t: string) => setData({ ...data, plantType: t })} 
        options={PREDEFINED_SPECIES} 
        placeholder="Preenchimento automático..." 
      />

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Descrição da Planta</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Insira uma breve descrição" placeholderTextColor="#9CA3AF" value={data.description} onChangeText={(t) => setData({ ...data, description: t })} multiline numberOfLines={4} textAlignVertical="top" />
      </View>
    </View>
  );

  // --- RENDER STEP 2 e 3 (Mantidos iguais) ---
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.scanHeader}>
        <Bluetooth size={48} color={colors.primary} />
        <Text style={styles.scanTitle}>{scanning ? 'Procurando Vasos...' : 'Dispositivos Encontrados'}</Text>
        <Text style={styles.scanSubtitle}>Selecione seu vaso inteligente na lista abaixo.</Text>
        {scanning && <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />}
      </View>
      <ScrollView style={styles.deviceList} nestedScrollEnabled>
        {devices.length === 0 && !scanning && <Text style={styles.noDeviceText}>Nenhum dispositivo encontrado.</Text>}
        {devices.map((device) => (
          <TouchableOpacity key={device.id} style={[styles.deviceItem, selectedDevice?.id === device.id && styles.deviceItemSelected]} onPress={() => setSelectedDevice(device)}>
            <View style={styles.deviceIcon}><Sprout size={24} color={selectedDevice?.id === device.id ? '#fff' : colors.primary} /></View>
            <View>
              <Text style={[styles.deviceName, selectedDevice?.id === device.id && styles.deviceNameSelected]}>{device.name || 'Vaso Sem Nome'}</Text>
              <Text style={[styles.deviceMac, selectedDevice?.id === device.id && styles.deviceMacSelected]}>{device.id}</Text>
            </View>
            {selectedDevice?.id === device.id && <View style={styles.checkCircle}><Check size={16} color={colors.primary} /></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {!scanning && <TouchableOpacity onPress={startScan} style={styles.rescanBtn}><Text style={styles.rescanText}>Escanear Novamente</Text></TouchableOpacity>}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.connectHeader}>
        <View style={styles.iconRow}><Wifi size={32} color={colors.primary} /></View>
        <Text style={styles.connectTitle}>Configurar Wi-Fi do Vaso</Text>
        <Text style={styles.connectSubtitle}>Selecione a rede e insira a senha.</Text>
      </View>
      <View style={styles.wifiListContainer}>
        <View style={styles.wifiHeaderRow}>
          <Text style={styles.label}>Redes Disponíveis</Text>
          <TouchableOpacity onPress={scanWifiNetworks} disabled={isWifiScanning}>
              {isWifiScanning ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={16} color={colors.primary} />}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.wifiScrollView} nestedScrollEnabled>
          {wifiList.map((wifi, index) => (
            <TouchableOpacity key={`${wifi.ssid}_${index}`} style={[styles.wifiItem, selectedSsid === wifi.ssid && styles.wifiItemSelected]} onPress={() => setSelectedSsid(wifi.ssid)}>
              <Wifi size={20} color={selectedSsid === wifi.ssid ? colors.primary : '#9CA3AF'} />
              <Text style={[styles.wifiText, selectedSsid === wifi.ssid && styles.wifiTextSelected]}>{wifi.ssid}</Text>
              {selectedSsid === wifi.ssid && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {selectedSsid ? (
        <View style={styles.passwordContainer}>
          <Text style={styles.label}>Senha para "{selectedSsid}"</Text>
          <View style={styles.inputWithIcon}>
              <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput style={[styles.input, { paddingLeft: 40 }]} placeholder="Senha do Wi-Fi" placeholderTextColor="#9CA3AF" secureTextEntry value={password} onChangeText={setPassword} />
          </View>
          <TouchableOpacity style={[styles.sendCredsButton, (sendingCredentials || credentialsSentSuccess || !password) && styles.buttonDisabled]} onPress={sendCredentialsToDevice} disabled={sendingCredentials || credentialsSentSuccess || !password}>
            {sendingCredentials ? <ActivityIndicator color="#fff" size="small" /> : credentialsSentSuccess ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Check size={18} color="#fff" style={{marginRight: 8}} /><Text style={styles.sendCredsButtonText}>Configurado!</Text></View>
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Send size={18} color="#fff" style={{marginRight: 8}} /><Text style={styles.sendCredsButtonText}>Enviar para o Vaso</Text></View>
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
          <Text style={styles.headerTitle}>Nova Planta</Text>
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
              <Text style={styles.actionButtonText}>{step === 3 ? 'FINALIZAR CADASTRO' : 'CONTINUAR'}</Text>
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
  addPhotoButton: { backgroundColor: '#8AB530', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  addPhotoButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
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
  rescanBtn: { alignItems: 'center', padding: 10 },
  rescanText: { color: colors.primary, fontWeight: 'bold' },
  connectHeader: { alignItems: 'center', marginBottom: 20 },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
  sendCredsButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sendCredsButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10 },
  actionButton: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 30, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 12 },
  buttonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  skipButton: { alignItems: 'center', paddingVertical: 10 },
  skipButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }
});