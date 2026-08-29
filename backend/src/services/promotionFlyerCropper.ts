import sharp from "sharp";

export interface PromotionCropResult {
  segmentIndex: number;

  buffer: Buffer;

  width: number;

  height: number;
}

export async function cropPromotionSegments(
  sourceBuffer:
    Buffer,

  segmentIndexes:
    number[],

  totalSegments?:
    number,
) {
  const indexes =
    [...new Set(
      segmentIndexes,
    )]
      .filter(
        (
          value,
        ) =>
          Number.isInteger(
            value,
          ) &&
          value >=
            0,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a -
          b,
      );

  if (
    indexes.length ===
    0
  ) {
    return [] as
      PromotionCropResult[];
  }

  const metadata =
    await sharp(
      sourceBuffer,
      {
        failOn:
          "none",
      },
    )
      .rotate()
      .metadata();

  const width =
    metadata.width ??
    0;

  const height =
    metadata.height ??
    0;

  if (
    width <=
      0 ||
    height <=
      0
  ) {
    throw new Error(
      "No se pudieron leer las dimensiones del folleto.",
    );
  }

  const inferredSegments =
    Math.max(
      ...indexes,
    ) +
    1;

  const segmentCount =
    Math.max(
      1,
      totalSegments ??
        inferredSegments,
    );

  const baseWidth =
    width /
    segmentCount;

  const top =
    Math.max(
      0,
      Math.round(
        height *
        0.03,
      ),
    );

  const visualBottom =
    Math.min(
      height,
      Math.round(
        height *
        0.55,
      ),
    );

  const cropHeight =
    Math.max(
      1,
      visualBottom -
      top,
    );

  const results:
    PromotionCropResult[] =
    [];

  for (
    const segmentIndex
    of indexes
  ) {
    const rawLeft =
      Math.round(
        segmentIndex *
        baseWidth,
      );

    const rawRight =
      segmentIndex ===
      segmentCount -
        1
        ? width
        : Math.round(
            (
              segmentIndex +
              1
            ) *
            baseWidth,
          );

    const rawWidth =
      Math.max(
        1,
        rawRight -
        rawLeft,
      );

    const marginX =
      Math.max(
        2,
        Math.round(
          rawWidth *
          0.07,
        ),
      );

    const left =
      Math.min(
        width -
          1,
        rawLeft +
          marginX,
      );

    const extractWidth =
      Math.max(
        1,
        Math.min(
          width -
            left,
          rawWidth -
            marginX *
            2,
        ),
      );

    const cropped =
      await sharp(
        sourceBuffer,
        {
          failOn:
            "none",
        },
      )
        .rotate()
        .extract({
          left,

          top,

          width:
            extractWidth,

          height:
            cropHeight,
        })
        .trim({
          background:
            "#ffffff",

          threshold:
            8,
        })
        .resize({
          width:
            850,

          height:
            650,

          fit:
            "contain",

          position:
            "centre",

          background: {
            r:
              255,

            g:
              255,

            b:
              255,

            alpha:
              1,
          },

          withoutEnlargement:
            false,
        })
        .webp({
          quality:
            90,

          effort:
            4,
        })
        .toBuffer();

    results.push({
      segmentIndex,

      buffer:
        cropped,

      width:
        extractWidth,

      height:
        cropHeight,
    });
  }

  return results;
}
