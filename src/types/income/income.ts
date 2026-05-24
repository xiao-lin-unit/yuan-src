
export interface IncomeInput {
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
}