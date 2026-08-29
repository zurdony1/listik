const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData =
    options.body instanceof FormData;

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        ...(!isFormData
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        ...(options.headers ?? {}),
      },
    },
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === "object" &&
      "error" in data
        ? String(
            (
              data as {
                error?: unknown;
              }
            ).error,
          )
        : `Error API ${response.status}`;

    throw new Error(errorMessage);
  }

  return data as T;
}