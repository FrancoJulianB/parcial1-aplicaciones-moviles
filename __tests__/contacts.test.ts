import * as Contacts from "expo-contacts";
import { loadPhoneContacts } from "../src/services/contacts";

jest.mock("expo-contacts", () => {
  return {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    Contact: { getAllDetails: jest.fn() },
    ContactField: { FULL_NAME: "fullName", PHONES: "phones", EMAILS: "emails" },
  };
});

beforeEach(() => {
  jest.resetAllMocks();
});

test("solicita un permiso pendiente y devuelve solo los datos necesarios de cada contacto", async () => {
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
    canAskAgain: true,
  });
  (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    accessPrivileges: "all",
  });
  (Contacts.Contact.getAllDetails as jest.Mock).mockResolvedValue([
    {
      id: "native-1",
      fullName: " Ana ",
      phones: [{ number: " " }, { number: " 123 " }],
      emails: [{ address: " ana@example.com " }],
      birthday: "privado",
      note: "privado",
    },
  ]);

  await expect(loadPhoneContacts()).resolves.toEqual({
    status: "available",
    limited: false,
    contacts: [
      {
        id: "native-1",
        contact: {
          source: "phone",
          name: "Ana",
          phone: "123",
          email: "ana@example.com",
        },
      },
    ],
  });
  expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Contacts.Contact.getAllDetails).toHaveBeenCalledWith([
    "fullName",
    "phones",
    "emails",
  ]);
});

test("acepta acceso limitado y devuelve solo contactos autorizados", async () => {
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    accessPrivileges: "limited",
  });
  (Contacts.Contact.getAllDetails as jest.Mock).mockResolvedValue([
    { id: "1", fullName: "Luis", phones: [], emails: [] },
  ]);

  await expect(loadPhoneContacts()).resolves.toEqual({
    status: "available",
    limited: true,
    contacts: [{ id: "1", contact: { source: "phone", name: "Luis" } }],
  });
  expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
});

test.each([true, false])(
  "respeta la denegación y canAskAgain=%s sin leer la agenda",
  async (canAskAgain) => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain,
    });
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      canAskAgain,
    });

    await expect(loadPhoneContacts()).resolves.toEqual({
      status: "denied",
      canAskAgain,
    });
    expect(Contacts.Contact.getAllDetails).not.toHaveBeenCalled();
    expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(
      canAskAgain ? 1 : 0,
    );
  },
);

test("maneja agenda vacía y contactos sin nombre", async () => {
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
  });
  (Contacts.Contact.getAllDetails as jest.Mock)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { id: "1", fullName: null, phones: [{ number: "123" }], emails: [] },
    ]);

  await expect(loadPhoneContacts()).resolves.toEqual({
    status: "available",
    limited: false,
    contacts: [],
  });
  await expect(loadPhoneContacts()).resolves.toMatchObject({
    contacts: [{ contact: { name: "123" } }],
  });
});

test("propaga un error de lectura para permitir reintentar", async () => {
  (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
  });
  (Contacts.Contact.getAllDetails as jest.Mock).mockRejectedValue(
    new Error("No disponible"),
  );

  await expect(loadPhoneContacts()).rejects.toThrow("No disponible");
});
