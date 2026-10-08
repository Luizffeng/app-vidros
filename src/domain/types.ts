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

/** empresa: margem sobre tudo; vendedor: mão de obra sem margem; autonomo: sem margem */
export type MarginMode = 'empresa' | 'vendedor' | 'autonomo'

export interface AppSettings {
  quoteValidityDays: number
  marginMode: MarginMode
  /** ISO da última troca de `marginMode` (aviso do rascunho) */
  marginModeChangedAt?: string
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

export type CatalogTable = 'vidros' | 'kitBox' | 'acessorios' | 'aluminios'

/** Linha do catálogo por tabela + id (o código pode repetir entre tabelas) */
export interface CatalogRef {
  table: CatalogTable
  id: number
}

/** Preço só deste orçamento. Mesmo campo editado no catálogo: vidros valorM2, kitBox/acessorios valor, aluminios valorBarra */
export interface PriceOverride {
  ref: CatalogRef
  price: number
}

export interface BomLine {
  code: string
  description: string
  quantity: number
  /** Inclui o acréscimo de cor quando há */
  unitPrice: number
  total: number
  category: 'vidro' | 'aluminio' | 'ferragem' | 'acessorio' | 'mao_de_obra' | 'outro'
  /** Ausente em itens antigos */
  unit?: 'm2' | 'm' | 'un'
  /** Ausente em mão de obra, avulsos e itens antigos */
  source?: CatalogRef
  /** Fração de acréscimo de cor aplicada (0.1 = 10%) */
  surcharge?: number
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
  /** Ausente = empresa (itens anteriores ao cálculo de margem) */
  marginMode?: MarginMode
}

export interface PricingResult {
  kind: ProductKind
  label: string
  bom: BomLine[]
  breakdown: CostBreakdown
  notes?: string[]
}

/** Observação livre do item (ex.: banheiro, 2º andar) — sai no PDF e no texto */
export interface ItemNote {
  note?: string
}

export type LaborKey = 'boxPerM2' | 'temperedPerM2' | 'maxiarAvulso'

export interface ItemLaborRate {
  /** Taxa de mão de obra só deste item (R$/m²; maxim-ar R$/peça). Ausente = taxa do catálogo. */
  laborRate?: number
}

export interface BoxInput extends ItemNote, ItemLaborRate {
  kind: 'box'
  spanCm: number
  glassColor: string
  profileColor: string
  markup: number
  extras: ItemExtra[]
}

export interface CorrerInput extends ItemNote, ItemLaborRate {
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

export interface PivotanteInput extends ItemNote, ItemLaborRate {
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

export interface MaxiarInput extends ItemNote, ItemLaborRate {
  kind: 'maxiar'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  profileColor: string
  markup: number
  extras: ItemExtra[]
}

export interface FixoInput extends ItemNote, ItemLaborRate {
  kind: 'fixo'
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: ItemExtra[]
}

export interface EspelhoInput extends ItemNote, ItemLaborRate {
  kind: 'espelho'
  finish: EspelhoFinish
  widthMm: number
  heightMm: number
  glassColor: string
  thicknessMm: string
  markup: number
  extras: ItemExtra[]
}

export interface CustomInput extends ItemNote {
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
  /** Modo do último cálculo completo. Ausente = empresa */
  marginMode?: MarginMode
  /** Preços só deste orçamento (no máximo um por ref) */
  priceOverrides?: PriceOverride[]
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
