import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dictionaryRouter from "./dictionary";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dictionaryRouter);
router.use(syncRouter);

export default router;
