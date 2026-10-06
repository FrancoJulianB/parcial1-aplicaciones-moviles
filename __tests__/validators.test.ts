import { validateProduct, validateCredentials } from "../src/utils/validators";
test("rechaza nombres vacíos y cantidades inválidas", () => {
  expect(validateProduct("   ", "1")).not.toBeNull();
  for (const quantity of ["0", "-1", "1.5", "abc", "1000"])
    expect(validateProduct("Pan", quantity)).not.toBeNull();
});
test("acepta un producto y cantidad válidos", () => {
  expect(validateProduct("Pan", "2")).toBeNull();
});
test("valida los campos de autenticación", () => {
  expect(validateCredentials("ab", "123456")).not.toBeNull();
  expect(validateCredentials("franco", "123")).not.toBeNull();
  expect(validateCredentials("franco", "123456")).toBeNull();
});
