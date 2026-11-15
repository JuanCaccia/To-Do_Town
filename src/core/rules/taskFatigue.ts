import { TASK_FATIGUE } from '../constants/economyConstants';

/**
 * B_agua de ECONOMY §2.3: un bono por cada litro ENTERO del día, con tope de 2.
 * US-05 CA-03 lo escribe como `min(2, dailyLiters)`; ECONOMY manda y trunca.
 */
export function getWaterBonusTasks(dailyLiters: number): number {
  return Math.min(TASK_FATIGUE.maxWaterBonusTasks, Math.floor(dailyLiters));
}

/** Multiplicador del tramo local para la SIGUIENTE tarea del barrio. */
export function getLocalTaskMultiplier(
  dailyTasksCompletedCount: number,
  dailyLiters: number,
): number {
  const bonusTasks = getWaterBonusTasks(dailyLiters);

  return tierMultiplier(
    dailyTasksCompletedCount + 1,
    TASK_FATIGUE.localOptimalQuota + bonusTasks,
    TASK_FATIGUE.localFatigueQuota,
  );
}

/** Multiplicador de la Estamina Global para la SIGUIENTE tarea de la ciudad. */
export function getGlobalTaskMultiplier(
  globalTasksCompletedCount: number,
  dailyLiters: number,
): number {
  const bonusTasks = getWaterBonusTasks(dailyLiters);

  return tierMultiplier(
    globalTasksCompletedCount + 1,
    TASK_FATIGUE.globalOptimalQuota + bonusTasks,
    TASK_FATIGUE.globalFatigueQuota,
  );
}

/** M_fatiga de US-05 CA-04: el mínimo entre el cupo del barrio y la estamina global. */
export function getTaskFatigueMultiplier(
  localTasksCompletedCount: number,
  globalTasksCompletedCount: number,
  dailyLiters: number,
): number {
  return Math.min(
    getLocalTaskMultiplier(localTasksCompletedCount, dailyLiters),
    getGlobalTaskMultiplier(globalTasksCompletedCount, dailyLiters),
  );
}

function tierMultiplier(nextTaskNumber: number, optimalQuota: number, fatigueQuota: number): number {
  if (nextTaskNumber <= optimalQuota) {
    return 1;
  }

  if (nextTaskNumber <= optimalQuota + fatigueQuota) {
    return TASK_FATIGUE.fatigueMultiplier;
  }

  return TASK_FATIGUE.exhaustionMultiplier;
}
