import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dictionaryRouter from "./dictionary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dictionaryRouter);

export default router;
