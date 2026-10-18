import { Chip } from '@/components/ui/SegmentedControl'
import { CATEGORY_LIST } from '@/lib/categories'
import type { PlaceCategory } from '@/types'

interface CategoryFilterProps {
  value: PlaceCategory[]
  onChange: (categories: PlaceCategory[]) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const allActive = value.length === 0
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={allActive} onClick={() => onChange([])}>
        All categories
      </Chip>
      {CATEGORY_LIST.map((category) => {
        const active = value.includes(category.value)
        return (
          <Chip
            key={category.value}
            active={active}
            onClick={() => {
              if (active) onChange(value.filter((key) => key !== category.value))
              else onChange([...value, category.value])
            }}
          >
            {category.label}
          </Chip>
        )
      })}
    </div>
  )
}
