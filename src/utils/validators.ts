export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}
export function validateCredentials(
  username: string,
  password: string,
): string | null {
  if (normalizeUsername(username).length < 3)
    return "El usuario debe tener al menos 3 caracteres.";
  if (password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  return null;
}
export function validateProduct(name: string, quantity: string): string | null {
  if (!name.trim()) return "Ingresá el nombre del producto.";
  if (!/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 999)
    return "La cantidad debe ser un entero entre 1 y 999.";
  return null;
}
