export type ShopLocation =
  | { source: "gps"; latitude: number; longitude: number }
  | { source: "manual"; address: string };

export type ProductContact = {
  source: "phone" | "manual";
  name: string;
  phone?: string;
  email?: string;
};

export type ProductCalendarEvent = {
  id: string;
  calendarId: string;
  calendarTitle: string;
  startDate: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  quantity: number;
  bought: boolean;
  photo?: string;
  location?: ShopLocation;
  contact?: ProductContact;
  calendarEvent?: ProductCalendarEvent;
};

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Home: undefined;
  Alta: undefined;
  Detalle: { id: string };
};
