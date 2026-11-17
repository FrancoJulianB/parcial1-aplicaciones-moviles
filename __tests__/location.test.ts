import * as Location from "expo-location";
import { currentShopLocation } from "../src/services/location";

jest.mock("expo-location", () => {
  return {
    getForegroundPermissionsAsync: jest.fn(),
    requestForegroundPermissionsAsync: jest.fn(),
    hasServicesEnabledAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    Accuracy: { Balanced: 3 },
  };
});

beforeEach(() => {
  jest.resetAllMocks();
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
  });
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
});

test("solicita el permiso pendiente y devuelve coordenadas GPS", async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: -34.5, longitude: -58.4 },
  });
  await expect(currentShopLocation()).resolves.toEqual({
    status: "granted",
    location: { source: "gps", latitude: -34.5, longitude: -58.4 },
  });
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
});

test("respeta la denegación definitiva sin acceder al GPS", async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: false,
  });
  await expect(currentShopLocation()).resolves.toEqual({
    status: "denied",
    canAskAgain: false,
  });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test("comprueba el permiso después de solicitarlo", async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  await expect(currentShopLocation()).resolves.toEqual({
    status: "denied",
    canAskAgain: true,
  });
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test("detecta servicios desactivados y errores de GPS", async () => {
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValueOnce(false);
  await expect(currentShopLocation()).resolves.toEqual({
    status: "unavailable",
  });
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(
    new Error("GPS"),
  );
  await expect(currentShopLocation()).resolves.toEqual({
    status: "unavailable",
  });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test("limita la espera y permite reintentar sin guardar un resultado tardío", async () => {
  jest.useFakeTimers();

  try {
    (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(
      new Promise(() => {
      }),
    );

    const result = currentShopLocation();

    await jest.advanceTimersByTimeAsync(15000);
    await expect(result).resolves.toEqual({ status: "unavailable" });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 1, longitude: 2 },
    });
    await expect(currentShopLocation()).resolves.toMatchObject({
      status: "granted",
    });
  } finally {
    jest.useRealTimers();
  }
});
