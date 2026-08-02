export function isCatalogItemActive(item: { ativo?: boolean }): boolean {
  return item.ativo !== false
}
