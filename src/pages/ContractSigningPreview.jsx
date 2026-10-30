import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { plans } from '../data/plans'
import { PlanCheckoutPreview } from './dashboard/Profile'
import './ContractSigningPreview.css'

const previewUser = { name: '測試學員', email: 'preview@example.test' }
const previewPlans = plans.filter(plan => ['online', 'creator', 'master'].includes(plan.id))

function PreviewForm({ plan }) {
  const [acceptedContract, setAcceptedContract] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [revision, setRevision] = useState(0)
  const reset = () => {
    setAcceptedContract(false)
    setCheckoutStep(1)
    setRevision(value => value + 1)
  }

  return <PlanCheckoutPreview
    key={revision}
    plan={plan}
    currentUser={previewUser}
    billingCycle="annual"
    acceptedContract={acceptedContract}
    setAcceptedContract={setAcceptedContract}
    checkoutStep={checkoutStep}
    setCheckoutStep={setCheckoutStep}
    onClose={reset}
    signingOnly
    previewOnly
  />
}

export default function ContractSigningPreview() {
  const [params] = useSearchParams()
  const plan = params.getAll('plan').length === 1 ? previewPlans.find(item => item.id === params.get('plan')) : null

  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [])

  return <main className="signing-demo-page">
    <div className="signing-demo-content">
      <header className="signing-demo-head">
        <div>
          <p>TOP LEVEL TRAFFIC</p>
          <h1>線上簽署測試預覽</h1>
        </div>
        {plan && <strong className="signing-demo-plan">{plan.name}</strong>}
      </header>
      <div className="signing-demo-notice" role="note">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>僅供測試，不代表正式簽署。姓名與電話皆為範例，請勿填入真實個資；此頁不會送出簽名、扣款或開通會員。</p>
      </div>
      {plan ? <PreviewForm key={plan.id} plan={plan} /> : <p className="auth-alert error">簽署方案無效，請從後台重新複製對應方案的連結。</p>}
    </div>
  </main>
}
