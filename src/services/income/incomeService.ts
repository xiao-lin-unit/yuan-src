import db from '../../database/index.js'
import { createCreditTransaction, getAccountById } from '../account/accountService.js'
import { CategoryService } from '../categoryService.js'
import { getCurrentString, getCurrentDate, getDate, formatForDB, generateId } from '../../utils/timezone.js'
import IncomeExpenseRecordsDB from '../../database/tables/income_expense_records.js'
import AccountTransactionDB from '../../database/tables/account_transactions.js'
import AccountDB from '../../database/tables/accounts.js'
import AssetDB from '../../database/tables/assets.js'
import { IncomeInput } from '../../types/income/income'


export async function addIncome(income: IncomeInput) {
    const transactionId = generateId()
    const relatedId = transactionId

    // 查询分类的是否必须字段
    const category = income.sub_type ? await CategoryService.getCategoryById(income.sub_type) : null
    const isRequired = category?.required ? 1 : 0

    // 使用账户入账接口 - 自动处理余额更新和关联资产同步
    const creditResult = await createCreditTransaction(
        income.account_id,
        income.amount,
        `收入：${income.sub_type_name || ' '}${income.remark ? '：' + income.remark : ''}`,
        transactionId,
        getDate(income.created_at || getCurrentDate())
    )

    const statements = []

    // 添加账户入账相关的SQL语句
    statements.push(...creditResult.statements)

    // 添加收入流水记录
    statements.push(IncomeExpenseRecordsDB.insert({
        id: transactionId,
        type: '账户收入',
        sub_type: income.sub_type,
        amount: income.amount,
        account_id: income.account_id,
        related_id: relatedId,
        balance_after: creditResult.balanceAfter,
        remark: income.remark,
        created_at: formatForDB(income.created_at || getCurrentDate()),
        status: '正常',
        is_required: isRequired
    }))

    // ==============================================
    // 这里是 Capacitor SQLite 正确事务写法
    // ==============================================
    await db.executeTransaction(statements)
}

/**
 * 删除收入记录（反向操作）
 * 1. 恢复账户余额（储蓄账户减少余额，信用卡增加已用额度）
 * 2. 恢复关联资产金额
 * 3. 删除账户流水记录
 * 4. 删除收支记录
 */
export async function deleteIncomeRecord(recordId: string): Promise<void> {
    // 查询收支记录
    const record = await IncomeExpenseRecordsDB.queryById(recordId)
    if (!record) {
        throw new Error('收入记录不存在')
    }

    // 查询关联账户
    const account = await getAccountById(record.account_id!)
    if (!account) {
        throw new Error('关联账户不存在')
    }

    const now = getCurrentString()
    const statements: { statement: string; values: any[] }[] = []

    // 恢复账户余额（反向：收入时加了余额，删除时要减回去）
    const isCreditCard = account.type === '信用卡'
    if (isCreditCard) {
        // 信用卡：收入是减少已用额度（还款），删除时要加回已用额度
        statements.push(AccountDB.addCreditUsedLimit(record.amount, account.id, now))
    } else {
        // 储蓄账户：收入是增加余额，删除时要减少余额
        statements.push(AccountDB.addDebitBalance(-record.amount, account.id, now))
    }

    // 恢复关联资产金额（反向：收入时加了资产金额，删除时要减回去）
    if (!isCreditCard && account.asset_id) {
        statements.push(AssetDB.addAssetsAmount(-record.amount, account.asset_id, now))
    }

    // 删除账户流水记录（account_transactions 与 income_expense_records 共享同一个 id）
    statements.push(AccountTransactionDB.del(recordId))

    // 删除收支记录
    statements.push(IncomeExpenseRecordsDB.del(recordId))

    await db.executeTransaction(statements)
}
