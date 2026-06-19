declare const __APP_VERSION__: string;
/**
 * 数据库版本迁移脚本
 *
 * 新增版本迁移时，只需在 MIGRATIONS 数组末尾追加一条记录即可，
 * versionUpdate() 会自动按顺序执行所有未应用的迁移。
 *
 * 约定：
 * - version 字段必须与 package.json 中的版本号一致（纯数字，不含 'v' 前缀）
 * - migrate 函数接收 db 实例，可在其中执行任意 SQL
 * - migrate 函数必须是幂等的（重复调用不会产生副作用）
 */

interface Migration {
  version: string
  description: string
  migrate: (db: any) => Promise<void>
}

/**
 * 辅助函数：检查表是否存在某列
 */
async function hasColumn(db: any, table: string, column: string): Promise<boolean> {
  const columns = await db.query(`PRAGMA table_info(${table})`)
  return columns.some((c: any) => c.name === column)
}

/**
 * 辅助函数：使用 PRAGMA table_info 重建无外键约束版本的表。
 * 与 sqlite_master.sql 不同，PRAGMA table_info 反映的是当前实际列集合，
 * 能正确处理通过 ALTER TABLE ADD COLUMN 追加的列，避免列缺失导致 INSERT 失败。
 * 对于没有外键约束的表直接跳过；每张表独立 try-catch，一张表失败不影响其余表。
 */
async function removeForeignKeys(db: any): Promise<void> {
  const tables = await db.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fk_mig_bak' ORDER BY name`
  )
  if (!tables || tables.length === 0) return

  for (const table of tables) {
    const tableName: string = table.name
    try {
      // 检查该表是否存在外键约束，没有则跳过
      const fkList = await db.query(`PRAGMA foreign_key_list(${tableName})`)
      if (!fkList || fkList.length === 0) continue

      // 用 PRAGMA table_info 获取当前实际列（含 ALTER TABLE ADD COLUMN 追加的列）
      const colInfo = await db.query(`PRAGMA table_info(${tableName})`)
      const columnNames: string[] = colInfo.map((c: any) => c.name)
      const colList = columnNames.join(', ')

      // 在重命名前读取索引 SQL（保留原始表名引用）
      const idxRows = await db.query(
        `SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='${tableName}' AND sql IS NOT NULL`
      )

      // 用 PRAGMA table_info 重建 CREATE TABLE SQL（不含 FK，含所有当前列）
      const pkCols: any[] = colInfo.filter((c: any) => c.pk > 0).sort((a: any, b: any) => a.pk - b.pk)
      const colDefs: string[] = colInfo.map((c: any) => {
        let def = `"${c.name}" ${c.type || 'TEXT'}`
        if (pkCols.length === 1 && c.pk === 1) def += ' PRIMARY KEY'
        if (c.notnull === 1 && c.pk === 0) def += ' NOT NULL'
        if (c.dflt_value !== null && c.dflt_value !== undefined) def += ` DEFAULT ${c.dflt_value}`
        return def
      })
      if (pkCols.length > 1) {
        colDefs.push(`PRIMARY KEY (${pkCols.map((c: any) => `"${c.name}"`).join(', ')})`)
      }
      const newCreateSql = `CREATE TABLE "${tableName}" (\n  ${colDefs.join(',\n  ')}\n)`

      // 备份 → 重建（无 FK）→ 迁移数据 → 删除备份
      const tempTable = `${tableName}_fk_mig_bak`
      await db.run(`ALTER TABLE "${tableName}" RENAME TO "${tempTable}"`)
      await db.run(newCreateSql)
      await db.run(`INSERT INTO "${tableName}" (${colList}) SELECT ${colList} FROM "${tempTable}"`)
      await db.run(`DROP TABLE "${tempTable}"`)

      // 重建原有索引
      for (const idx of idxRows) {
        try { await db.run(idx.sql) } catch (_) { /* 索引已存在则跳过 */ }
      }
    } catch (e) {
      console.error(`removeForeignKeys: failed for table "${tableName}":`, e)
    }
  }
}

/**
 * 辅助函数：重建表（用于删除列等 SQLite 不直接支持的操作）
 * 使用 create-new → copy-data → drop-old → rename 模式
 */
