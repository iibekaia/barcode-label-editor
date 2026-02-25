import {Component, input, output, signal, computed, effect, inject} from '@angular/core';
import { BarcodeGeneratorService } from '../../services/barcode-generator.service';
import {BARCODES, DragState, LabelElement, LabelTemplate, ResizeHandle, ResizeState} from '../../models/label-template';
import { DEFAULT_TEXT_STYLE } from '../../models/label-template';
import {LabelGeneratorService} from '../../services/label-generator.service';

@Component({
  selector: 'app-label-canvas',
  standalone: true,
  templateUrl: './label-canvas.component.html',
  styleUrl: './label-canvas.component.scss'
})
export class LabelCanvasComponent {
  private labelGenerator = inject(LabelGeneratorService);
  template = input.required<LabelTemplate>();
  sampleProduct = input<{ name: string; barcode: string; salePrice: number; article?: string }>({
    name: 'Basic Shirt',
    barcode: BARCODES[0],
    salePrice: 199000,
    article: 'ART-001'
  });

  readonly elementSelected = output<LabelElement | null>();
  readonly elementsChange = output<LabelElement[]>();
  readonly generateTemplate = output<any>();

  selectedId = signal<string | null>(null);
  editingId = signal<string | null>(null);
  draggingElementId = signal<string | null>(null);
  resizeState = signal<ResizeState | null>(null);
  dragState = signal<DragState | null>(null);
  private resizeListenersBound = false;
  private dragListenersBound = false;
  selectedElement = computed(() => {
    const id = this.selectedId();
    const el = this.template().elements.find((e) => e.id === id);
    this.generateTemplate.emit(true)
    return el ?? null;
  });

  constructor(private barcodeGenerator: BarcodeGeneratorService) {
    effect(() => {
      this.elementSelected.emit(this.selectedElement() ?? null);
    });
    effect(() => {
      const editingId = this.editingId();
      if (editingId) {
        setTimeout(() => {
          const editableElement = document.querySelector(`[data-editing-id="${editingId}"]`) as HTMLElement;
          if (editableElement) {
            const el = this.template().elements.find((e) => e.id === editingId);
            if (el && editableElement.textContent !== this.getSampleValue(el)) {
              editableElement.textContent = this.getSampleValue(el);
            }
            editableElement.focus();
            const range = document.createRange();
            range.selectNodeContents(editableElement);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
          this.generateTemplate.emit(true)
        }, 0);
      }
    });
  }

  mmToPx(mm: number): number {
    return mm * (96 / 25.4);
  }
  get containerWidthPx(): number {
    return this.mmToPx(this.template().widthMm);
  }
  get containerHeightPx(): number {
    return this.mmToPx(this.template().lengthMm);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (!dt) return;

    // If we're using custom drag (mousedown-based), ignore HTML5 drop
    // This handler is only for dropping new elements from the palette
    if (this.dragState() !== null) {
      return;
    }

    const raw = dt.getData('application/json');
    if (!raw) return;
    try {
      const { type, kind, label } = JSON.parse(raw) as { type: string; kind: string; label: string };
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const isBarcode = kind === 'barcode';
      const w = isBarcode ? 80 : 70;
      const h = isBarcode ? 36 : 20;
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const widthPct = (w / rect.width) * 100;
      const heightPct = (h / rect.height) * 100;
      const left = Math.max(0, Math.min(100 - widthPct, xPct));
      const top = Math.max(0, Math.min(100 - heightPct, yPct));

      const newEl: LabelElement = {
        id: crypto.randomUUID(),
        type: isBarcode ? 'barcode' : 'text',
        fieldType: type as LabelElement['fieldType'],
        left,
        top,
        width: widthPct,
        height: heightPct,
        style: !isBarcode ? { ...DEFAULT_TEXT_STYLE } : undefined,
        sampleValue: label
      };
      const next = [...this.template().elements, newEl];
      this.elementsChange.emit(next);
      this.selectedId.set(newEl.id);
      if (newEl.type === 'text') {
        setTimeout(() => this.editingId.set(newEl.id), 0);
      }
    } catch (err) {
      console.warn('Drop parse error', err);
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.draggingElementId() ? 'move' : 'copy';
    }
  }

  onElementDragStart(el: LabelElement, event: DragEvent): void {
    // This is only used for dropping new elements from palette
    // For moving existing elements, we use mousedown instead
    if (this.resizeState() || this.editingId() === el.id) {
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.classList.contains('element-text') || target.classList.contains('resize-handle')) {
      event.preventDefault();
      return;
    }
    // Prevent HTML5 drag for existing elements - we'll use mousedown instead
    event.preventDefault();
  }

  onElementMouseDown(el: LabelElement, event: MouseEvent): void {
    // Don't start drag if resizing, editing, or clicking on non-draggable elements
    if (this.resizeState() || this.dragState() || this.editingId() === el.id) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.classList.contains('element-text') || target.classList.contains('resize-handle')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.stopEditing();
    this.selectedId.set(el.id);

    const container = (event.target as HTMLElement).closest('.canvas-container') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    this.dragState.set({
      id: el.id,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: el.left,
      startTop: el.top,
      containerRect
    });
    this.draggingElementId.set(el.id);
    this.bindDragListeners();
  }

  onElementDragEnd(): void {
    // Only used for HTML5 drag from palette
    this.draggingElementId.set(null);
  }

  onResizeStart(el: LabelElement, handle: ResizeHandle, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.editingId() === el.id) return;
    const container = (event.target as HTMLElement).closest('.canvas-container') as HTMLElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const baseFontSize = el.type === 'text' && el.style ? el.style.fontSize : undefined;
    this.resizeState.set({
      id: el.id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      left: el.left,
      top: el.top,
      width: el.width,
      height: el.height,
      containerRect,
      baseFontSize
    });
    this.bindResizeListeners();
  }

