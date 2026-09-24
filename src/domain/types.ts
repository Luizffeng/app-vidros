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

export interface EstablishmentInfo {
  name: string
  tradeName?: string
  /** CNPJ ou CPF */
  document?: string
  phone?: string
  email?: string
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

export interface AppSettings {
  quoteValidityDays: number
  establishment: EstablishmentInfo
  /** Data URL da logo (PNG/JPEG) — usado no PDF */
  logoDataUrl?: string
  /** Última linha da mensagem enviada no WhatsApp */
  shareCta: string
}

/** ativo omitido ou true = disponível no cálculo; false = desativado */
export interface Vidro {
  id: number
  codigo: string
  tipo: string
  cor: string
  espessuraMm: string | null
  valorM2: number | null
  ativo?: boolean
}

export interface KitBox {
  id: number
  codigo: string
  tipo: string
  cor: string
  tamanhoCm: number
  valor: number | null
  ativo?: boolean
}

export interface Acessorio {
  id: number
  codigo: string
  descricao: string
  valor: number
  ativo?: boolean
}

export interface Aluminio {
  id: number
  codigo: string
  descricao: string | null
  valorBarra: number
  metragemBarra: number
  valorMetro: number
  ativo?: boolean
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

export interface ItemExtra {
  id: string
  description: string
  amount: number
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
  extras: ItemExtra[]
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
  extras: ItemExtra[]
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
  extras: ItemExtra[]
}

export interface MaxiarInput {
  kind: 'maxiar'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  profileColor: string
  markup: number
  extras: ItemExtra[]
}

export interface FixoInput {
  kind: 'fixo'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: ItemExtra[]
}

export interface EspelhoInput {
  kind: 'espelho'
  finish: EspelhoFinish
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: ItemExtra[]
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
  /** CEP só dígitos (8) */
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  /** Legado: endereço livre de orçamentos antigos */
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
  /** ISO — validade comercial do orçamento (cliente) */
  validUntil?: string
  customer: CustomerInfo
  items: QuoteItem[]
  additionalCosts: AdditionalCost[]
  discounts: AdditionalCost[]
  pricingVersion: string
  itemsTotal: number
  additionalTotal: number
  discountTotal: number
  grandTotal: number
}

export interface QuoteRepository {
  listQuotes(): Promise<Quote[]>
  getQuote(id: string): Promise<Quote | null>
  saveQuote(quote: Quote): Promise<void>
  deleteQuote(id: string): Promise<void>
  getCatalog(): Promise<Catalog>
  saveCatalog(catalog: Catalog): Promise<void>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  nextQuoteNumber(): Promise<string>
}
