import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, Wifi, WifiOff, Server, Cpu, Globe, Router } from 'lucide-react-native';
import { colors } from '../styles/theme';

// Interface dos dados da planta vindos da navegação
interface ConnectionScreenProps {
  navigation: any;
  route: {
    params: {
      plant: {
        id: string;
        name: string;
        macAddress?: string; // Se vazio = sem vaso
        ssid?: string;       // Se preenchido = vaso conectado
        ip?: string;         // IP do vaso
      }
    }
  }
}

export const ConnectionDetailsScreen: React.FC<ConnectionScreenProps> = ({ navigation, route }) => {
  const { plant } = route.params;

  // Lógica de Estado:
  // 1. Tem vaso associado? (macAddress existe)
  // 2. O vaso está configurado? (ssid e ip existem)
  const hasSmartPot = !!plant.macAddress;
  const isOnline = hasSmartPot && !!plant.ssid && !!plant.ip;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conexão</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* CARD PRINCIPAL DE STATUS */}
        <View style={styles.statusCard}>
          <View style={[styles.iconContainer, { backgroundColor: isOnline ? '#ECFDF5' : '#F3F4F6' }]}>
            {isOnline ? (
              <Wifi size={40} color={colors.primary} />
            ) : (
              <WifiOff size={40} color="#9CA3AF" />
            )}
          </View>
          <Text style={styles.statusTitle}>
            {isOnline ? 'Conectado ao Wi-Fi' : (hasSmartPot ? 'Vaso Desconectado' : 'Sem Vaso Wi-Fi')}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isOnline 
              ? `O vaso da ${plant.name} está online e enviando dados.` 
              : (hasSmartPot 
                  ? 'O vaso foi vinculado, mas não configuramos o Wi-Fi.' 
                  : 'Esta planta não possui um vaso inteligente vinculado.')}
          </Text>
        </View>

        {/* LISTA DE DETALHES (Só renderiza se tiver um vaso vinculado) */}
        {hasSmartPot && (
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionHeader}>Detalhes Técnicos</Text>

            {/* Rede SSID */}
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Router size={20} color={colors.primary} /></View>
              <View>
                <Text style={styles.detailLabel}>Rede Wi-Fi (SSID)</Text>
                <Text style={styles.detailValue}>{plant.ssid || 'Não Configurado'}</Text>
              </View>
            </View>

            {/* IP Local */}
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Globe size={20} color={colors.primary} /></View>
              <View>
                <Text style={styles.detailLabel}>Endereço IP</Text>
                <Text style={styles.detailValue}>{plant.ip || '---'}</Text>
              </View>
            </View>

            {/* MAC Address */}
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailIcon}><Cpu size={20} color={colors.primary} /></View>
              <View>
                <Text style={styles.detailLabel}>ID do Dispositivo (MAC)</Text>
                <Text style={styles.detailValue}>{plant.macAddress}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Botão de Ação */}
        <TouchableOpacity 
          style={[styles.reconfigButton, !hasSmartPot && { backgroundColor: colors.primary }]} 
          onPress={() => {
             // Redireciona para adicionar/reconfigurar vaso
             navigation.navigate('AddPotScreen', { reconfigure: true });
          }}
        >
          <Text style={styles.reconfigButtonText}>
            {hasSmartPot ? 'Reconfigurar Wi-Fi' : 'Vincular Vaso Agora'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 50, paddingHorizontal: 24, paddingBottom: 24, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backButton: { padding: 4 },
  scrollContent: { padding: 24 },
  
  // Status Card
  statusCard: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 24, elevation: 2 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  statusSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 10 },

  // Details
  detailsContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 2 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 16, marginLeft: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 16, color: '#1F2937', fontWeight: '500' },

  // Button
  reconfigButton: { backgroundColor: '#4B5563', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reconfigButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});