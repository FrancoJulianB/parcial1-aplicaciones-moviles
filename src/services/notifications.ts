import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function scheduleShoppingReminder(pending: number) {
  if (Platform.OS === "web")
    throw new Error("Probá las notificaciones en el teléfono.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("compras", {
      name: "Recordatorios de compras",
      importance: Notifications.AndroidImportance.HIGH,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Permití las notificaciones de Expo Go desde los ajustes del teléfono.",
    );
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Recordatorio de compras",
      body: `Tenés ${pending} producto${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"} en tu lista.`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
      channelId: "compras",
    },
  });
}
export async function cancelReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
