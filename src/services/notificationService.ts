import notifee, { AndroidImportance } from '@notifee/react-native';

export async function displaySystemNotification(title: string, body: string) {
  // Solicita permissão (necessário para Android 13+)
  await notifee.requestPermission();

  // Cria um canal (necessário para Android)
  const channelId = await notifee.createChannel({
    id: 'plant-alert',
    name: 'Alertas da Planta',
    importance: AndroidImportance.HIGH,
  });

  // Exibe a notificação
  await notifee.displayNotification({
    title: title,
    body: body,
    android: {
      channelId,
      smallIcon: 'ic_launcher', // certifique-se que existe um icone ou use 'ic_small_icon' se configurou
      pressAction: {
        id: 'default',
      },
    },
  });
}