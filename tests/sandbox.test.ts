import { describe, it, expect, beforeEach } from 'vitest'
import { resetTestDatabase, seedTestData } from './utils/testDb'
import db from '../src/database/index.js'
import {
  computeSandbox,
  saveSandboxSimulation,
  getSandboxHistoryList,
  getSandboxHistoryById,
  getSandboxResultByHistoryId,
  softDeleteSandboxHistory,
  getSceneByType,
  SCENES
} from '../src/services/sandbox/sandboxService'

describe('Sandbox Simulation Module', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    await seedTestData(db)
  })

  // ==================== Scene Definitions ====================
  describe('Scene Definitions', () => {
    it('should have exactly 14 preset scenes', () => {
      expect(SCENES.length).toBe(14)
    })

    it('should return scene by type', () => {
      const scene = getSceneByType(1)
      expect(scene).toBeDefined()
      expect(scene?.name).toBe('失业维持时长推演')
    })

    it('should return undefined for invalid scene type', () => {
      const scene = getSceneByType(99)
      expect(scene).toBeUndefined()
    })

    it('all 14 scenes should have required fields', () => {
      for (const scene of SCENES) {
        expect(scene.sceneType, `sceneType missing for ${scene.name}`).toBeTypeOf('number')
        expect(scene.name, `name missing`).toBeTruthy()
        expect(scene.desc, `desc missing for ${scene.name}`).toBeTruthy()
        expect(scene.icon, `icon missing for ${scene.name}`).toBeTruthy()
        expect(Array.isArray(scene.paramSchema), `paramSchema missing for ${scene.name}`).toBe(true)
        expect(scene.paramSchema.length, `paramSchema empty for ${scene.name}`).toBeGreaterThan(0)
      }
    })

    it('scene types should be sequential 1..14', () => {
      const types = SCENES.map(s => s.sceneType).sort((a, b) => a - b)
      expect(types).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    })

    it('should return all 14 scenes by type lookup', () => {
      for (let i = 1; i <= 14; i++) {
        const scene = getSceneByType(i)
        expect(scene, `scene ${i} not found`).toBeDefined()
        expect(scene?.sceneType).toBe(i)
      }
    })
  })

  // ==================== Simulation Engine ====================
  describe('Simulation Engine', () => {
    it('should compute unemployment survival scenario', async () => {
      const result = await computeSandbox(1, { retain_passive_income: true, suspend_expense: false })
      expect(result.history.scene_type).toBe(1)
      expect(result.history.scene_name).toBe('失业维持时长推演')
      expect(result.result.survival_months).toBeGreaterThan(0)
      expect(result.result.net_assets).toBeDefined()
      expect(result.result.cash_flow_monthly).toBeDefined()
      expect(result.result.chart_x).toBeDefined()
      expect(result.result.chart_net_assets).toBeDefined()
      expect(result.result.conclusion).toContain('失业')
    })

    it('should compute debt rate increase scenario', async () => {
      const result = await computeSandbox(2, { rate_increase: 1.5 })
      expect(result.history.scene_type).toBe(2)
      expect(result.result.monthly_payment_change).toBeGreaterThan(0)
      expect(result.result.total_interest_change).toBeGreaterThan(0)
      expect(result.result.conclusion).toContain('利率')
    })

    it('should compute stock decline scenario', async () => {
      const result = await computeSandbox(3, { decline_rate: 20, hold_quantity: true })
      expect(result.history.scene_type).toBe(3)
      expect(result.result.net_assets).toBeLessThan(0)
      expect(result.result.cash_flow_change).toContain('无变化')
    })

    it('should compute monthly deposit scenario', async () => {
      const result = await computeSandbox(4, { monthly_deposit: 1000, simulate_period: 12 })
      expect(result.history.scene_type).toBe(4)
      expect(result.result.net_assets).toBeDefined()
      expect(JSON.parse(result.result.chart_x).length).toBe(12)
    })

    it('should compute early repayment scenario', async () => {
      const result = await computeSandbox(5, { repay_amount: 30000 })
      expect(result.history.scene_type).toBe(5)
      expect(result.result.interest_save).toBeGreaterThan(0)
      expect(result.result.monthly_payment_change).toBeLessThan(0)
    })

    it('should compute income increase scenario', async () => {
      const result = await computeSandbox(6, { rise_rate: 10, simulate_period: 12 })
      expect(result.history.scene_type).toBe(6)
      expect(result.result.cash_flow_monthly).toBeDefined()
    })

    it('should compute large expense scenario', async () => {
      const result = await computeSandbox(7, { expense_amount: 10000, fund_source: 'current_assets' })
      expect(result.history.scene_type).toBe(7)
      expect(result.result.net_assets).toBeLessThan(0)
    })

    it('should compute income decline scenario', async () => {
      const result = await computeSandbox(8, { decline_rate: 20, simulate_period: 12 })
      expect(result.history.scene_type).toBe(8)
      expect(result.result.cash_flow_monthly).toBeLessThan(0)
    })

    it('should compute investment liquidation scenario', async () => {
      const result = await computeSandbox(9, { sell_ratio: 50, fund_use: 'debt_repay' })
      expect(result.history.scene_type).toBe(9)
      expect(result.result.monthly_payment_change).toBeLessThanOrEqual(0)
    })

    it('should compute new debt scenario', async () => {
      const result = await computeSandbox(10, { debt_amount: 50000, annual_rate: 8, repay_period: 24 })
      expect(result.history.scene_type).toBe(10)
      expect(result.result.monthly_payment_change).toBeGreaterThan(0)
    })

    it('should compute emergency fund shortage scenario', async () => {
      const result = await computeSandbox(11, { target_months: 6, supplement_period: 12 })
      expect(result.history.scene_type).toBe(11)
    })

    it('should compute investment loss scenario', async () => {
      const result = await computeSandbox(12, { loss_rate: 15, hold_period: 6 })
      expect(result.history.scene_type).toBe(12)
      expect(result.result.net_assets).toBeLessThan(0)
    })

    it('should compute fixed expense increase scenario', async () => {
      const result = await computeSandbox(13, { increase_amount: 500, increase_period: 12 })
      expect(result.history.scene_type).toBe(13)
    })

    it('should compute passive income increase scenario', async () => {
      const result = await computeSandbox(14, { increase_amount: 500, stable_period: 24 })
      expect(result.history.scene_type).toBe(14)
      expect(result.result.cash_flow_monthly).toBeGreaterThan(0)
    })

    it('history.params should be a valid JSON string of input params', async () => {
      const params = { retain_passive_income: false, suspend_expense: true }
      const { history } = await computeSandbox(1, params)
      expect(() => JSON.parse(history.params)).not.toThrow()
      expect(JSON.parse(history.params)).toMatchObject(params)
    })

    it('all chart arrays should have matching lengths', async () => {
      const { result } = await computeSandbox(4, { monthly_deposit: 500, simulate_period: 24 })
      const chartX: any[] = JSON.parse(result.chart_x)
      const chartNet: any[] = JSON.parse(result.chart_net_assets)
      const chartCash: any[] = JSON.parse(result.chart_cash_flow)
      const chartDebt: any[] = JSON.parse(result.chart_debt)
      expect(chartNet.length).toBe(chartX.length)
      expect(chartCash.length).toBe(chartX.length)
      expect(chartDebt.length).toBe(chartX.length)
    })

    it('result conclusion should be non-empty for all 14 scenarios', async () => {
      const testParams: Record<number, any> = {
        1: { retain_passive_income: true },
        2: { rate_increase: 1 },
        3: { decline_rate: 10 },
        4: { monthly_deposit: 500 },
        5: { repay_amount: 10000 },
        6: { rise_rate: 10 },
        7: { expense_amount: 5000 },
        8: { decline_rate: 10 },
        9: { sell_ratio: 30 },
        10: { debt_amount: 20000, annual_rate: 6, repay_period: 12 },
        11: { target_months: 3 },
        12: { loss_rate: 10 },
        13: { increase_amount: 300 },
        14: { increase_amount: 300 }
      }
      for (let i = 1; i <= 14; i++) {
        const { result } = await computeSandbox(i, testParams[i])
        expect(result.conclusion, `conclusion empty for scene ${i}`).toBeTruthy()
        expect(result.debt_pressure_level, `debt_pressure_level missing for scene ${i}`).toBeGreaterThanOrEqual(1)
      }
    })

    it('result should always have all chart fields as valid JSON', async () => {
      const { result } = await computeSandbox(1, { retain_passive_income: true })
      expect(() => JSON.parse(result.chart_x)).not.toThrow()
      expect(() => JSON.parse(result.chart_net_assets)).not.toThrow()
      expect(() => JSON.parse(result.chart_cash_flow)).not.toThrow()
      expect(() => JSON.parse(result.chart_debt)).not.toThrow()
    })

    it('result id should be derived from history id', async () => {
      const { history, result } = await computeSandbox(3, { decline_rate: 15 })
      expect(result.id).toContain(history.id!)
      expect(result.history_id).toBe(history.id)
    })
  })

  // ==================== Persistence ====================
  describe('Persistence', () => {
    it('should save and retrieve simulation history', async () => {
      const historyId = await saveSandboxSimulation(1, { retain_passive_income: true, suspend_expense: false })
      expect(historyId).toBeTruthy()

      const history = await getSandboxHistoryById(historyId as number)
      expect(history).not.toBeNull()
      expect(history?.scene_type).toBe(1)

      const result = await getSandboxResultByHistoryId(historyId as number)
      expect(result).not.toBeNull()
      expect(result?.history_id).toBe(historyId)
    })

    it('should list all simulation histories', async () => {
      await saveSandboxSimulation(1, { retain_passive_income: true })
      await saveSandboxSimulation(2, { rate_increase: 1 })

      const histories = await getSandboxHistoryList()
      expect(histories.length).toBe(2)
    })

    it('should soft delete simulation history', async () => {
      const historyId = await saveSandboxSimulation(1, { retain_passive_income: true })
      await softDeleteSandboxHistory(historyId as string)

      const history = await getSandboxHistoryById(historyId as any)
      expect(history).toBeNull()

      const histories = await getSandboxHistoryList()
      expect(histories.length).toBe(0)
    })

    it('getSandboxHistoryById should return null for non-existent id', async () => {
      const result = await getSandboxHistoryById(999999 as any)
      expect(result).toBeNull()
    })

    it('getSandboxResultByHistoryId should return null for non-existent history id', async () => {
      const result = await getSandboxResultByHistoryId(999999 as any)
      expect(result).toBeNull()
    })

    it('getSandboxHistoryList should return empty array when no history exists', async () => {
      const histories = await getSandboxHistoryList()
      expect(histories).toEqual([])
    })

    it('soft delete should not affect other histories', async () => {
      const id1 = await saveSandboxSimulation(1, { retain_passive_income: true })
      const id2 = await saveSandboxSimulation(2, { rate_increase: 1 })

      await softDeleteSandboxHistory(id1 as string)

      const histories = await getSandboxHistoryList()
      expect(histories.length).toBe(1)
      expect(histories[0].scene_type).toBe(2)
    })

    it('saveSandboxSimulation should write both history and result to DB', async () => {
      const historyId = await saveSandboxSimulation(4, { monthly_deposit: 1000, simulate_period: 12 })

      const historyRows = await db.query(`SELECT * FROM sandbox_history WHERE id = ?`, [historyId])
      expect(historyRows.length).toBe(1)
      expect(historyRows[0].scene_type).toBe(4)
      expect(historyRows[0].is_deleted).toBe(0)

      const resultRows = await db.query(`SELECT * FROM sandbox_result WHERE history_id = ?`, [historyId])
      expect(resultRows.length).toBe(1)
      expect(JSON.parse(resultRows[0].chart_x).length).toBe(12)
    })

    it('saved history should store params as JSON string', async () => {
      const params = { rate_increase: 2.5 }
      const historyId = await saveSandboxSimulation(2, params)
      const history = await getSandboxHistoryById(historyId as number)
      expect(history?.params).toBeTruthy()
      const parsed = JSON.parse(history?.params!)
      expect(parsed.rate_increase).toBe(2.5)
    })

    it('saved result should contain valid chart data', async () => {
      const historyId = await saveSandboxSimulation(1, { retain_passive_income: true })
      const result = await getSandboxResultByHistoryId(historyId as number)
      expect(result).not.toBeNull()
      expect(() => JSON.parse(result!.chart_x)).not.toThrow()
      expect(() => JSON.parse(result!.chart_net_assets)).not.toThrow()
      expect(() => JSON.parse(result!.chart_cash_flow)).not.toThrow()
      expect(() => JSON.parse(result!.chart_debt)).not.toThrow()
    })
  })
})
