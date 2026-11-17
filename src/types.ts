export type ShopLocation =
  | { source: "gps"; latitude: number; longitude: number }
  | { source: "manual"; address: string };

export type Product = {
  id: string;
  name: string;
  quantity: number;
  bought: boolean;
  photo?: string;
  location?: ShopLocation;
};

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Home: undefined;
  Alta: undefined;
  Detalle: { id: string };
};
