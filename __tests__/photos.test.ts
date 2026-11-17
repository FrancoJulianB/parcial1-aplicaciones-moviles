import { savePhoto, photoUri, removePhoto } from "../src/services/photos";
import { File, Directory } from "expo-file-system";

jest.mock("expo-file-system", () => {
  const copy = jest.fn();
  const remove = jest.fn();
  const create = jest.fn();
  return {
    Paths: { document: "file:///documents" },
    Directory: class {
      uri: string;
      constructor(parent: string, name: string) { this.uri = parent + "/" + name; }
      create = create;
    },
    File: class {
      uri: string;
      extension = ".heic";
      exists = true;
      constructor(parent: string | { uri: string }, name?: string) {
        this.uri = (typeof parent === "string" ? parent : parent.uri) + (name ? "/" + name : "");
      }
      copy = copy;
      delete = remove;
    },
  };
});

beforeEach(() => jest.clearAllMocks());

test("copia desde caché a documentos y reconstruye la URI desde el nombre persistido", () => {
  const filename = savePhoto("file:///cache/photo.heic");
  expect(filename).toMatch(/\.heic$/);
  const destination = (new File("unused").copy as jest.Mock).mock.calls[0][0];
  expect(destination.uri).toBe("file:///documents/product-photos/" + filename);
  expect(new Directory("unused", "unused").create).toHaveBeenCalledWith({
    idempotent: true, intermediates: true,
  });
  expect(photoUri(filename)).toBe(destination.uri);
  removePhoto(filename);
  expect(new File("unused").delete).toHaveBeenCalledTimes(1);
});

test("limpia una copia incompleta y propaga el error de almacenamiento", () => {
  (new File("unused").copy as jest.Mock).mockImplementationOnce(() => { throw new Error("Sin espacio"); });
  expect(() => savePhoto("file:///cache/photo.heic")).toThrow("Sin espacio");
  expect(new File("unused").delete).toHaveBeenCalledTimes(1);
});