  private boundResizeMove = (e: MouseEvent) => this.onResizeMove(e);
  private boundResizeEnd = () => this.onResizeEnd();
  private boundDragMove = (e: MouseEvent) => this.onDragMove(e);
  private boundDragEnd = () => this.onDragEnd();

  private bindResizeListeners(): void {
    if (this.resizeListenersBound) return;
    this.resizeListenersBound = true;
    document.addEventListener('mousemove', this.boundResizeMove);
    document.addEventListener('mouseup', this.boundResizeEnd);
  }

  private bindDragListeners(): void {
    if (this.dragListenersBound) return;
    this.dragListenersBound = true;
    document.addEventListener('mousemove', this.boundDragMove);
    document.addEventListener('mouseup', this.boundDragEnd);
  }

  private onResizeMove(e: MouseEvent): void {
    const state = this.resizeState();
    if (!state) return;
    const { id, handle, startX, startY, left, top, width, height, containerRect, baseFontSize } = state;
    const dx = ((e.clientX - startX) / containerRect.width) * 100;
    const dy = ((e.clientY - startY) / containerRect.height) * 100;
    const { newLeft, newTop, newWidth, newHeight } = this.labelGenerator.computeResizeDimensions(handle, left, top, width, height, dx, dy);

    const patch: Partial<LabelElement> = { left: newLeft, top: newTop, width: newWidth, height: newHeight };
    const el = this.template().elements.find((x) => x.id === id);
    if (el?.type === 'text' && el.style != null && baseFontSize != null) {
      const scale = Math.sqrt((newWidth * newHeight) / (width * height));
      const fontSize = Math.max(8, Math.min(120, Math.round(baseFontSize * scale)));
      patch.style = { ...el.style, fontSize };
    }
    this.updateElement(id, patch);
  }

  private onResizeEnd(): void {
    this.resizeState.set(null);
    this.unbindResizeListeners();
  }

  private unbindResizeListeners(): void {
    if (!this.resizeListenersBound) return;
    this.resizeListenersBound = false;
    document.removeEventListener('mousemove', this.boundResizeMove);
    document.removeEventListener('mouseup', this.boundResizeEnd);
  }

