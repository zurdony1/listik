import { Router } from "express";
import multer from "multer";

import {
  analyzeTicket,
} from "../controllers/ticketController";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (
    _request,
    file,
    callback,
  ) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new Error(
          "Solo se permiten imágenes JPG, PNG o WEBP.",
        ),
      );

      return;
    }

    callback(null, true);
  },
});

router.post(
  "/analyze",
  upload.single("ticket"),
  analyzeTicket,
);

export default router;