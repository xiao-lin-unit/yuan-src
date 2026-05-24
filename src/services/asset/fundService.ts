/**
 * Fund Service
 * Handles all fund-related business logic and database operations
 */

import dayjs from 'dayjs'
import db from '../../database/index.js'
import { getCurrentDate, generateId, getDate, formatDate, getCurrentString } from '../../utils/timezone.js'
import type {
  Fund,
  FundHolding,
  FundTransaction,
  FundInput,
  FundBuyInput,
  FundSellInput,
  FundSellResult,
  FundDetail
} from '../../types/asset/fund.js'
import { calculateTotalCost, calculateFundWeightedNavCostPrice } from '../../utils/calculations.js'
import { createDebitTransaction, createCreditTransaction } from '../account/accountService.js'
import FundDB from '../../database/tables/funds.js'
import FundHoldingDB from '../../database/tables/fund_holdings.js'
import FundTransactionDB from '../../database/tables/fund_transactions.js'
import { Amount } from '../../utils/number.js'



/**
 * Get all funds
 */
export async function getAllFunds(): Promise<Fund[]> {
  return await db.query('SELECT * FROM funds ORDER BY created_at DESC')
}

/**
 * Validate fund code format (6 digits)
 */
export function validateFundCode(code: string): boolean {
  const codePattern = /^\d{6}$/
  return codePattern.test(code)
}

/**
 * Check if a fund with the given code already exists
 */
export async function checkFundExists(code: string): Promise<{ exists: boolean; isEnded: boolean }> {
  const existingFunds = await db.query('SELECT * FROM funds WHERE code = ?', [code])
  if (existingFunds.length > 0) {
    const fund = existingFunds[0]
    return { exists: true, isEnded: fund.status === '结束' }
  }
  return { exists: false, isEnded: false }
}

/**
 * Get available accounts for fund operations (excluding credit cards)
 */
export async function getAvailableAccounts(): Promise<Array<{ id: string; name: string; balance: number }>> {
  return await db.query('SELECT id, name, balance FROM accounts WHERE type != ?', ['信用卡'])
}

/**
 * Check if account has sufficient balance
 */
export async function checkAccountBalance(accountId: string, requiredAmount: number): Promise<{ sufficient: boolean; currentBalance: number }> {
  const accountData = await db.query('SELECT balance FROM accounts WHERE id = ?', [accountId])
  if (accountData.length === 0) {
    return { sufficient: false, currentBalance: 0.00 }
  }
  const currentBalance = accountData[0].balance
  return { sufficient: currentBalance >= requiredAmount, currentBalance: Number(currentBalance.toFixed(2)) }
}

/**
 * Calculate lock end date based on lock period
 */
export function calculateLockEndDate(transactionTime: dayjs.Dayjs | string | Date, lockPeriod: number): dayjs.Dayjs | null {
  if (!lockPeriod || lockPeriod <= 0) return null
  return getDate(transactionTime as any).add(lockPeriod, 'month')
}

/**
 * Add a new fund with initial buy transaction
 */
export async function addFund(fundData: FundInput, deductFromAccount: boolean = true): Promise<void> {
  const fundId = generateId()
  const totalCost = calculateTotalCost(fundData.cost_nav, fundData.shares, fundData.fee)

  // Calculate lock end date
  const lockEndDate = calculateLockEndDate(fundData.transaction_time, fundData.lock_period)

  const statements: { statement: string; values: any[] }[] = []
  
  // Create fund record
  statements.push(FundDB.insert({
    id: fundId,
    name: fundData.name,
    code: fundData.code,
    shares: fundData.shares,
    current_nav: fundData.cost_nav,
    cost_nav: fundData.cost_nav,
    confirmed_profit: 0.00,
    total_fee: fundData.fee,
    first_buy_date: fundData.transaction_time,
    has_lock: fundData.has_lock,
    lock_period: fundData.lock_period,
    account_id: fundData.account_id,
    status: '开启'
  }))

  const holdingId = generateId()
  const transactionId = generateId()
  statements.push(FundHoldingDB.insert({
    id: holdingId,
    fund_id: fundId,
    nav: fundData.cost_nav,
    shares: fundData.shares,
    remaining_shares: fundData.shares,
    fee: fundData.fee,
    lock_period: fundData.lock_period,
    lock_end_date: lockEndDate ? formatDate(lockEndDate) : null,
    transaction_time: fundData.transaction_time,
    account_id: fundData.account_id
  }))
  statements.push(FundTransactionDB.insert({
    id: transactionId,
    fund_id: fundId,
    transaction_nav: fundData.cost_nav,
    shares: fundData.shares,
    type: '买入',
    hold_ids: holdingId,
    fee: fundData.fee,
    transaction_time: fundData.transaction_time,
    account_id: fundData.account_id
  }))

  // Deduct from account if requested
  if (deductFromAccount) {
    const debitResult = await createDebitTransaction(fundData.account_id, totalCost, `基金买入：${fundData.name}`)
    statements.push(...debitResult.statements)
  }

  await db.executeTransaction(statements)
}

