/**
 * ECONOMY §2.1.2 / DEC-018: toda moneda se acredita en enteros, pero lo devengado
 * puede ser fraccionario. La fracción queda guardada por barrio en
 * `pendingCoinsRemainder` y sólo se convierte en moneda al cruzar la unidad.
 *
 * Es el mismo mecanismo para la producción pasiva y para el foco: si cada regla
 * tuviera su propio redondeo, dos fuentes devengando fracciones en el mismo
 * barrio perderían centavos por caminos separados.
 */
export interface CoinCredit {
  treasuryCoins: number;
  pendingCoinsRemainder: number;
  creditedCoins: number;
}

export function creditCoins(
  treasuryCoins: number,
  pendingCoinsRemainder: number,
  earned: number,
): CoinCredit {
  const accumulated = pendingCoinsRemainder + earned;
  const credited = Math.floor(accumulated);

  return {
    treasuryCoins: treasuryCoins + credited,
    pendingCoinsRemainder: accumulated - credited,
    creditedCoins: credited,
  };
}
