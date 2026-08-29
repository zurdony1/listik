import {
  Router,
} from "express";

import {
  createStoreBranch,
} from "../services/storeBranchService";

const router =
  Router();

router.post(
  "/",
  async (
    request,
    response,
  ) => {
    try {
      const {
        storeId,
        name,
        municipality,
        state,
        latitude,
        longitude,
      } =
        request.body ?? {};

      if (
        typeof storeId !== "string" ||
        !storeId.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,
            error:
              "storeId es obligatorio.",
          });

        return;
      }

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,
            error:
              "El nombre de la sucursal es obligatorio.",
          });

        return;
      }

      if (
        typeof municipality !== "string" ||
        !municipality.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,
            error:
              "El municipio es obligatorio.",
          });

        return;
      }

      if (
        typeof state !== "string" ||
        !state.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,
            error:
              "El estado es obligatorio.",
          });

        return;
      }

      const branch =
        await createStoreBranch({
          storeId,
          name,
          municipality,
          state,
          latitude: Number(latitude),
          longitude: Number(longitude),
        });

      response
        .status(
          branch.created
            ? 201
            : 200,
        )
        .json({
          ok: true,
          message:
            branch.created
              ? "Sucursal registrada correctamente."
              : "La sucursal ya existía.",
          data: branch,
        });
    } catch (error) {
      console.error(
        "Error registrando sucursal:",
        error,
      );

      response
        .status(422)
        .json({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo registrar la sucursal.",
        });
    }
  },
);

export default router;
