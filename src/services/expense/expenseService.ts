import db from '../../database/index.js'
import { ExpenseInput } from '../../types/expense/expense.js'
import { createDebitTransaction } from '../account/accountService.js'

import { generateId, getDate, formatForDB, getCurrentDate } from '../../utils/timezone.js'
import IncomeExpenseRecordsDB from '../../database/tables/income_expense_records.js'

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