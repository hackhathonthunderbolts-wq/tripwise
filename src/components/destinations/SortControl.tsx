import { ArrowDownNarrowWide, ArrowUpDown } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

export type SortMode = 'distance' | 'name'

interface SortControlProps {
  value: SortMode
  onChange: (value: SortMode) => void
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <SegmentedControl
      label="Sort results"
      value={value}
      onChange={onChange}
      options={[
        { value: 'distance', label: 'Nearest', icon: <ArrowDownNarrowWide className="h-3.5 w-3.5" /> },
        { value: 'name', label: 'Alphabetical', icon: <ArrowUpDown className="h-3.5 w-3.5" /> },
      ]}
    />
  )
}
