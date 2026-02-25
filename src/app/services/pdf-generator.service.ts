import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { BarcodeGeneratorService } from './barcode-generator.service';
import { LabelGeneratorService } from './label-generator.service';
import {
  BarcodeLabelItem,
  LabelElement,
  LabelTemplate,
  Product,
  TextStyle,
} from '../models/label-template';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  constructor(
    private barcodeService: BarcodeGeneratorService,
    private labelService: LabelGeneratorService
  ) {}

  generateCardSizePdf(template: LabelTemplate, items: BarcodeLabelItem[]): void {
    if (!items.length) return;

    const { widthMm, lengthMm } = template;
    const orientation = widthMm > lengthMm ? 'l' : 'p';
    const doc = new jsPDF({ orientation, unit: 'mm', format: [widthMm, lengthMm] });

    items.forEach((item, i) => {
      if (i > 0) doc.addPage([widthMm, lengthMm], orientation);
      const product = this.labelService.productFromItem(item);
      this.renderLabel(doc, template, product, 0, 0);
    });

    this.printPdf(doc);
  }

  generateA4Pdf(template: LabelTemplate, items: BarcodeLabelItem[]): void {
    if (!items.length) return;

    const { widthMm, lengthMm } = template;
    const pageW = 210;
    const pageH = 297;
    const margin = 5;
    const gap = 2;

    const cols = Math.max(1, Math.floor((pageW - 2 * margin + gap) / (widthMm + gap)));
    const rows = Math.max(1, Math.floor((pageH - 2 * margin + gap) / (lengthMm + gap)));
    const perPage = cols * rows;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    items.forEach((item, i) => {
      const pageIdx = Math.floor(i / perPage);
      const posInPage = i % perPage;

      if (pageIdx > 0 && posInPage === 0) doc.addPage('a4', 'portrait');

      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = margin + col * (widthMm + gap);
      const y = margin + row * (lengthMm + gap);

      const product = this.labelService.productFromItem(item);
      this.renderLabel(doc, template, product, x, y);
    });

    this.printPdf(doc);
  }

  private printPdf(doc: jsPDF): void {
    const blobUrl = doc.output('bloburl') as unknown as string;
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  }

  private renderLabel(
    doc: jsPDF,
    template: LabelTemplate,
    product: Product,
    offsetX: number,
    offsetY: number
  ): void {
    const { widthMm, lengthMm, elements } = template;

    if (elements.length === 0) {
      this.renderFallbackLabel(doc, template, product, offsetX, offsetY);
      return;
    }

    for (const el of elements) {
      const x = offsetX + (el.left / 100) * widthMm;
      const y = offsetY + (el.top / 100) * lengthMm;
      const w = (el.width / 100) * widthMm;
      const h = (el.height / 100) * lengthMm;

      if (el.type === 'text') {
        this.renderText(doc, product, el, x, y, w, h);
      } else {
        this.renderBarcode(doc, product, template, el, x, y, w, h);
      }
    }
  }

  private renderFallbackLabel(
    doc: jsPDF,
    template: LabelTemplate,
    product: Product,
    offsetX: number,
    offsetY: number
  ): void {
    const { widthMm, lengthMm } = template;

    const barcodeDataUrl = this.barcodeService.generateDataUrl(
      product.barcode,
      template.barcodeFormat,
      { width: 4, height: 80 }
    );
    if (barcodeDataUrl) {
      const bw = widthMm * 0.8;
      const bh = lengthMm * 0.45;
      const bx = offsetX + (widthMm - bw) / 2;
      const by = offsetY + lengthMm * 0.05;
      doc.addImage(barcodeDataUrl, 'PNG', bx, by, bw, bh);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const truncatedTitle = this.truncateText(doc, product.name, widthMm * 0.9);
    doc.text(truncatedTitle, offsetX + widthMm / 2, offsetY + lengthMm * 0.6, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setFontSize(7);
    const price = this.labelService.formatPrice(product.salePrice);
    doc.text(price, offsetX + widthMm / 2, offsetY + lengthMm * 0.8, {
      align: 'center',
      baseline: 'middle',
    });
  }

  private renderText(
    doc: jsPDF,
    product: Product,
    element: LabelElement,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const value = this.labelService.getValue(product, element);
    if (!value) return;

    const style = element.style;
    const fontSizePt = style ? style.fontSize * 0.75 : 8;
    const fontFamily = this.mapFont(style?.fontFamily);
    const fontStyle = this.mapFontStyle(style);
    const align = style?.align ?? 'center';

    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSizePt);

    let textX: number;
    switch (align) {
      case 'left':
        textX = x;
        break;
      case 'right':
        textX = x + w;
        break;
      default:
        textX = x + w / 2;
        break;
    }

    const textY = y + h / 2;
    const truncated = this.truncateText(doc, value, w);

    doc.text(truncated, textX, textY, { align, baseline: 'middle' });

    if (style?.underline || style?.strikethrough) {
      const tw = Math.min(doc.getTextWidth(truncated), w);
      let lineX: number;
      switch (align) {
        case 'left':
          lineX = x;
          break;
        case 'right':
          lineX = x + w - tw;
          break;
        default:
          lineX = x + (w - tw) / 2;
          break;
      }

      const fontSizeMm = fontSizePt * 0.3528;
      doc.setLineWidth(0.1);

      if (style!.underline) {
        const uy = textY + fontSizeMm * 0.15;
        doc.line(lineX, uy, lineX + tw, uy);
      }

      if (style!.strikethrough) {
        doc.line(lineX, textY, lineX + tw, textY);
      }
    }
  }

  private renderBarcode(
    doc: jsPDF,
    product: Product,
    template: LabelTemplate,
    element: LabelElement,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const value = this.labelService.getValue(product, element);
    const dataUrl = this.barcodeService.generateDataUrl(value, template.barcodeFormat, {
      width: 4,
      height: 80,
    });
    if (!dataUrl) return;

    doc.addImage(dataUrl, 'PNG', x, y, w, h);
  }

  private truncateText(doc: jsPDF, text: string, maxWidth: number): string {
    if (doc.getTextWidth(text) <= maxWidth) return text;

    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (doc.getTextWidth(text.substring(0, mid) + '…') <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo > 0 ? text.substring(0, lo) + '…' : text.charAt(0);
  }

  private mapFont(fontFamily?: string): string {
    if (!fontFamily) return 'helvetica';
    const lower = fontFamily.toLowerCase();
    if (lower.includes('courier') || lower.includes('mono')) return 'courier';
    if (lower.includes('times') || (lower.includes('serif') && !lower.includes('sans')))
      return 'times';
    return 'helvetica';
  }

  private mapFontStyle(style?: TextStyle): string {
    if (!style) return 'normal';
    if (style.bold && style.italic) return 'bolditalic';
    if (style.bold) return 'bold';
    if (style.italic) return 'italic';
    return 'normal';
  }
}
