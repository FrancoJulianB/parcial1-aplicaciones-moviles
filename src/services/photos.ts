import { Directory, File, Paths } from "expo-file-system";

function directory() {
  return new Directory(Paths.document, "product-photos");
}

export function photoUri(filename: string) {
  return new File(directory(), filename).uri;
}

export function removePhoto(filename: string) {
  const file = new File(directory(), filename);
  if (file.exists) file.delete();
}

export function savePhoto(uri: string) {
  const folder = directory();
  folder.create({ idempotent: true, intermediates: true });
  const extension = new File(uri).extension.toLowerCase();
  const suffix = /^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg";
  const filename = Date.now() + "-" + Math.random().toString(36).slice(2) + suffix;
  try {
    new File(uri).copy(new File(folder, filename));
  } catch (error) {
    try { removePhoto(filename); } catch {}
    throw error;
  }
  return filename;
}
