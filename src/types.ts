export type Product = {
  id: string;
  name: string;
  quantity: number;
  bought: boolean;
  photo?: string;
};
export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Home: undefined;
  Alta: undefined;
  Detalle: { id: string };
};
