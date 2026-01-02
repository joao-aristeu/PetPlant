import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  plantName: string; // Adicionado para receber o nome
}

const DeleteModal = ({ visible, onCancel, onConfirm, plantName }: DeleteModalProps) => {
  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade" 
      onRequestClose={onCancel} // Isso faz o botão "voltar" do Android fechar a modal
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header com botão de fechar 'X' */}
          <View style={styles.modalHeader}>
            {/* Título dinâmico */}
            <Text style={styles.modalTitle}>Excluir {plantName}</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <X color="#9CA3AF" size={24} />
            </TouchableOpacity>
          </View>

          {/* Imagem Central */}
          <View style={styles.imageContainer}>
             <View style={{alignItems: 'center'}}>
                <Image 
                    source={require('../../assets/dead-plant.png')} 
                    style={{ width: 80, height: 100, resizeMode: 'contain'}}
                />
                <View style={{position: 'absolute', bottom: 0, right: -10, backgroundColor: '#EF4444', borderRadius: 12, padding: 2}}>
                    <X color="#fff" size={16} />
                </View>
             </View>
          </View>

          {/* Mensagem Dinâmica */}
          <Text style={styles.modalMessage}>
            Deseja excluir a <Text style={{fontWeight: 'bold'}}>{plantName}</Text>? Essa ação é irreversível.
          </Text>

          {/* Botões de Ação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnOutline} onPress={onCancel}>
              <Text style={styles.btnOutlineText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSolid} onPress={onConfirm}>
              <Text style={styles.btnSolidText}>Confirmar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    maxWidth: '85%' // Evita que texto longo fique em cima do X
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 15, // Aumentei um pouco
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8CBF4D',
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#8CBF4D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnSolid: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#8CBF4D',
    alignItems: 'center',
  },
  btnSolidText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeleteModal;