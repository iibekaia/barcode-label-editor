import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';
import type { BarcodeFormat, LabelElement, Product } from '../models/label-template';

const BARCODE_OPTIONS = { displayValue: true, margin: 4 };

@Injectable({ providedIn: 'root' })
export class BarcodeGeneratorService {
  generateDataUrl(value: string, format: BarcodeFormat, options?: { width?: number; height?: number }): string {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, value, {
        format,
        width: options?.width ?? 2,
        height: options?.height ?? 40,
        ...BARCODE_OPTIONS
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  getValueForElement(product: Product, element: LabelElement): string {
    switch (element.fieldType) {
      case 'name':
        return product.name ?? '';
      case 'barcode':
        return product.barcode ?? '';
      case 'salePrice':
        return product.salePrice != null ? formatPrice(product.salePrice) : '';
      case 'article':
        return product.article ?? '';
      case 'custom':
        return (product[element.customKey ?? ''] as string) ?? '';
      default:
        return '';
    }
  }
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + ' UZS';
}
