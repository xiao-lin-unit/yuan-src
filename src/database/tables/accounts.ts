import { Account } from '../../types/account/account'
import db from '../index.js'
import { formatForDB, getCurrentDate, generateId } from '../../utils/timezone'
import { Amount } from '../../utils/number'
import type dayjs from 'dayjs'


/**
 * 账户表
 * @returns 创建账户表的 SQL 语句
 */
const createTable = () => {
  return [
    {
      sql: `
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          balance REAL DEFAULT 0,
          used_limit REAL DEFAULT 0,
          total_limit REAL DEFAULT 0,
          is_liquid INTEGER DEFAULT 1,
          status TEXT DEFAULT '启用',
          asset_id TEXT,
          remark TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ]
}

const insert = (account: Account) => {
  return {
    statement: `
      INSERT INTO accounts (id, name, type, balance, used_limit, total_limit, is_liquid, status, asset_id, remark, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      account.id || generateId(),
      account.name,
      account.type,
      Amount.format(account.balance || 0, 2),
      Amount.format(account.used_limit || 0, 2),
      Amount.format(account.total_limit || 0, 2),
      account.is_liquid,
      account.status || '启用',
      account.asset_id,
      account.remark,
      formatForDB(account.created_at || getCurrentDate()),
      formatForDB(account.updated_at || getCurrentDate())
    ]
  }
}

const del = (id: string) => {
    return {
      statement: `DELETE FROM accounts WHERE id = ?`,
      values: [id]
    }
}

const update = (account: Account) => {
    let values: any[] = []
    const fields: string[] = []

    if (account.name) {
        fields.push('name = ?')
      values.push(account.name)
    }
    if (account.type) {
        fields.push('type = ?')
      values.push(account.type)
    }
    if (account.balance !== undefined && account.balance !== null) {
        fields.push('balance = ?')
      values.push(Amount.format(account.balance || 0, 2))
    }
    if (account.used_limit !== undefined && account.used_limit !== null) {
        fields.push('used_limit = ?')
      values.push(Amount.format(account.used_limit || 0, 2))
    }
    if (account.total_limit !== undefined && account.total_limit !== null) {
        fields.push('total_limit = ?')
      values.push(Amount.format(account.total_limit || 0, 2))
    }
    if (account.is_liquid !== undefined && account.is_liquid !== null) {
        fields.push('is_liquid = ?')
      values.push(account.is_liquid)
    }
    if (account.status) {
        fields.push('status = ?')
      values.push(account.status)
    }
    if (account.asset_id) {
        fields.push('asset_id = ?')
      values.push(account.asset_id)
    }
    if (account.remark) {
        fields.push('remark = ?')
      values.push(account.remark)
    }
    
    fields.push('updated_at = ?')
    values.push(formatForDB(account.updated_at || getCurrentDate()))
   const  statement = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`
    values.push(account.id)
  return {
    statement,
    values
  }
}

const queryById = async (id: string) => {
  const account = await db.query('SELECT * FROM accounts WHERE id = ?', [id])
  return account.length > 0 ? account[0] as Account : null
}

const queryAll = async () => {
  const accounts = await db.query('SELECT * FROM accounts')
  return accounts as Account[]
}

const query = async (sql: string, values: any[]) => {
  const accounts = await db.query(sql, values)
  return accounts as Account[]
}

const addCreditUsedLimit = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE accounts SET used_limit = used_limit + ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}

const addDebitBalance = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}

const updateDebitBalance = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}

const updateCreditUsedLimit = (amount: number, id: string, updated_at: dayjs.Dayjs | string = getCurrentDate()) => {
  return {
    statement: `UPDATE accounts SET used_limit = ?, updated_at = ? WHERE id = ?`,
    values: [Amount.format(amount, 2), formatForDB(updated_at), id]
  }
}

export default { createTable, insert, del, update, queryById, queryAll, query, addCreditUsedLimit, addDebitBalance, updateDebitBalance, updateCreditUsedLimit }
