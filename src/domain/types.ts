export type ProductKind =
  | 'box'
  | 'correr'
  | 'pivotante'
  | 'maxiar'
  | 'fixo'
  | 'espelho'
  | 'custom'

export type CorrerSubtype = 'J2F' | 'J4F' | 'P2F' | 'P4F'
export type EspelhoFinish = 'Espelho Lapidado' | 'Espelho Bisotado'

export interface AluminumColor {
  color: string
  surcharge: number
}

export interface PricingConfig {
  version: string
  glassColors: string[]
  aluminumColors: AluminumColor[]
  kitBoxSizesCm: number[]
  temperedThicknessesMm: string[]
  labor: {
    boxAvulso: number
    boxPerM2: number
    temperedPerM2: number
    maxiarAvulso: number
  }
  boxDefaultHeightM: number
  boxSiliconeQty: number
  defaultMarkup: Record<Exclude<ProductKind, 'custom'>, number>
}

export interface Vidro {
  id: number
  codigo: string
  tipo: string
  cor: string
  espessuraMm: string | null
  valorM2: number | null
}

export interface KitBox {
  id: number
  codigo: string
  tipo: string
  cor: string
  tamanhoCm: number
  valor: number | null
}

export interface Acessorio {
  id: number
  codigo: string
  descricao: string
  valor: number
}

export interface Aluminio {
  id: number
  codigo: string
  descricao: string | null
  valorBarra: number
  metragemBarra: number
  valorMetro: number
}

export interface Catalog {
  config: PricingConfig
  vidros: Vidro[]
  kitBox: KitBox[]
  acessorios: Acessorio[]
  aluminios: Aluminio[]
}

export interface BomLine {
  code: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  category: 'vidro' | 'aluminio' | 'ferragem' | 'acessorio' | 'outro'
}

export interface CostBreakdown {
  labor: number
  glass: number
  aluminum: number
  hardware: number
  accessories: number
  extras: number
  totalCost: number
  finalPrice: number
  marginPct: number
  marginAmount: number
  markup: number
}

export interface PricingResult {
  kind: ProductKind
  label: string
  bom: BomLine[]
  breakdown: CostBreakdown
  notes?: string[]
}

export interface BoxInput {
  kind: 'box'
  spanCm: number
  glassColor: string
  profileColor: string
  markup: number
  extras: number
}

export interface CorrerInput {
  kind: 'correr'
  subtype: CorrerSubtype
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  profileColor: string
  markup: number
  extras: number
}

export interface PivotanteInput {
  kind: 'pivotante'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  profileColor: string
  hasLatch: boolean
  markup: number
  extras: number
}

export interface MaxiarInput {
  kind: 'maxiar'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  profileColor: string
  markup: number
  extras: number
}

export interface FixoInput {
  kind: 'fixo'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: number
}

export interface EspelhoInput {
  kind: 'espelho'
  finish: EspelhoFinish
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: number
}

export interface CustomInput {
  kind: 'custom'
  description: string
  amount: number
}

export type ItemInput =
  | BoxInput
  | CorrerInput
  | PivotanteInput
  | MaxiarInput
  | FixoInput
  | EspelhoInput
  | CustomInput

export interface QuoteItem {
  id: string
  input: ItemInput
  result: PricingResult
}

export interface AdditionalCost {
  id: string
  label: string
  amount: number
}

export interface CustomerInfo {
  name?: string
  phone?: string
  address?: string
  notes?: string
}

export type QuoteStatus = 'draft' | 'emitted'

export interface Quote {
  id: string
  number: string
  revision: number
  parentId?: string
  status: QuoteStatus
  createdAt: string
  updatedAt: string
  emittedAt?: string
  customer: CustomerInfo
  items: QuoteItem[]
  additionalCosts: AdditionalCost[]
  pricingVersion: string
  itemsTotal: number
  additionalTotal: number
  grandTotal: number
}

export interface QuoteRepository {
  listQuotes(): Promise<Quote[]>
  getQuote(id: string): Promise<Quote | null>
  saveQuote(quote: Quote): Promise<void>
  deleteQuote(id: string): Promise<void>
  getCatalog(): Promise<Catalog>
  saveCatalog(catalog: Catalog): Promise<void>
  nextQuoteNumber(): Promise<string>
}
