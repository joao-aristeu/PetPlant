import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image } from 'react-native';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { colors } from '../styles/theme';

// Interface compartilhada
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean; // Campo importante
}

interface NotificationsScreenProps {
  notifications: AppNotification[]; 
  onBack: () => void;
  onClearAll?: () => void;
  onMarkAsRead: (id: string) => void; // Nova função
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ 
  notifications, 
  onBack, 
  onClearAll,
  onMarkAsRead
}) => {

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Image 
          source={require('../../assets/no-notification.png')} 
          style={styles.emptyIconImage} 
          resizeMode="contain" 
        />
      </View>
      <Text style={styles.emptyTitle}>Não há Notificações</Text>
      <Text style={styles.emptySubtitle}>Em breve você receberá novas notificações</Text>
    </View>
  );

  const renderItem = ({ item }: { item: AppNotification }) => {
    const dateObj = new Date(item.date);
    const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} às ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    return (
      <TouchableOpacity 
        style={[styles.card, !item.read && styles.unreadCard]} 
        onPress={() => onMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
           <Text style={styles.dateText}>{dateFormatted}</Text>
           {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.cardTitle, !item.read && styles.unreadTitle]}>{item.title}</Text>
        <Text style={styles.cardMessage}>{item.message}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.primary} size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {notifications.length > 0 && onClearAll && (
           <TouchableOpacity onPress={onClearAll} style={{padding: 4}}>
             <Trash2 color={colors.danger} size={24} />
           </TouchableOpacity>
        )}
        {notifications.length === 0 && <View style={{ width: 32 }} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? styles.listEmptyContent : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  backButton: { padding: 5 },
  
  listContent: { paddingBottom: 20 },
  listEmptyContent: { flex: 1, justifyContent: 'center' },

  // Card Item
  card: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff'
  },
  unreadCard: {
    backgroundColor: '#F0FDF4', // Verde bem clarinho para destacar não lidas
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  unreadTitle: { fontWeight: 'bold', color: '#000' },
  cardMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: -50 },
  emptyIconWrapper: { marginBottom: 20, alignItems: 'center' },
  emptyIconImage: { width: 150, height: 150 }, 
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#D1D5DB', textAlign: 'center' }
});