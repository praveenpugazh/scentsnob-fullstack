export const DEFAULT_MARGIN = 0.03 // 3% — sell off inventory fast
const ATOMISER_5 = 15
const ATOMISER_10 = 25
const LABOUR = 10
const PACKAGING = 25

// margin is a decimal e.g. 0.03 for 3%, 0.27 for 27%
export function calcPrices(paidAmount, bottleMl, margin = DEFAULT_MARGIN) {
  const cpm = paidAmount / bottleMl
  const c5 = cpm * 5 + ATOMISER_5 + LABOUR + PACKAGING
  const c10 = cpm * 10 + ATOMISER_10 + LABOUR + PACKAGING
  const p5 = Math.round(c5 / (1 - margin) / 10) * 10
  const p10 = Math.round(c10 / (1 - margin) / 10) * 10
  const p20 = Math.round((p10 * 1.8) / 10) * 10
  const p30 = Math.round((p10 * 2.5) / 10) * 10
  return { p5, p10, p20, p30 }
}

export function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export const FREE_SHIPPING_THRESHOLD = 3000
export const SHIPPING_CHARGE = 160
export const WA_NUMBER = '918754519509'
export const UPI_ID = 'praveenpugazh14@okicici'
export const UPI_NAME = 'Praveen P'
