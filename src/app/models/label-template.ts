/**
 * Field types that can be placed on the label (map to product properties).
 */
export type LabelFieldType = 'name' | 'barcode' | 'salePrice' | 'article' | 'custom';

/**
 * Supported barcode formats (jsBarcode).
 */
export type BarcodeFormat =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode';

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  align: 'left' | 'center' | 'right';
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Gilroy, sans-serif',
  fontSize: 16,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  align: 'center'
};

export interface LabelElement {
  id: string;
  type: 'text' | 'barcode';
  fieldType: LabelFieldType;
  customKey?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  style?: TextStyle;
  sampleValue?: string;
}

export interface LabelTemplate {
  id: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  barcodeFormat: BarcodeFormat;
  elements: LabelElement[];
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  salePrice: number;
  article?: string;

  [key: string]: unknown;
}

export const DEFAULT_TEMPLATE: LabelTemplate = {
  id: crypto.randomUUID(),
  name: '4x3',
  widthMm: 43,
  lengthMm: 23,
  barcodeFormat: 'CODE128',
  elements: []
};

export const BARCODES: string[] = [
  '830145672901',
  '472910356284',
  '915284703612',
  '608391274560',
  '759203184726',
  '184726395801',
  '390175284603',
  '526709183452',
  '703918254670',
  '264580193746'
];

export const RANDOM_TITLES = [
  'Basic Shirt title title title title title title title title title title title title', 'Classic Jeans', 'Cotton T-Shirt', 'Denim Jacket', 'Summer Dress',
  'Sport Shorts', 'Wool Sweater', 'Leather Boots', 'Canvas Backpack', 'Baseball Cap'
];

export const RANDOM_PRICES = [199000, 299000, 149000, 399000, 349000, 179000, 449000, 599000, 249000, 99000];

export interface BarcodeLabelItem {
  id: string;
  barcode: string;
  title: string;
  price: number;
}

export type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw';

export interface ResizeState {
  id: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  containerRect: DOMRect;
  baseFontSize?: number;
}

export interface DragState {
  id: string;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  containerRect: DOMRect;
}


export interface PaletteItem {
  type: LabelFieldType;
  label: string;
  kind: 'text' | 'barcode';
}

export const PALETTE_FIELDS: PaletteItem[] = [
  {type: 'name', label: 'Name', kind: 'text'},
  {type: 'barcode', label: 'Barcode', kind: 'barcode'},
  {type: 'salePrice', label: 'Sale Price', kind: 'text'},
  {type: 'article', label: 'Article', kind: 'text'}
];

export const BARCODE_FORMATS: BarcodeFormat[] = [
  'CODE128',
  'CODE39',
  'EAN13',
  'EAN8',
  'UPC',
  'ITF14',
  'MSI',
  'pharmacode'
];

