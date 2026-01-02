import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  StatusBar,
  SafeAreaView, // 1. Importado
  Platform      // 2. Importado
} from 'react-native';
import { ChevronLeft, Wifi, WifiOff, Globe, Cpu, Router } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { Pot } from '../services/storageService';

interface ConnectionsScreenProps {
  pots: Pot[];
  onBack: () => void;
}

export const ConnectionsScreen: React.FC<ConnectionsScreenProps> = ({ pots, onBack }) => {

  return (
    // 3. Trocamos View por SafeAreaView para respeitar as margens do iPhone (notch)
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.primary} size={30} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conexões dos Vasos</Text>
        <View style={{ width: 30 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Status da rede Wi-Fi dos seus vasos inteligentes.
        </Text>

        {pots.length === 0 ? (
           <View style={styles.emptyContainer}>
             <Text style={styles.emptyText}>Você ainda não adicionou nenhuma planta.</Text>
           </View>
        ) : (
          <View style={styles.deviceList}>
            {pots.map((pot) => {
                const isConnected = !!pot.ssid && !!pot.ip;
                
                return (
                  <View key={pot.id} style={[styles.card, isConnected ? styles.cardConnected : styles.cardDisconnected]}>
                      
                      <View style={styles.cardHeader}>
                          <Image 
                              source={require('../../assets/no-picture.png')} 
                              style={styles.deviceImage} 
                              resizeMode="cover"
                          />
                          <View style={styles.headerInfo}>
                              <Text style={styles.deviceName}>{pot.name}</Text>
                              <Text style={styles.plantType}>{pot.plantType}</Text>
                              
                              <View style={[styles.statusBadge, { backgroundColor: isConnected ? '#dcfce7' : '#fee2e2' }]}>
                                  {isConnected ? <Wifi size={12} color="#166534" style={{marginRight:4}}/> : <WifiOff size={12} color="#991b1b" style={{marginRight:4}}/>}
                                  <Text style={[styles.statusText, { color: isConnected ? '#166534' : '#991b1b' }]}>
                                      {isConnected ? 'Wi-Fi Conectado' : 'Sem Conexão'}
                                  </Text>
                              </View>
                          </View>
                      </View>

                      {isConnected && (
                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Router size={16} color={colors.primary} style={styles.detailIcon} />
                                <Text style={styles.detailLabel}>Rede:</Text>
                                <Text style={styles.detailValue}>{pot.ssid}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Globe size={16} color={colors.primary} style={styles.detailIcon} />
                                <Text style={styles.detailLabel}>IP:</Text>
                                <Text style={styles.detailValue}>{pot.ip}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Cpu size={16} color={colors.primary} style={styles.detailIcon} />
                                <Text style={styles.detailLabel}>MAC:</Text>
                                <Text style={styles.detailValue}>{pot.macAddress || 'N/A'}</Text>
                            </View>
                        </View>
                      )}

                      {!isConnected && (
                        <View style={styles.offlineContainer}>
                            <Text style={styles.offlineText}>Este vaso não possui dados de Wi-Fi configurados.</Text>
                        </View>
                      )}
                  </View>
                );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    // 4. Correção crítica para Android: Soma a altura da barra de status ao padding
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // Removi o paddingTop fixo de 15, pois o SafeAreaView/StatusBar height já cuida disso
    paddingVertical: 15, 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  backButton: { padding: 5 },
  content: { padding: 24 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },

  deviceList: { gap: 20 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardConnected: { borderColor: colors.primary },
  cardDisconnected: { borderColor: '#E5E7EB' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deviceImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee' },
  headerInfo: { marginLeft: 16, flex: 1 },
  deviceName: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  plantType: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },

  detailsContainer: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { marginRight: 8 },
  detailLabel: { fontSize: 14, color: '#6B7280', width: 50, fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#1F2937', fontWeight: 'bold', flex: 1 },

  offlineContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  offlineText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }
});