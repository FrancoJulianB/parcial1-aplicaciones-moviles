import * as Contacts from "expo-contacts";
import { ProductContact } from "../types";

export type ContactChoice = {
  id: string;
  contact: ProductContact;
};

export type ContactsResult =
  | { status: "available"; limited: boolean; contacts: ContactChoice[] }
  | { status: "denied"; canAskAgain: boolean };

export async function loadPhoneContacts(): Promise<ContactsResult> {
  let permission = await Contacts.getPermissionsAsync();

  if (
    !permission.granted &&
    permission.accessPrivileges !== "limited" &&
    permission.canAskAgain
  ) {
    permission = await Contacts.requestPermissionsAsync();
  }

  if (
    (!permission.granted && permission.accessPrivileges !== "limited") ||
    permission.accessPrivileges === "none"
  ) {
    return { status: "denied", canAskAgain: permission.canAskAgain };
  }

  const contacts = await Contacts.Contact.getAllDetails([
    Contacts.ContactField.FULL_NAME,
    Contacts.ContactField.PHONES,
    Contacts.ContactField.EMAILS,
  ]);

  return {
    status: "available",
    limited: permission.accessPrivileges === "limited",
    contacts: contacts.map((item) => {
      const phone = item.phones
        ?.find((entry) => {
          return Boolean(entry.number?.trim());
        })
        ?.number?.trim();
      const email = item.emails
        ?.find((entry) => {
          return Boolean(entry.address?.trim());
        })
        ?.address?.trim();

      return {
        id: item.id,
        contact: {
          source: "phone",
          name: item.fullName?.trim() || phone || email || "Sin nombre",
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
        },
      };
    }),
  };
}
