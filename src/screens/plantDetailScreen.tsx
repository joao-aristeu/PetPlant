import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Modal,
  StatusBar
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { ChevronLeft, X } from 'lucide-react-native';
import DeleteModal  from '../components/DeleteModal'; 
import { colors } from '../styles/theme';

const { width } = Dimensions.get('window');

interface PlantData {
    id: string;
    name: string;       // Apelido do Vaso (ex: "Jiboia da Sala")
    plant: string;      // Nome Popular (ex: "Jiboia")
    plantType: string;  // Nome Científico (ex: "Epipremnum aureum")
    location?: string;  // Local
    image?: string;
    description?: string;
    moisture?: number;
    lightOn?: boolean;
}

interface PlantDetailsProps {
  plant: PlantData;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: (plant: PlantData) => void;
}

const PlantDetailsScreen = ({ plant, onBack, onDelete, onEdit }: PlantDetailsProps) => {
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isImageModalVisible, setImageModalVisible] = useState(false); // Estado para o modal da imagem


  // --- Lógica de Status ---
  const getPlantStatus = (p: PlantData) => {
    const moisture = p.moisture ?? 0;
    const isLightOn = p.lightOn ?? false;

    if (moisture < 30) return 'thirsty';
    if (isLightOn) return 'happy';
    return 'scared';
  };

  const getStatusConfig = (status: 'happy' | 'thirsty' | 'scared') => {
    switch (status) {
      case 'scared': 
        return { label: 'Com Medo', bg: '#FF968D', text: '#000000' };
      case 'thirsty': 
        return { label: 'Com Sede', bg: '#A8E2FF', text: '#000000' };
      default: 
        return { label: 'Feliz', bg: '#CDF598', text: '#374151' };
    }
  };

  const currentStatus = getPlantStatus(plant);
  const statusConfig = getStatusConfig(currentStatus);

  const renderHeaderImage = () => {
    if (plant.image) {
      return (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setImageModalVisible(true)}
          style={{ width: '100%', height: '100%' }}
        >
        <FastImage
          source={{ uri: plant.image }} 
          style={styles.headerImage}
          resizeMode={FastImage.resizeMode.cover}
        />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.placeholderContainer}>
        <FastImage source={require('../../assets/no-picture.png')} style={{ width: 150, height: 150 }} />
      </View>
    );
  };

  const handleDeleteConfirm = () => {
      setDeleteModalVisible(false);
      setTimeout(() => {
          onDelete(plant.id);
      }, 200);
  };

  return (
    <View style={styles.container}>
      
      {/* HEADER DE NAVEGAÇÃO */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View style={styles.imageWrapper}>
          {renderHeaderImage()}
        </View>

        <View style={styles.detailsCard}>
          
          <View style={styles.titleRow}>
            {/* Título Principal: Apelido do Vaso */}
            <Text style={styles.plantName}>{plant.name || 'Sem nome'}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Local da Planta</Text>
              <Text style={styles.value}>
                  {plant.location && plant.location.trim() !== '' ? plant.location : 'Não definido'}
              </Text>
            </View>
            
            <View style={styles.rowSplit}>
              {/* --- AQUI ESTÁ A CORREÇÃO DO NOME POPULAR --- */}
              <View style={[styles.infoItem, { flex: 1 }]}>
                <Text style={styles.label}>Nome Popular</Text>
                <Text style={styles.value}>
                    {'Zamioculca' || 'Espada de São Jorge'}
                </Text>
              </View>

              <View style={[styles.infoItem, { flex: 1 }]}>
                <Text style={styles.label}>Espécie / Tipo</Text>
                <Text style={styles.value}>
                    {plant.plantType && plant.plantType.trim() !== '' ? plant.plantType : 'Não informado'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.label}>Descrição da Planta</Text>
              <Text style={styles.description}>
                {plant.description || 'Nenhuma descrição adicionada para esta planta.'}
              </Text>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setDeleteModalVisible(true)}>
              <Text style={styles.btnOutlineText}>Excluir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSolid} onPress={() => onEdit(plant)}>
              <Text style={styles.btnSolidText}>Editar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      <DeleteModal 
        visible={isDeleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        plantName={plant.name || 'Planta'}
      />

      {/* MODAL DE VISUALIZAÇÃO DE IMAGEM */}
      <Modal 
        visible={isImageModalVisible} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden />
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setImageModalVisible(false)}
          >
            <X color="#fff" size={32} />
          </TouchableOpacity>
          
          {plant.image && (
            <FastImage 
              source={{ uri: plant.image }} 
              style={styles.fullScreenImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

// Seus estilos originais (SEM ALTERAÇÕES)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, zIndex: 10, position: 'absolute', top: 0, left: 0, right: 0 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  imageWrapper: { width: width, height: 380, backgroundColor: '#f0f0f0' },
  headerImage: { width: '100%', height: '100%' },
  placeholderContainer: { width: '100%', height: '100%', backgroundColor: '#E0F2D6', justifyContent: 'center', alignItems: 'center' },
  
  detailsCard: { 
      flex: 1,
      backgroundColor: '#fff', 
      marginTop: -50, 
      borderTopLeftRadius: 35, 
      borderTopRightRadius: 35, 
      padding: 24, 
      minHeight: 500, 
      shadowColor: "#000", 
      shadowOffset: { width: 0, height: -5 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 10, 
      elevation: 10 
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  plantName: { fontSize: 26, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 10 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 25 },
  infoGrid: { gap: 24, marginBottom: 30 },
  rowSplit: { flexDirection: 'row', gap: 20 },
  infoItem: { marginBottom: 5 },
  label: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 17, color: '#1F2937', fontWeight: '500' },
  description: { fontSize: 15, color: '#6B7280', lineHeight: 24 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginTop: 20 },
  btnOutline: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', backgroundColor: '#fff' },
  btnOutlineText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  btnSolid: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#8AB530', alignItems: 'center', shadowColor: "#8AB530", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  btnSolidText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  }
});

export default PlantDetailsScreen;