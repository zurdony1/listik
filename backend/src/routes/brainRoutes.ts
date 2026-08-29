import {
  Router,
} from "express";

import {
  createBrainMemory,
} from "../controllers/brainMemoryController";

const router = Router();

router.post(
  "/memory",
  createBrainMemory,
);

export default router;