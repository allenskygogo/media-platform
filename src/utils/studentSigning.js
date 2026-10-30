import { signingPath } from '../../shared/memberAccess.js'
import { getPlanById, getPlanByTier } from '../data/plans.js'

export const SIGNABLE_PLAN_IDS = ['online', 'creator', 'master']

export function studentSigningPlan(user, selectedPlanId) {
  if (selectedPlanId && !SIGNABLE_PLAN_IDS.includes(selectedPlanId)) throw new Error('簽署方案無效，請重新選擇。')
  const planId = selectedPlanId || user.planId || getPlanByTier(user.tier)?.id
  return getPlanById(SIGNABLE_PLAN_IDS.includes(planId) ? planId : 'online')
}

export function studentSigningLinks(origin, user, selectedPlanId) {
  const plan = studentSigningPlan(user, selectedPlanId)
  return {
    plan,
    signing: new URL(signingPath(plan.id, user.id), origin).href,
    preview: new URL(`/preview/signing?${new URLSearchParams({ plan: plan.id })}`, origin).href,
  }
}
