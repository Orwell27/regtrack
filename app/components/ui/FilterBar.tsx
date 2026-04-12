'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useCallback } from 'react'

type FilterOption = { value: string; label: string }

type FilterConfig = {
  key: string
  placeholder: string
  options: FilterOption[]
}

type Props = {
  filters: FilterConfig[]
  searchKey?: string
  searchPlaceholder?: string
}

export function FilterBar({ filters, searchKey, searchPlaceholder }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {searchKey && (
        <Input
          placeholder={searchPlaceholder ?? 'Buscar...'}
          defaultValue={searchParams.get(searchKey) ?? ''}
          onChange={e => updateParam(searchKey, e.target.value)}
          className="w-48 h-8 text-sm"
        />
      )}
      {filters.map(filter => (
        <Select
          key={filter.key}
          defaultValue={searchParams.get(filter.key) ?? 'all'}
          onValueChange={val => updateParam(filter.key, val ?? '')}
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{filter.placeholder}</SelectItem>
            {filter.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
