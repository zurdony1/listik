import {
  randomUUID,
} from "crypto";

import {
  createClient,
} from "@supabase/supabase-js";

/*
 * ==========================================
 * VARIABLES
 * ==========================================
 */

const SUPABASE_URL =
  process.env
    .SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el backend.",
  );
}

/*
 * ==========================================
 * CLIENTE SUPABASE
 * ==========================================
 */

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    },
  );

/*
 * ==========================================
 * BUCKET
 * ==========================================
 */

const BUCKET =
  "promotion-images";

/*
 * ==========================================
 * ASEGURAR BUCKET
 * ==========================================
 */

async function ensureBucketExists() {
  const {
    data:
      buckets,

    error:
      listError,
  } =
    await supabase
      .storage
      .listBuckets();

  if (
    listError
  ) {
    console.error(
      "Error consultando buckets:",
      listError,
    );

    throw new Error(
      listError.message,
    );
  }

  const exists =
    buckets?.some(
      (
        bucket,
      ) =>
        bucket.name ===
        BUCKET,
    ) ??
    false;

  /*
   * ========================================
   * CREAR SI NO EXISTE
   * ========================================
   */

  if (
    !exists
  ) {
    console.log(
      `📦 Creando bucket ${BUCKET}...`,
    );

    const {
      error:
        createError,
    } =
      await supabase
        .storage
        .createBucket(
          BUCKET,
          {
            public:
              true,

            fileSizeLimit:
              10 *
              1024 *
              1024,

            allowedMimeTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
            ],
          },
        );

    if (
      createError
    ) {
      console.error(
        "Error creando bucket:",
        createError,
      );

      throw new Error(
        createError.message,
      );
    }

    console.log(
      `✅ Bucket ${BUCKET} creado.`,
    );

    return;
  }

  /*
   * ========================================
   * ASEGURAR QUE SEA PÚBLICO
   * ========================================
   */

  const currentBucket =
    buckets?.find(
      (
        bucket,
      ) =>
        bucket.name ===
        BUCKET,
    );

  if (
    currentBucket &&
    currentBucket.public !==
      true
  ) {
    console.log(
      `🔓 Haciendo público ${BUCKET}...`,
    );

    const {
      error:
        updateError,
    } =
      await supabase
        .storage
        .updateBucket(
          BUCKET,
          {
            public:
              true,

            fileSizeLimit:
              10 *
              1024 *
              1024,

            allowedMimeTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
            ],
          },
        );

    if (
      updateError
    ) {
      console.error(
        "Error actualizando bucket:",
        updateError,
      );

      throw new Error(
        updateError.message,
      );
    }
  }
}

/*
 * ==========================================
 * EXTENSIÓN
 * ==========================================
 */

function getExtension(
  mimeType:
    string,
) {
  switch (
    mimeType
  ) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "webp";
  }
}

/*
 * ==========================================
 * SUBIR IMAGEN
 * ==========================================
 */

export async function uploadPromotionImageToStorage(
  buffer:
    Buffer,

  mimeType:
    string,

  folder =
    "offers",
) {
  /*
   * ========================================
   * VERIFICAR BUCKET
   * ========================================
   */

  await ensureBucketExists();

  /*
   * ========================================
   * GENERAR NOMBRE
   * ========================================
   */

  const extension =
    getExtension(
      mimeType,
    );

  const fileName =
    `${Date.now()}-${randomUUID()}.${extension}`;

  const storagePath =
    `${folder}/${fileName}`;

  console.log(
    "📤 Subiendo imagen:",
    storagePath,
  );

  /*
   * ========================================
   * SUBIR
   * ========================================
   */

  const {
    data:
      uploadData,

    error:
      uploadError,
  } =
    await supabase
      .storage
      .from(
        BUCKET,
      )
      .upload(
        storagePath,
        buffer,
        {
          contentType:
            mimeType,

          cacheControl:
            "3600",

          upsert:
            false,
        },
      );

  if (
    uploadError
  ) {
    console.error(
      "❌ Error subiendo imagen:",
      uploadError,
    );

    throw new Error(
      uploadError.message,
    );
  }

  console.log(
    "✅ Imagen subida:",
    uploadData.path,
  );

  /*
   * ========================================
   * URL PÚBLICA
   * ========================================
   */

  const {
    data:
      publicUrlData,
  } =
    supabase
      .storage
      .from(
        BUCKET,
      )
      .getPublicUrl(
        storagePath,
      );

  const publicUrl =
    publicUrlData
      .publicUrl;

  if (
    !publicUrl
  ) {
    throw new Error(
      "No se pudo obtener la URL pública.",
    );
  }

  console.log(
    "🌐 URL:",
    publicUrl,
  );

  return {
    path:
      storagePath,

    url:
      publicUrl,
  };
}