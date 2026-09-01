const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export interface SaveProductCodeInput {
  productId: string;

  presentationId: string;

  storeName: string;

  code: string;
}

export async function saveProductCode(
  input: SaveProductCodeInput,
) {
  const response =
    await fetch(
      `${API_URL}/api/product-codes`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "No se pudo guardar el código del producto.",
    );
  }

  return data;
}