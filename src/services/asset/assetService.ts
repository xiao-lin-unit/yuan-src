/**
 * Asset Service
 * Handles general asset operations
 */

import db from '../../database/index.js'
import type { Asset, AssetInput } from '../../types/asset/asset.js'
import { createDebitTransaction } from '../account/accountService.js'
import { getCurrentDate, generateId, getCurrentString } from '../../utils/timezone.js'
import AssetDB from '../../database/tables/assets.js'
import AssetIncomeRecordsDB from '../../database/tables/asset_income_records.js'


/**
 * Calculate next income date based on period and income date
 */
export function calculateNextIncomeDate(period: string, incomeDate: string): string {
  if (!period) return ''

  const now = getCurrentDate()

  if (period === '日') {
    // 每日：下一个收益日是明天
    return now.add(1, 'day').format('YYYY-MM-DD 00:00:00')
  } else if (period === '年') {
    // 每年：income_date format is MM-DD, next income date is this year or next year
    if (!incomeDate) return ''
    const [month, day] = incomeDate.split('-')
    let nextDate = getCurrentDate().year(now.year()).month(parseInt(month) - 1).date(parseInt(day))

    // If this year's income date has passed, next year
    if (nextDate.isBefore(now) || nextDate.isSame(now, 'day')) {
      nextDate = nextDate.add(1, 'year')
    }

    return nextDate.format('YYYY-MM-DD 00:00:00')
  } else if (period === '月') {
    // 每月：income_date format is DD or MM-DD, next income date is this month or next month
    if (!incomeDate) return ''
    const parts = incomeDate.split('-')
    const day = parseInt(parts.length > 1 ? parts[1] : parts[0])
    if (isNaN(day)) return ''
    let nextDate = getCurrentDate().year(now.year()).month(now.month()).date(day)

    // If this month's income date has passed, next month
    if (nextDate.isBefore(now) || nextDate.isSame(now, 'day')) {
      nextDate = nextDate.add(1, 'month')
    }

    return nextDate.format('YYYY-MM-DD 00:00:00')
  }

  return ''
}

/**
 * Calculate asset income amount based on calculation type and period
 * @param asset The asset to calculate income for
 * @returns The income amount for one period
 */
export function calculatePerAssetIncome(asset: Asset): number {
  if (!asset.calculation_type || !asset.period) return 0.00
  if (asset.calculation_type === '无') return 0.00

  if (asset.calculation_type === '按金额计算') {
    // 按每期固定金额计算
    return asset.income_amount || 0
  } else if (asset.calculation_type === '按年收益率计算') {
    // 按年收益率计算：根据周期不同，年化收益率需要除以不同的基数
    const rate = asset.annual_yield_rate || 0.00 // / 100
    const principal = asset.amount || 0.00

    if (rate <= 0 || principal <= 0) return 0.00

    let periodDivisor = 1
    if (asset.period === '日') {
      periodDivisor = 365
    } else if (asset.period === '月') {
      periodDivisor = 12
    } else if (asset.period === '年') {
      periodDivisor = 1
    }

    return principal * rate / periodDivisor
  }

  return 0.00
}

/**
 * Add a new general asset
 */
export async function addAsset(assetData: AssetInput, deductFromAccount: boolean = true): Promise<void> {
  const id = generateId()

  // Calculate next income date
  let nextIncomeDate = ''
  if (assetData.period) {
    nextIncomeDate = calculateNextIncomeDate(assetData.period, assetData.income_date || '')
  }
  const now = getCurrentDate()

  const statements: { statement: string; values: any[] }[] = []
  const asset = AssetDB.insert({
    id,
    type: assetData.type,
    name: assetData.name,
    amount: assetData.amount,
    account_id: assetData.account_id,
    period: assetData.period,
    period_count: assetData.period_count,
    income_date: assetData.income_date,
    next_income_date: nextIncomeDate,
    calculation_type: assetData.calculation_type,
    income_amount: assetData.income_amount || 0.00,
    annual_yield_rate: assetData.annual_yield_rate || 0.00,
    status: '开启',
    created_at: now,
    updated_at: now
  })
  // Create asset record
  statements.push(asset)

  // Deduct from account if requested
  if (deductFromAccount) {
    const debitResult = await createDebitTransaction(assetData.account_id, assetData.amount, `新增资产：${assetData.name}`)
    statements.push(...debitResult.statements)
  }

  await db.executeTransaction(statements)
}

/**
 * Get all assets
 */
export async function getAssets(): Promise<Asset[]> {
  return await db.query('SELECT * FROM assets ORDER BY created_at DESC')
}

/**
 * Get assets by type
 */
export async function getAssetsByType(type: string): Promise<Asset[]> {
  return await db.query('SELECT * FROM assets WHERE type = ? ORDER BY created_at DESC', [type])
}

/**
 * Get active assets (not ended), includes paused assets
 */
export async function getActiveAssets(): Promise<Asset[]> {
  return await db.query("SELECT * FROM assets WHERE status != '结束' ORDER BY created_at DESC")
}

/**
 * Get asset by ID
 */
export async function getAssetById(assetId: string): Promise<Asset | null> {
  const result = await db.query('SELECT * FROM assets WHERE id = ?', [assetId])
  return result.length > 0 ? result[0] : null
}

/**
 * Update asset
 */
export async function updateAsset(assetId: string, data: Partial<Asset>): Promise<void> {
  const update = AssetDB.update({ id: assetId, ...data } as Asset)
  
  await db.run(
    update.statement,
    update.values
  )
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const statements: { statement: string; values: any[] }[] = [
    AssetDB.del(assetId),
    { statement: 'DELETE FROM asset_income_records WHERE asset_id = ?', values: [assetId] }
  ]
  await db.executeTransaction(statements)
}

export async function switchStatusAsset(assetId: string, status: string): Promise<void> {
  const update = AssetDB.update({ id: assetId, status } as Asset)
  await db.run(update.statement, update.values)
}

/**
 * Mark asset as ended
 */
export async function endAsset(assetId: string): Promise<void> {
  await switchStatusAsset(assetId, '结束')
}

/**
 * Pause asset (exclude from income calculation)
 */
export async function pauseAsset(assetId: string): Promise<void> {
  await switchStatusAsset(assetId, '暂停')
}

/**
 * Resume asset (back to active)
 */
export async function resumeAsset(assetId: string): Promise<void> {
  await switchStatusAsset(assetId, '开启')
}

/**
 * Get income records for an asset
 */
export async function getAssetIncomeRecords(assetId: string): Promise<any[]> {
  return await db.query(
    'SELECT * FROM asset_income_records WHERE asset_id = ? ORDER BY record_time DESC',
    [assetId]
  )
}

/**
 * Record an income for an asset
 */
export async function recordAssetIncome(
  assetId: string,
  incomeAmount: number,
  recordTime: string,
  remark?: string
): Promise<{ statement: string; values: (string | number)[] }> {
  const id = generateId()
  return AssetIncomeRecordsDB.insert({
    id,
    asset_id: assetId,
    income_amount: incomeAmount,
    record_time: recordTime,
    remark: remark || ''
  }) as { statement: string; values: (string | number)[] }
}
