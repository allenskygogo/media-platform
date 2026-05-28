import { useAuth } from '../../context/AuthContext'
import TrialHome    from './TrialHome'
import StandardHome from './StandardHome'
import PremiumHome  from './PremiumHome'

export default function DashboardHome() {
  const { currentUser } = useAuth()
  if (currentUser.tier === 'basic')    return <TrialHome />
  if (currentUser.tier === 'standard') return <StandardHome />
  return <PremiumHome />  // advanced (managed users have their own layout)
}
