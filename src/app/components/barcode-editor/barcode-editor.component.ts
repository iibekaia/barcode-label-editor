import {Component, signal, computed, inject} from '@angular/core';
import {FieldPaletteComponent} from '../field-palette/field-palette.component';
import {EditorToolbarComponent} from '../editor-toolbar/editor-toolbar.component';
import {LabelCanvasComponent} from '../label-canvas/label-canvas.component';
import {LabelGeneratorService} from '../../services/label-generator.service';
import {BarcodeGeneratorService} from '../../services/barcode-generator.service';
import {PdfGeneratorService} from '../../services/pdf-generator.service';
import {
  LabelTemplate,
  LabelElement,
  BarcodeFormat,
  TextStyle,
  Product,
  DEFAULT_TEMPLATE, BarcodeLabelItem, PaletteItem
} from '../../models/label-template';
import {DEFAULT_TEXT_STYLE} from '../../models/label-template';

@Component({
  selector: 'app-barcode-editor',
  standalone: true,
  imports: [FieldPaletteComponent, EditorToolbarComponent, LabelCanvasComponent],
  templateUrl: './barcode-editor.component.html',
  styleUrl: './barcode-editor.component.scss'
})
export class BarcodeEditorComponent {
  private labelGenerator = inject(LabelGeneratorService);
  private barcodeGenerator = inject(BarcodeGeneratorService);
  private pdfGenerator = inject(PdfGeneratorService);
  readonly template = signal<LabelTemplate>({...DEFAULT_TEMPLATE, id: crypto.randomUUID()});
  readonly selectedId = signal<string | null>(null);
  readonly appliedTemplate = signal<LabelTemplate | null>(null);
  readonly labelItems = this.labelGenerator.buildBarcodeLabelItems();

  constructor() {
  }

  readonly selectedElement = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.template().elements.find((e) => e.id === id) ?? null;
  });

  readonly textStyleForToolbar = computed(() => {
    const el = this.selectedElement();
    return el?.type === 'text' && el.style ? el.style : null;
  });

  mmToPx(mm: number): number {
    return mm * (96 / 25.4);
  }


  getElementStyle(element: LabelElement): Record<string, string> {
    const style: Record<string, string> = {
      position: 'relative',
      left: `${element.left}%`,
      top: `${element.top}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box'
    };
    if (element.type === 'text' && element.style) {
      const s = element.style;
      style['fontFamily'] = s.fontFamily;
      style['fontSize'] = `${s.fontSize}px`;
      style['fontWeight'] = s.bold ? 'bold' : 'normal';
      style['fontStyle'] = s.italic ? 'italic' : 'normal';
      style['textAlign'] = s.align;
      const deco = [s.underline && 'underline', s.strikethrough && 'line-through'].filter(Boolean).join(' ');
      if (deco) style['textDecoration'] = deco;
    }
    return style;
  }

  getElementValue(product: Product, element: LabelElement): string {
    return this.labelGenerator.getValue(product, element);
  }

  getBarcodeDataUrl(product: Product, element: LabelElement): string {
    const tpl = this.appliedTemplate() ?? this.template();
    return this.labelGenerator.getBarcodeDataUrl(product, tpl, element);
  }

  getBarcodeImageUrl(barcode: string): string {
    const tpl = this.appliedTemplate() ?? this.template();
    return this.barcodeGenerator.generateDataUrl(barcode, tpl.barcodeFormat, {width: 2, height: 32});
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(price) + ' UZS';
  }

  productFromItem(item: BarcodeLabelItem): Product {
    return this.labelGenerator.productFromItem(item);
  }

  onElementsChange(elements: LabelElement[]): void {
    this.template.update((t) => ({...t, elements}));
  }

  onFieldAdd(field: PaletteItem): void {
    const template = this.template();
    const containerWidthPx = this.mmToPx(template.widthMm);
    const containerHeightPx = this.mmToPx(template.lengthMm);

    const isBarcode = field.kind === 'barcode';
    const wPx = isBarcode ? 80 : 70;
    const hPx = isBarcode ? 36 : 20;

    const widthPct = (wPx / containerWidthPx) * 100;
    const heightPct = (hPx / containerHeightPx) * 100;

    // Center the element
    const left = Math.max(0, Math.min(100 - widthPct, 50 - widthPct / 2));
    const top = Math.max(0, Math.min(100 - heightPct, 50 - heightPct / 2));

    const newEl: LabelElement = {
      id: crypto.randomUUID(),
      type: isBarcode ? 'barcode' : 'text',
      fieldType: field.type,
      left,
      top,
      width: widthPct,
      height: heightPct,
      style: !isBarcode ? {...DEFAULT_TEXT_STYLE} : undefined,
      sampleValue: field.label
    };

    const updatedElements = [...template.elements, newEl];
    this.template.update((t) => ({...t, elements: updatedElements}));
    this.selectedId.set(newEl.id);
  }

  onTemplateNameChange(name: string): void {
    this.template.update((t) => ({...t, name}));
  }

  private generateNameFromDimensions(widthMm: number, lengthMm: number): string {
    const width = Math.floor(widthMm / 10);
    const length = Math.ceil(lengthMm / 10);
    return `${width}x${length}`;
  }

  onWidthChange(widthMm: number): void {
    const currentTemplate = this.template();
    const newName = this.generateNameFromDimensions(widthMm, currentTemplate.lengthMm);
    this.template.update((t) => ({...t, widthMm, name: newName}));
  }

  onLengthChange(lengthMm: number): void {
    const currentTemplate = this.template();
    const newName = this.generateNameFromDimensions(currentTemplate.widthMm, lengthMm);
    this.template.update((t) => ({...t, lengthMm, name: newName}));
  }

  onBarcodeFormatChange(barcodeFormat: BarcodeFormat): void {
    this.template.update((t) => ({...t, barcodeFormat}));
  }

  onTextStyleChange(patch: Partial<TextStyle>): void {
    const el = this.selectedElement();
    if (!el?.style) return;
    const updated = this.template().elements.map((e) =>
      e.id === el.id ? {...e, style: {...e.style!, ...patch}} : e
    );
    this.template.update((t) => ({...t, elements: updated}));
  }

  onGenerateTemplate(): void {
    const template = this.template();
    this.appliedTemplate.set(template);
    // console.log('Generated Label Template:', JSON.stringify(template, null, 2));
  }

  onPrint(): void {
    const template = this.appliedTemplate() ?? this.template();
    this.pdfGenerator.generateA4Pdf(template, this.labelItems);
  }

  onPrintCard(): void {
    const template = this.appliedTemplate() ?? this.template();
    this.pdfGenerator.generateCardSizePdf(template, this.labelItems);
  }
}