/**
 * Buy additional shares of an existing fund
 */
export async function buyFund(fundId: string, buyData: FundBuyInput): Promise<void> {
  // Get current fund data
  const fundData = await db.query('SELECT * FROM funds WHERE id = ?', [fundId])
  if (fundData.length === 0) {
    throw new Error('基金不存在')
  }
  const currentFund = fundData[0]

  const totalCost = calculateTotalCost(buyData.nav, buyData.shares, buyData.fee)

  // 使用新的出账接口
  const debitResult = await createDebitTransaction(buyData.account_id, totalCost, `基金买入：${currentFund.name}`)

  // Calculate new cost nav using weighted average
  const currentTotalValue = currentFund.cost_nav * currentFund.shares
  const newBuyValue = buyData.nav * buyData.shares
  const newShares = currentFund.shares + buyData.shares
  const newCostNav = (currentTotalValue + newBuyValue) / newShares

  // Calculate lock end date
  const lockEndDate = calculateLockEndDate(buyData.transaction_time, buyData.lock_period)

  const holdingId = generateId()
  const transactionId = generateId()

  const statements = [
    // Create fund holding record
    FundHoldingDB.insert({
      id: holdingId,
      fund_id: fundId,
      nav: buyData.nav,
      shares: buyData.shares,
      remaining_shares: buyData.shares,
      fee: buyData.fee,
      lock_period: buyData.lock_period,
      lock_end_date: lockEndDate ? formatDate(lockEndDate) : null,
      transaction_time: buyData.transaction_time,
      account_id: buyData.account_id
    }),
    FundTransactionDB.insert({
      id: transactionId,
      fund_id: fundId,
      transaction_nav: buyData.nav,
      shares: buyData.shares,
      type: '买入',
      hold_ids: holdingId,
      fee: buyData.fee,
      transaction_time: buyData.transaction_time,
      account_id: buyData.account_id
    }),
    FundDB.update({
      id: fundId,
      shares: newShares,
      current_nav: buyData.nav,
      cost_nav: newCostNav,
      total_fee: currentFund.total_fee + buyData.fee,
      status: '开启',
      updated_at: getCurrentString()
    } as Fund),
    // 使用出账接口返回的SQL语句（已包含账户更新和交易记录）
    ...debitResult.statements
  ]

  await db.executeTransaction(statements)
}

/**
 * Sell fund shares using FIFO (First In First Out) method
 */
export async function sellFund(fundId: string, sellData: FundSellInput): Promise<FundSellResult> {
  // Check fund total shares
  const fundData = await db.query('SELECT * FROM funds WHERE id = ?', [fundId])
  if (fundData.length === 0) {
    throw new Error('基金不存在')
  }
  const fund = fundData[0]

  if (sellData.shares > fund.shares) {
    throw new Error('卖出份额不能大于基金的总份额')
  }

  // Query available holdings (not fully sold and lock period expired)
  const currentDate = formatDate(getCurrentDate())
  const holdings = await db.query(
    'SELECT * FROM fund_holdings WHERE fund_id = ? AND sell_status != ? AND (lock_end_date IS NULL OR lock_end_date <= ?) ORDER BY transaction_time ASC',
    [fundId, '已卖出', currentDate]
  )

  if (holdings.length === 0) {
    throw new Error('没有可卖出的持有记录（所有记录均在锁定期内）')
  }

  // Calculate total available shares
  const totalAvailableShares = holdings.reduce((total: number, holding: FundHolding) => total + holding.remaining_shares, 0)
  if (sellData.shares > totalAvailableShares) {
    throw new Error(`卖出份额不能大于可卖出的总份额（当前可卖出份额：${totalAvailableShares}）`)
  }

  // Prepare transaction statements
  const statements = []
  let remainingSharesToSell = sellData.shares
  const soldHoldIds: string[] = []

  // Deduct from earliest holdings first (FIFO)
  for (const holding of holdings) {
    if (remainingSharesToSell <= 0) break

    const availableShares = holding.remaining_shares
    const sharesToDeduct = Math.min(availableShares, remainingSharesToSell)

    // Update holding record
    const newRemainingShares = availableShares - sharesToDeduct
    let newSellStatus = holding.sell_status

    if (newRemainingShares === 0) {
      newSellStatus = '已卖出'
    } else if (newRemainingShares < availableShares) {
      newSellStatus = '部分卖出'
    }

    statements.push(FundHoldingDB.update({
      id: holding.id,
      remaining_shares: newRemainingShares,
      sell_status: newSellStatus
    } as FundHolding))

    soldHoldIds.push(holding.id)
    remainingSharesToSell -= sharesToDeduct
  }

  // Create fund transaction record (sell)
  const transactionId = generateId()
  statements.push(FundTransactionDB.insert({
    id: transactionId,
    fund_id: fundId,
    transaction_nav: sellData.nav,
    shares: sellData.shares,
    type: '卖出',
    hold_ids: soldHoldIds.join(','),
    fee: sellData.fee,
    transaction_time: sellData.transaction_time,
    account_id: sellData.account_id
  }))

  // Update fund record
  const newShares = fund.shares - sellData.shares
  const confirmedProfit = (sellData.nav - fund.cost_nav) * sellData.shares - sellData.fee
  const newConfirmedProfit = (fund.confirmed_profit || 0) + confirmedProfit
  const isEnded = newShares === 0 ? '结束' : '开启'

  statements.push(FundDB.update({
    id: fundId,
    shares: newShares,
    current_nav: sellData.nav,
    confirmed_profit: newConfirmedProfit,
    status: isEnded,
    updated_at: getCurrentString()
  } as Fund))

  // Calculate net proceeds
  const netProceeds = (sellData.nav * sellData.shares) - sellData.fee

  // 使用新的入账接口（已包含账户更新和交易记录）
  const creditResult = await createCreditTransaction(sellData.account_id, netProceeds, `基金卖出：${fund.name}`)

  // 添加入账接口返回的SQL语句
  statements.push(...creditResult.statements)

  await db.executeTransaction(statements)

  return {
    soldShares: sellData.shares,
    confirmedProfit: Amount.format(confirmedProfit),
    netProceeds: Amount.format(netProceeds) 
  }
}

