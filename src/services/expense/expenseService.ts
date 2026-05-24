import db from '../../database/index.js'
import { ExpenseInput } from '../../types/expense/expense.js'
import { createDebitTransaction, getAccountById } from '../account/accountService.js'

import { generateId, getDate, formatForDB, getCurrentDate, getCurrentString } from '../../utils/timezone.js'
import IncomeExpenseRecordsDB from '../../database/tables/income_expense_records.js'
import AccountTransactionDB from '../../database/tables/account_transactions.js'
import AccountDB from '../../database/tables/accounts.js'
import AssetDB from '../../database/tables/assets.js'

export async function addExpense(expense: ExpenseInput) {
  const transactionId = generateId()  
  const relatedId = transactionId
  
  // 使用账户出账接口 - 自动处理余额检查和账户更新
  const debitResult = await createDebitTransaction(
    expense.account_id,
    expense.amount,
    `支出：${expense.sub_type_name || ' '}${expense.remark ? '：' + expense.remark : ''}`, // 支出类型作为描述，如果不存在则使用空字符串
    transactionId,
    getDate(expense.created_at || getCurrentDate())
  )
  
  const statements = []
  
  // 添加账户出账相关的SQL语句
  statements.push(...debitResult.statements)
  
  // 添加支出流水记录
  statements.push(IncomeExpenseRecordsDB.insert({
    id: transactionId,
    type: '账户支出',
    sub_type: expense.sub_type,
    amount: expense.amount,
    account_id: expense.account_id,
    related_id: relatedId,
    balance_after: debitResult.balanceAfter,
    remark: expense.remark,
    created_at: formatForDB(expense.created_at || getCurrentDate()),
    status: '正常'
  }))

  // ==============================================
  // 这里是 Capacitor SQLite 正确事务写法
  // ==============================================
  await db.executeTransaction(statements)
}

/**
 * 删除支出记录（反向操作）
 * 1. 恢复账户余额（储蓄账户加回余额，信用卡减少已用额度）
 * 2. 恢复关联资产金额
 * 3. 删除账户流水记录
 * 4. 删除收支记录
 */
export async function deleteExpenseRecord(recordId: string): Promise<void> {
  // 查询收支记录
  const record = await IncomeExpenseRecordsDB.queryById(recordId)
  if (!record) {
    throw new Error('支出记录不存在')
  }

  // 查询关联账户
  const account = await getAccountById(record.account_id!)
  if (!account) {
    throw new Error('关联账户不存在')
  }

  const now = getCurrentString()
  const statements: { statement: string; values: any[] }[] = []

  // 恢复账户余额
  const isCreditCard = account.type === '信用卡'
  if (isCreditCard) {
    // 信用卡：减少已用额度
    statements.push(AccountDB.addCreditUsedLimit(-record.amount, account.id, now))
  } else {
    // 储蓄账户：加回余额
    statements.push(AccountDB.addDebitBalance(record.amount, account.id, now))
  }

  // 恢复关联资产金额
  if (!isCreditCard && account.asset_id) {
    statements.push(AssetDB.addAssetsAmount(record.amount, account.asset_id, now))
  }

  // 删除账户流水记录（account_transactions 与 income_expense_records 共享同一个 id）
  statements.push(AccountTransactionDB.del(recordId))

  // 删除收支记录
  statements.push(IncomeExpenseRecordsDB.del(recordId))

  await db.executeTransaction(statements)
}