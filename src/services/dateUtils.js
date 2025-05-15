// Hilfsfunktionen für Datums- und Kalenderbezogene Operationen

/**
 * Berechnet die Namen der Monate
 * @param {number} monat - Monat als Nummer (0-11)
 * @returns {string} - Name des Monats
 */
export const getMonatsName = (monat) => {
  const monate = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return monate[monat];
};

/**
 * Berechnet die Namen der Wochentage
 * @param {number} wochentag - Wochentag als Nummer (0-6, wobei 0 = Sonntag)
 * @returns {string} - Kurzname des Wochentags
 */
export const getWochentagName = (wochentag) => {
  const wochentage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return wochentage[wochentag];
};

/**
 * Generiert alle Tage für einen bestimmten Monat
 * @param {number} monat - Monat (0-11)
 * @param {number} jahr - Jahr (z.B. 2025)
 * @returns {Array} - Array mit Tagesobjekten des Monats
 */
export const getTageImMonat = (monat, jahr) => {
  const letzterTag = new Date(jahr, monat + 1, 0);
  
  const tage = [];
  for (let i = 1; i <= letzterTag.getDate(); i++) {
    const tag = new Date(jahr, monat, i);
    tage.push({
      datum: tag,
      tag: i,
      wochentag: tag.getDay(),
      istWochenende: tag.getDay() === 0 || tag.getDay() === 6, // 0 = Sonntag, 6 = Samstag
    });
  }
  return tage;
};