  private onDragMove(e: MouseEvent): void {
    const state = this.dragState();
    if (!state) return;

    const { id, startX, startY, startLeft, startTop, containerRect } = state;
    const element = this.template().elements.find((el) => el.id === id);
    if (!element) return;

    const dx = ((e.clientX - startX) / containerRect.width) * 100;
    const dy = ((e.clientY - startY) / containerRect.height) * 100;

    const newLeft = Math.max(0, Math.min(100 - element.width, startLeft + dx));
    const newTop = Math.max(0, Math.min(100 - element.height, startTop + dy));

    this.updateElement(id, { left: newLeft, top: newTop });
  }

  private onDragEnd(): void {
    this.dragState.set(null);
    this.draggingElementId.set(null);
    this.unbindDragListeners();
  }

  private unbindDragListeners(): void {
    if (!this.dragListenersBound) return;
    this.dragListenersBound = false;
    document.removeEventListener('mousemove', this.boundDragMove);
    document.removeEventListener('mouseup', this.boundDragEnd);
  }

  selectElement(el: LabelElement, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    // Don't select if we're currently dragging or just finished dragging
    if (this.dragState() !== null || this.draggingElementId() !== null) {
      return;
    }
    const wasSelected = this.selectedId() === el.id;
    this.selectedId.set(el.id);
    // Start editing if clicking on an already selected text element
    if (el.type === 'text' && wasSelected && !this.editingId()) {
      this.editingId.set(el.id);
    }
  }

  startEditing(el: LabelElement, event: Event): void {
    if (el.type === 'text') {
      event.stopPropagation();
      this.editingId.set(el.id);
      this.selectedId.set(el.id);
    }
  }

  onTextInput(el: LabelElement, event: Event): void {
    const target = event.target as HTMLElement;
    const newValue = target.textContent || '';
    this.updateElement(el.id, { sampleValue: newValue });
  }

  stopEditing(): void {
    this.editingId.set(null);
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    const next = this.template().elements.filter((e) => e.id !== id);
    this.elementsChange.emit(next);
    this.selectedId.set(null);
  }

  updateElement(id: string, patch: Partial<LabelElement>): void {
    const next = this.template().elements.map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    this.elementsChange.emit(next);
  }

  /** Prefer element.sampleValue when user has customized it (not the default palette label). */
  private static readonly DEFAULT_FIELD_LABELS: Partial<Record<LabelElement['fieldType'], string>> = {
    name: 'Name',
    barcode: 'Barcode',
    salePrice: 'Sale Price',
    article: 'Article'
  };

  getSampleValue(el: LabelElement): string {
    const sample = this.sampleProduct();
    const defaultLabel = LabelCanvasComponent.DEFAULT_FIELD_LABELS[el.fieldType];
    const isCustomized = el.sampleValue != null && el.sampleValue !== '' && el.sampleValue !== defaultLabel;
    if (isCustomized) {
      return el.sampleValue!;
    }
    switch (el.fieldType) {
      case 'name':
        return sample?.name ?? el.sampleValue ?? 'Name';
      case 'barcode':
        return sample?.barcode ?? el.sampleValue ?? '2000000022833';
      case 'salePrice':
        return sample?.salePrice != null ? this.labelGenerator.formatPrice(sample.salePrice) : (el.sampleValue ?? '199 000 UZS');
      case 'article':
        return sample?.article ?? el.sampleValue ?? 'Article';
      default:
        return el.sampleValue ?? '';
    }
  }

  getBarcodeDataUrl(el: LabelElement): string {
    const value = this.getSampleValue(el);
    return this.barcodeGenerator.generateDataUrl(value, this.template().barcodeFormat, {
      width: 2,
      height: 32
    });
  }

  getElementStyleString(el: LabelElement): string {
    const parts = [
      `left:${el.left}%`,
      `top:${el.top}%`,
      `width:${el.width}%`,
      `height:${el.height}%`
    ];
    if (el.type === 'text' && el.style) {
      const s = el.style;
      parts.push(`font-family:${s.fontFamily}`, `font-size:${s.fontSize}px`);
      parts.push(`font-weight:${s.bold ? 'bold' : 'normal'}`, `font-style:${s.italic ? 'italic' : 'normal'}`);
      const deco = [s.underline && 'underline', s.strikethrough && 'line-through'].filter(Boolean).join(' ');
      if (deco) parts.push(`text-decoration:${deco}`);
      parts.push(`text-align:${s.align}`);
    }
    return parts.join(';');
  }
}