/**
 * Get fund detail by ID
 */
export async function getFundDetail(fundId: string): Promise<FundDetail> {
  const fund = await db.query('SELECT * FROM funds WHERE id = ?', [fundId])
  if (fund.length === 0) {
    throw new Error('基金不存在')
  }

  const f = fund[0]

  // Calculate derived values
  const costAmount = f.cost_nav * f.shares
  const currentAmount = f.current_nav * f.shares
  const holdReturn = currentAmount - costAmount
  const confirmedReturn = f.confirmed_profit || 0
  const totalReturn = holdReturn + confirmedReturn

  return {
    id: f.id,
    name: f.name,
    code: f.code,
    costAmount,
    costFee: f.cost_fee || 0,
    costNav: f.cost_nav,
    currentNav: f.current_nav,
    shares:f.shares,
    confirmedReturn,
    holdReturn,
    totalReturn
  }
}

/**
 * Get fund holdings
 */
export async function getFundHoldings(fundId: string): Promise<FundHolding[]> {
  return await db.query(
    'SELECT * FROM fund_holdings WHERE fund_id = ? ORDER BY transaction_time ASC',
    [fundId]
  )
}

/**
 * Get fund transactions (buy and sell)
 */
export async function getFundTransactions(fundId: string): Promise<{ buyTransactions: FundTransaction[]; sellTransactions: FundTransaction[] }> {
  const transactions = await db.query(
    'SELECT * FROM fund_transactions WHERE fund_id = ? ORDER BY transaction_time DESC',
    [fundId]
  )

  return {
    buyTransactions: transactions.filter((t: FundTransaction) => t.type === '买入'),
    sellTransactions: transactions.filter((t: FundTransaction) => t.type === '卖出')
  }
}

/**
 * Update fund NAV (current net asset value)
 */
export async function updateFundNav(fundId: string, newNav: number): Promise<void> {
  if (newNav <= 0) {
    throw new Error('净值必须大于0')
  }

  const statement = FundDB.update({
    id: fundId,
    current_nav: newNav,
    updated_at: getCurrentString()
  } as Fund)

  await db.run(
    statement.statement,
    statement.values
  )
}

/**
 * Get fund by ID (basic info)
 */
export async function getFundById(fundId: string): Promise<Fund | null> {
  const result = await db.query('SELECT * FROM funds WHERE id = ?', [fundId])
  return result.length > 0 ? result[0] : null
}

/**
 * Delete a fund and all related data (holdings, transactions)
 * Uses executeTransaction for atomicity
 */
export async function deleteFund(fundId: string): Promise<void> {
  const fundData = await db.query('SELECT * FROM funds WHERE id = ?', [fundId])
  if (fundData.length === 0) {
    throw new Error('基金不存在')
  }

  const statements = [
    {
      statement: 'DELETE FROM fund_transactions WHERE fund_id = ?',
      values: [fundId]
    },
    {
      statement: 'DELETE FROM fund_holdings WHERE fund_id = ?',
      values: [fundId]
    },
    FundDB.del(fundId)
  ]

  await db.executeTransaction(statements)
}