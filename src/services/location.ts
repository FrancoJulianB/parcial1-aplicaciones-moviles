import * as Location from "expo-location";
import { ShopLocation } from "../types";

export type LocationResult =
  | { status: "granted"; location: ShopLocation }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "unavailable" };

export async function currentShopLocation(): Promise<LocationResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    let permission = await Location.getForegroundPermissionsAsync();

    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      return { status: "denied", canAskAgain: permission.canAskAgain };
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      return { status: "unavailable" };
    }

    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          return reject(new Error("Tiempo agotado"));
        }, 15000);
      }),
    ]);
    const { latitude, longitude } = position.coords;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { status: "unavailable" };
    }

    return {
      status: "granted",
      location: { source: "gps", latitude, longitude },
    };
  } catch {
    return { status: "unavailable" };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