async function rebuildTable(db: any, tableName: string, createSql: string, columnsToKeep: string[]): Promise<void> {
  const tempTable = `${tableName}_migration_temp`
  const tempCreateSql = createSql.replace(
    `CREATE TABLE IF NOT EXISTS ${tableName}`,
    `CREATE TABLE IF NOT EXISTS ${tempTable}`
  )
  await db.run(tempCreateSql)
  const colList = columnsToKeep.join(', ')
  await db.run(`INSERT INTO ${tempTable} (${colList}) SELECT ${colList} FROM ${tableName}`)
  await db.run(`DROP TABLE ${tableName}`)
  await db.run(`ALTER TABLE ${tempTable} RENAME TO ${tableName}`)
}

export const MIGRATIONS: Migration[] = [
  {
    version: '1.0.0',
    description: '初始版本',
    migrate: async (_db) => {
      // 初始版本无迁移操作
    }
  },
  // ── 新版本迁移在此处追加 ──────────────────────────
  {
    version: '1.0.1',
    description: 'stocks/funds 表确保 status 列存在（兼容 ended 列迁移）',
    migrate: async (db) => {
      // ── funds 表迁移 ──
      const fundsHasStatus = await hasColumn(db, 'funds', 'status')
      const fundsHasEnded = await hasColumn(db, 'funds', 'ended')

      if (!fundsHasStatus) {
        // status 列不存在，需要添加
        await db.run(`ALTER TABLE funds ADD COLUMN status TEXT DEFAULT '开启'`)
        if (fundsHasEnded) {
          // 从 ended 列迁移数据
          await db.run(`UPDATE funds SET status = CASE WHEN ended = 1 THEN '结束' ELSE '开启' END`)
        }
      } else if (fundsHasEnded) {
        // 两列都存在（中间状态），同步空值
        await db.run(`UPDATE funds SET status = CASE WHEN ended = 1 THEN '结束' ELSE '开启' END WHERE status IS NULL OR status = ''`)
      }

      // ── stocks 表迁移 ──
      const stocksHasStatus = await hasColumn(db, 'stocks', 'status')
      const stocksHasEnded = await hasColumn(db, 'stocks', 'ended')

      if (!stocksHasStatus) {
        // status 列不存在，需要添加
        await db.run(`ALTER TABLE stocks ADD COLUMN status TEXT DEFAULT '开启'`)
        if (stocksHasEnded) {
          // 从 ended 列迁移数据
          await db.run(`UPDATE stocks SET status = CASE WHEN ended = 1 THEN '结束' ELSE '开启' END`)
        }
      } else if (stocksHasEnded) {
        // 两列都存在（中间状态），同步空值
        await db.run(`UPDATE stocks SET status = CASE WHEN ended = 1 THEN '结束' ELSE '开启' END WHERE status IS NULL OR status = ''`)
      }
    }
  },
  {
    version: '1.0.2',
    description: '更新时间字段格式',
    migrate: async (db) => {
      // 将系统中所有表的时间字段进行统一，将原本表中不同格式的时间日期改为统一的YYYY-MM-DD HH:mm:ss格式

      // 1. 获取系统中的所有表
      const tables = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      for (const table of tables) {
        if (table.name === 'sqlite_sequence') continue
        if (table.name.indexOf('_new') > -1) {
          db.run(`DROP TABLE ${table.name}`)
        }
        // 2. 获取表中的所有字段
        const columns = await db.query(`PRAGMA table_info(${table.name})`)
        for (const column of columns) {
          // 3. 判断字段类型是否为时间字段
          if (column.name === 'created_at' || column.name === 'updated_at' || column.name.indexOf('_time') > -1) {
            // 4. 更新时间字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d %H:%M:%S', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('_date') > -1) {
            // 5. 更新日期字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d 00:00:00', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          }
        }
      }

    }
  },
  {
    version: '1.0.3',
    description: '更新时间字段格式',
    migrate: async (db) => {
      // 将系统中所有表的时间字段进行统一，将原本表中不同格式的时间日期改为统一的YYYY-MM-DD HH:mm:ss格式

      // 1. 获取系统中的所有表
      const tables = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      for (const table of tables) {
        if (table.name === 'sqlite_sequence') continue
        if (table.name.indexOf('_new') > -1) {
          db.run(`DROP TABLE ${table.name}`)
        }
        // 2. 获取表中的所有字段
        const columns = await db.query(`PRAGMA table_info(${table.name})`)
        for (const column of columns) {
          // 3. 判断字段类型是否为时间字段
          if (column.name === 'created_at' || column.name === 'updated_at' || column.name.indexOf('_time') > -1) {
            // 4. 更新时间字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d %H:%M:%S', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('_date') > -1) {
            // 5. 更新日期字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d 00:00:00', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('amount') > -1 || column.name.indexOf('price') > -1 || column.name.indexOf('fee') > -1 || column.name.indexOf('balance') > -1 || column.name.indexOf('_profit') > -1 || column.name.indexOf('total_') > -1) {
            // 6. 更新 amount 字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = round(${column.name}, 2) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('_nav') > -1 || column.name.indexOf('_shares') > -1 || column.name.indexOf('_rate') > -1) {
            // 7. 更新 amount 字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = round(${column.name}, 4) WHERE ${column.name} IS NOT NULL`);
          }
        }
      }

    }
  },
  {
    version: '1.0.4',
    description: '更新时间字段格式',
    migrate: async (db) => {
      // 将系统中所有表的时间字段进行统一，将原本表中不同格式的时间日期改为统一的YYYY-MM-DD HH:mm:ss格式

      // 1. 获取系统中的所有表
      const tables = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      for (const table of tables) {
        if (table.name === 'sqlite_sequence') continue
        if (table.name.indexOf('_new') > -1) {
          db.run(`DROP TABLE ${table.name}`)
        }
        // 2. 获取表中的所有字段
        const columns = await db.query(`PRAGMA table_info(${table.name})`)
        for (const column of columns) {
          // 3. 判断字段类型是否为时间字段
          if (column.name === 'created_at' || column.name === 'updated_at' || column.name.indexOf('_time') > -1) {
            // 4. 更新时间字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d %H:%M:%S', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('_date') > -1) {
            // 5. 更新日期字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = strftime('%Y-%m-%d 00:00:00', ${column.name}) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('amount') > -1 || column.name.indexOf('price') > -1 || column.name.indexOf('fee') > -1 || column.name.indexOf('balance') > -1 || column.name.indexOf('_profit') > -1 || column.name.indexOf('total_') > -1) {
            // 6. 更新 amount 字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = round(${column.name}, 2) WHERE ${column.name} IS NOT NULL`);
          } else if (column.name.indexOf('_nav') > -1 || column.name.indexOf('_shares') > -1 || column.name.indexOf('_rate') > -1) {
            // 7. 更新 amount 字段为统一格式
            await db.run(`UPDATE ${table.name} SET ${column.name} = round(${column.name}, 4) WHERE ${column.name} IS NOT NULL`);
          }
        }
      }

    }
  },
  {
    version: '1.0.5',
    description: '移除所有表的外键约束（修复版：使用 PRAGMA table_info 重建，避免 sqlite_master 遗漏 ALTER TABLE ADD COLUMN 的列）',
    migrate: async (db) => {
      await removeForeignKeys(db)
    }
  },
  {
    version: '1.0.6',
    description: 'income_expense_records 表添加 is_required 列并回填历史数据；删除已废弃的 categories 表',
    migrate: async (db) => {
      // 1. income_expense_records 表添加 is_required 列
      try {
        await db.run(`ALTER TABLE income_expense_records ADD COLUMN is_required INTEGER DEFAULT 0`)
      } catch (_) { /* 列可能已存在 */ }

      // 2. 回填历史支出记录的 is_required
      const requiredCatIds = ['cat_1', 'cat_4', 'cat_6', 'cat_7', 'cat_8', 'cat_11', 'cat_12', 'cat_22']
      const placeholders = requiredCatIds.map(() => '?').join(', ')
      await db.run(
        `UPDATE income_expense_records SET is_required = 1 WHERE type = '账户支出' AND sub_type IN (${placeholders})`,
        requiredCatIds
      )

      // 3. 删除已废弃的 categories 表（分类现全部来自静态数据）
      await db.run(`DROP TABLE IF EXISTS categories`)
    }
  },
]

/** 获取最新版本号 */
export function getLatestVersion(): string {
  return __APP_VERSION__; //MIGRATIONS[MIGRATIONS.length - 1].version
}

/** 比较语义化版本号，返回 -1 / 0 / 1 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
  }
  return 0
}
