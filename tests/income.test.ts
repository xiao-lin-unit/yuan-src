import { describe, it, expect, beforeEach } from 'vitest'
import { resetTestDatabase, seedTestData } from './utils/testDb'
import db from '../src/database/index.js'
import { addIncome, deleteIncomeRecord } from '../src/services/income/incomeService'

describe('Income Module', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    await seedTestData(db)
  })

  it('should query income records from income_expense_records table', async () => {
    const incomes = await db.query(
      `SELECT SUM(amount) as total FROM income_expense_records WHERE type = '账户收入'`
    )
    expect(incomes[0].total).toBe(8000)
  })

  it('should insert and retrieve an income transaction', async () => {
    await db.run(
      `INSERT INTO income_expense_records (id, type, sub_type, amount, account_id, balance_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['tx_inc', '账户收入', 'cat2', 5000, 'acc3', 25000, '2024-06-15']
    )

    const incomes = await db.query(
      `SELECT * FROM income_expense_records WHERE type = '账户收入' AND id = ?`,
      ['tx_inc']
    )
    expect(incomes.length).toBe(1)
    expect(incomes[0].amount).toBe(5000)
    expect(incomes[0].sub_type).toBe('cat2')
  })

  it('should calculate monthly income total', async () => {
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const incomes = await db.query(
      `SELECT SUM(amount) as total FROM income_expense_records WHERE type = '账户收入' AND created_at >= ?`,
      [startOfMonth]
    )
    expect(incomes[0].total).toBe(8000)
  })

  it('should add income via service and update account balance', async () => {
    // acc3 工资卡 初始余额 20000
    const accountBefore = await db.query('SELECT * FROM accounts WHERE id = ?', ['acc3'])
    expect(accountBefore[0].balance).toBe(20000)

    await addIncome({
      type: '账户收入',
      sub_type: '工资',
      sub_type_name: '工资',
      amount: 5000,
      account_id: 'acc3',
      balance_after: 0,
      remark: '测试收入',
      status: '正常'
    })

    // 验证账户余额增加
    const accountAfter = await db.query('SELECT * FROM accounts WHERE id = ?', ['acc3'])
    expect(accountAfter[0].balance).toBe(25000)

    // 验证收支记录已插入
    const records = await db.query(
      `SELECT * FROM income_expense_records WHERE type = '账户收入' AND sub_type = '工资' AND amount = 5000`
    )
    expect(records.length).toBe(1)
    expect(records[0].balance_after).toBe(25000)

    // 验证账户流水记录已插入
    const transactions = await db.query(
      `SELECT * FROM account_transactions WHERE id = ?`, [records[0].id]
    )
    expect(transactions.length).toBe(1)
    expect(transactions[0].type).toBe('收入')
    expect(transactions[0].amount).toBe(5000)
  })

  it('should delete income record and restore account balance', async () => {
    // 先新增一笔收入
    await addIncome({
      type: '账户收入',
      sub_type: '奖金',
      sub_type_name: '奖金',
      amount: 3000,
      account_id: 'acc3',
      balance_after: 0,
      remark: '待删除收入',
      status: '正常'
    })

    // 查找该记录
    const records = await db.query(
      `SELECT * FROM income_expense_records WHERE sub_type = '奖金' AND remark = '待删除收入'`
    )
    expect(records.length).toBe(1)
    const recordId = records[0].id

    // 验证账户余额已增加
    const accountBefore = await db.query('SELECT * FROM accounts WHERE id = ?', ['acc3'])
    expect(accountBefore[0].balance).toBe(23000)

    // 删除收入记录
    await deleteIncomeRecord(recordId)

    // 验证账户余额已恢复
    const accountAfter = await db.query('SELECT * FROM accounts WHERE id = ?', ['acc3'])
    expect(accountAfter[0].balance).toBe(20000)

    // 验证收支记录已删除
    const deletedRecords = await db.query(
      `SELECT * FROM income_expense_records WHERE id = ?`, [recordId]
    )
    expect(deletedRecords.length).toBe(0)

    // 验证账户流水记录已删除
    const deletedTx = await db.query(
      `SELECT * FROM account_transactions WHERE id = ?`, [recordId]
    )
    expect(deletedTx.length).toBe(0)
  })
})
