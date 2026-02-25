import {Injectable} from '@angular/core';
import {BarcodeGeneratorService} from './barcode-generator.service';
import {
  BarcodeLabelItem,
  BARCODES,
  LabelElement,
  LabelTemplate,
  Product, RANDOM_PRICES,
  RANDOM_TITLES, ResizeHandle
} from '../models/label-template';


@Injectable({providedIn: 'root'})
export class LabelGeneratorService {
  readonly MIN_ELEMENT_PCT = 3;

  constructor(private barcode: BarcodeGeneratorService) {
  }

  getValue(product: Product, element: LabelElement): string {
    return this.barcode.getValueForElement(product, element);
  }

  getBarcodeDataUrl(product: Product, template: LabelTemplate, element: LabelElement): string {
    const value = this.getValue(product, element);
    return this.barcode.generateDataUrl(value, template.barcodeFormat, {width: 2, height: 40});
  }


  buildBarcodeLabelItems(): BarcodeLabelItem[] {
    return BARCODES.map((barcode, i) => ({
      id: String(i + 1),
      barcode,
      title: RANDOM_TITLES[i] ?? `Product ${i + 1}`,
      price: RANDOM_PRICES[i] ?? 100000
    }));
  }

  productFromItem(item: BarcodeLabelItem): Product {
    return {
      id: item.id,
      name: item.title,
      barcode: item.barcode,
      salePrice: item.price,
      article: `ART-${item.id.padStart(3, '0')}`
    };
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(value) + ' UZS';
  }


  computeResizeDimensions(
    handle: ResizeHandle,
    left: number,
    top: number,
    width: number,
    height: number,
    dx: number,
    dy: number
  ): { newLeft: number; newTop: number; newWidth: number; newHeight: number } {
    let newLeft = left;
    let newTop = top;
    let newWidth = width;
    let newHeight = height;
    if (handle === 'se') {
      newWidth = Math.max(this.MIN_ELEMENT_PCT, width + dx);
      newHeight = Math.max(this.MIN_ELEMENT_PCT, height + dy);
    } else if (handle === 'sw') {
      newLeft = left + dx;
      newWidth = Math.max(this.MIN_ELEMENT_PCT, width - dx);
      newHeight = Math.max(this.MIN_ELEMENT_PCT, height + dy);
      if (newWidth <= this.MIN_ELEMENT_PCT) {
        newLeft = left + width - this.MIN_ELEMENT_PCT;
        newWidth = this.MIN_ELEMENT_PCT;
      }
    } else if (handle === 'ne') {
      newTop = top + dy;
      newWidth = Math.max(this.MIN_ELEMENT_PCT, width + dx);
      newHeight = Math.max(this.MIN_ELEMENT_PCT, height - dy);
      if (newHeight <= this.MIN_ELEMENT_PCT) {
        newTop = top + height - this.MIN_ELEMENT_PCT;
        newHeight = this.MIN_ELEMENT_PCT;
      }
    } else {
      newLeft = left + dx;
      newTop = top + dy;
      newWidth = Math.max(this.MIN_ELEMENT_PCT, width - dx);
      newHeight = Math.max(this.MIN_ELEMENT_PCT, height - dy);
      if (newWidth <= this.MIN_ELEMENT_PCT) {
        newLeft = left + width - this.MIN_ELEMENT_PCT;
        newWidth = this.MIN_ELEMENT_PCT;
      }
      if (newHeight <= this.MIN_ELEMENT_PCT) {
        newTop = top + height - this.MIN_ELEMENT_PCT;
        newHeight = this.MIN_ELEMENT_PCT;
      }
    }
    return {
      newLeft: Math.max(0, Math.min(100 - newWidth, newLeft)),
      newTop: Math.max(0, Math.min(100 - newHeight, newTop)),
      newWidth,
      newHeight
    };
  }
}
