'use client'

import { BuildingInfo } from '../sub-components/building-info'

interface RulesSectionProps {
  rules: string | null
}

export function RulesSection({ rules }: RulesSectionProps) {
  if (!rules) return null

  return (
    <div className="bg-canvas border border-hairline p-5 rounded-xl shadow-sm">
      <BuildingInfo rules={rules} />
    </div>
  )
}
