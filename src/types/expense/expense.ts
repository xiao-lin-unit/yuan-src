/**
 * Expense/Income module type definitions
 */

// Income & expense record
export interface IncomeExpenseRecord {
  id: string
  type: string
  sub_type?: string
  amount: number
  account_id?: string
  related_id?: string
  balance_after: number
  remark?: string
  status: '正常' | '已删除'
  created_at?: string
}

// Category entity
export interface Category {
  id: string
  name: string
  icon?: string
  iconText?: string
  type: string
  created_at?: string
  updated_at?: string
}

export interface ExpenseInput {
  type: string
  sub_type?: string
  sub_type_name?: string | undefined
  amount: number
  account_id: string
  related_id?: string
  balance_after: number
  remark?: string
  status: '正常' | '已删除'
  created_at?: string
}1
