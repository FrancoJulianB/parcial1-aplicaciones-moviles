import * as Picker from "expo-image-picker";
import { pickPhoto } from "../src/services/imagePicker";

jest.mock("expo-image-picker", () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const granted = { granted: true, canAskAgain: true, status: "granted" };
const denied = { granted: false, canAskAgain: false, status: "denied" };
const pending = { granted: false, canAskAgain: true, status: "undetermined" };

beforeEach(() => jest.resetAllMocks());

test("solicita un permiso pendiente antes de abrir la cámara", async () => {
  (Picker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue(pending);
  (Picker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue(granted);
  (Picker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "cache.jpg" }] });
  await expect(pickPhoto("camera")).resolves.toEqual({ status: "selected", uri: "cache.jpg" });
  expect(Picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
});

test("no abre la cámara denegada y permite usar la galería", async () => {
  (Picker.getCameraPermissionsAsync as jest.Mock).mockResolvedValue(denied);
  await expect(pickPhoto("camera")).resolves.toEqual({ status: "denied", canAskAgain: false });
  expect(Picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(Picker.launchCameraAsync).not.toHaveBeenCalled();
  (Picker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(granted);
  (Picker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "library.jpg" }] });
  await expect(pickPhoto("library")).resolves.toEqual({ status: "selected", uri: "library.jpg" });
});

test("comprueba el resultado de solicitar permiso de galería y no abre el selector si se rechaza", async () => {
  (Picker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(pending);
  (Picker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ ...denied, canAskAgain: true });
  await expect(pickPhoto("library")).resolves.toEqual({ status: "denied", canAskAgain: true });
  expect(Picker.launchImageLibraryAsync).not.toHaveBeenCalled();
});

test("cancelar devuelve cancelación sin seleccionar otra imagen", async () => {
  (Picker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue(granted);
  (Picker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
  await expect(pickPhoto("library")).resolves.toEqual({ status: "canceled" });
  expect(Picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
});
