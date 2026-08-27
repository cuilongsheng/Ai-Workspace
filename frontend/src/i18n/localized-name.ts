export interface LocalizedName {
  name: string
  nameEn?: string | null
}

export function localizedName(
  item: LocalizedName | null | undefined,
  language: string | undefined,
) {
  if (!item) return ''
  return language?.startsWith('en') && item.nameEn?.trim()
    ? item.nameEn
    : item.name
}
