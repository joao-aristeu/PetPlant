import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StatusBar,
  Dimensions
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { ChevronLeft, Sprout, MoreVertical, Edit2, Eye, Trash2, Plus, CheckCircle } from 'lucide-react-native'; // Adicionei CheckCircle
import { Pot } from '../services/storageService';
import DeleteModal from '../components/DeleteModal';
import { colors } from '../styles/theme';

const { width } = Dimensions.get('window');

interface PlantListProps {
  pots: Pot[];
  onBack: () => void;
  onSelect: (pot: Pot) => void;
  onDeleteConfirmed: (id: string) => Promise<void> | void; // Aceita Promises agora
  onNavigateAdd: () => void;
}

const PlantListScreen = ({ pots, onBack, onSelect, onDeleteConfirmed, onNavigateAdd }: PlantListProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Controle do Modal de Exclusão
  const [potToDeleteId, setPotToDeleteId] = useState<string | null>(null);
  const [plantNameToDelete, setPlantNameToDelete] = useState<string>(''); // Guardamos o nome separadamente para evitar erros
  
  // Controle da Mensagem de Sucesso
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // --- LÓGICA DE STATUS ---
  const getPlantStatus = (pot: Pot) => {
    if (pot.moisture < 30) return { text: 'Com Sede', color: '#FDBA74', textColor: '#9A3412' };
    if (!pot.lightOn) return { text: 'Com Medo', color: '#FCA5A5', textColor: '#991B1B' };
    return { text: 'Feliz', color: '#CBF3AD', textColor: '#3F621A' };
  };

  // --- LÓGICA DOS MENUS ---
  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleDeleteRequest = (pot: Pot) => {
    setOpenMenuId(null);
    setPlantNameToDelete(pot.name); // Salva o nome antes de deletar
    setPotToDeleteId(pot.id);
  };

  // --- LÓGICA DE CONFIRMAÇÃO (CORREÇÃO DO ERRO) ---
  const handleConfirmDelete = async () => {
    if (!potToDeleteId) return;

    try {
      const id = potToDeleteId;
      
      // 1. Fecha o modal PRIMEIRO para evitar ler dados de uma planta que não existe mais
      setPotToDeleteId(null);

      // 2. Executa a exclusão
      await onDeleteConfirmed(id);

      // 3. Mostra a mensagem de sucesso
      setShowSuccessMessage(true);

      // 4. Esconde a mensagem após 3 segundos
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);

    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };  

  // --- RENDERIZAÇÃO DO ITEM ---
  const renderPlantItem = ({ item }: { item: Pot }) => {
    const status = getPlantStatus(item);
    const isMenuOpen = openMenuId === item.id;

    return (
      <View style={styles.plantCard}>
        <View style={styles.cardImageWrapper}>
          {item.image ? (
            <FastImage source={{ uri: item.image }} style={styles.cardImage} resizeMode={FastImage.resizeMode.cover} />
          ) : (
            <View style={styles.cardPlaceholder}>
               <FastImage source={require('../../assets/no-picture.png')} style={{ width: 60, height: 60 }} />
            </View>
          )}
        </View>

        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={[styles.statusText, { color: status.textColor }]}>{status.text}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuBtn} onPress={() => toggleMenu(item.id)}>
          <View style={styles.iconContainer}>
             <MoreVertical color="#ffffffff" size={18} />
          </View>
        </TouchableOpacity>

        {isMenuOpen && (
          <View style={styles.popupMenu}>
            <TouchableOpacity style={styles.menuOption} onPress={() => console.log("Editar", item.id)}>
              <Edit2 size={16} color="#6DA830" />
              <Text style={styles.menuOptionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => onSelect(item)}>
              <Eye size={16} color="#6DA830" />
              <Text style={styles.menuOptionText}>Visualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => handleDeleteRequest(item)}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image source={require('../../assets/no-plants.png')} style={styles.emptyImage} resizeMode="contain" />
      <Text style={styles.emptyTitle}>Não há plantas cadastradas</Text>
      <Text style={styles.emptySubtitle}>Cadastre uma nova planta pressionando o botão abaixo</Text>
    </View>
  );

  return (
    <View style={styles.container}>
       <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lista de Plantas</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* MENSAGEM DE SUCESSO (TOAST) */}
      {showSuccessMessage && (
        <View style={styles.successToast}>
          <View style={styles.successIconBg}>
             <CheckCircle size={20} color="#fff" fill="#22C55E" />
          </View>
          <Text style={styles.successText}>A planta foi removida com sucesso.</Text>
        </View>
      )}

      {/* Conteúdo Principal */}
      {pots.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={{flex: 1}}>
             <Text style={styles.listSubtitle}>Confira as suas plantinhas ou adicione novas.</Text>
             <FlatList
               data={pots}
               keyExtractor={item => item.id}
               renderItem={renderPlantItem}
               contentContainerStyle={styles.listContent}
             />
        </View>
      )}

       <TouchableOpacity style={styles.fab} onPress={onNavigateAdd}>
         <Plus color="#fff" size={30} />
       </TouchableOpacity>

      {/* MODAL DE EXCLUSÃO */}
      <DeleteModal
        visible={!!potToDeleteId}
        onCancel={() => setPotToDeleteId(null)}
        onConfirm={handleConfirmDelete} // Usamos a nova função aqui
        plantName={plantNameToDelete || 'Planta'} // Usamos o estado salvo do nome
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  
  // --- ESTILOS DO TOAST DE SUCESSO ---
  successToast: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#ECFDF5', // Fundo verde bem claro
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successIconBg: {
    marginRight: 12,
  },
  successText: {
    fontSize: 14,
    color: '#065F46', // Verde escuro para o texto
    fontWeight: '600',
  },

  listSubtitle: { textAlign: 'center', color: '#6B7280', marginBottom: 20, marginTop: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  // Estilos do Card
  plantCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, position: 'relative' },
  cardImageWrapper: { width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E0F2D6', justifyContent: 'center', alignItems: 'center' },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  menuBtn: { padding: 4 },
  iconContainer: {
    width: 24,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  popupMenu: { position: 'absolute', right: 10, top: 50, backgroundColor: '#fff', borderRadius: 8, padding: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, zIndex: 20 },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  menuOptionText: { marginLeft: 10, fontSize: 14, color: colors.primary, fontWeight: '500' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: -50 },
  emptyImage: { width: 250, height: 250, marginBottom: 24, opacity: 0.8 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#8AB530', justifyContent: 'center', alignItems: 'center', elevation: 5 },
});

export default PlantListScreen;