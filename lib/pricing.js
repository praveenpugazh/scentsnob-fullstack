export const DEFAULT_MARGIN = 0.03 // 3% — sell off inventory fast

// margin covers atomiser + labour + packaging + profit
// 0% margin = juice cost only (cost per ml × size)
export function calcPrices(paidAmount, bottleMl, margin = DEFAULT_MARGIN) {
  const cpm = paidAmount / bottleMl
  const c5 = cpm * 5
  const c10 = cpm * 10
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
export const SHIPPING_CHARGE = 150
export const WA_NUMBER = '918754519509'
export const UPI_ID = 'praveenpugazh14@okicici'
export const UPI_NAME = 'Praveen P'

