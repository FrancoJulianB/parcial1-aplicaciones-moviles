import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "library";
export type PickPhotoResult =
  | { status: "denied"; canAskAgain: boolean }
  | { status: "canceled" }
  | { status: "selected"; uri: string };

export async function pickPhoto(source: PhotoSource): Promise<PickPhotoResult> {
  const camera = source === "camera";
  let permission = camera
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (!permission.granted) {
    return { status: "denied", canAskAgain: permission.canAskAgain };
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.8,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return { status: "canceled" };
  return { status: "selected", uri: result.assets[0].uri };
}
