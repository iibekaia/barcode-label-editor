import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {LabelFieldType, BarcodeFormat, PALETTE_FIELDS, BARCODE_FORMATS, PaletteItem} from '../../models/label-template';

@Component({
  selector: 'app-field-palette',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './field-palette.component.html',
  styleUrl: './field-palette.component.scss'
})
export class FieldPaletteComponent {
  readonly fields = PALETTE_FIELDS;
  readonly formats = BARCODE_FORMATS;
  readonly checkedFields = signal<Set<LabelFieldType>>(new Set());

  // Template form inputs
  readonly templateName = input<string>('4x3');
  readonly widthMm = input<number>(43);
  readonly lengthMm = input<number>(23);
  readonly barcodeFormat = input<BarcodeFormat>('CODE128');

  // Template form outputs
  readonly templateNameChange = output<string>();
  readonly widthChange = output<number>();
  readonly lengthChange = output<number>();
  readonly barcodeFormatChange = output<BarcodeFormat>();
  readonly fieldAdd = output<PaletteItem>();

  onDragStart(e: DragEvent, field: PaletteItem): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: field.type, kind: field.kind, label: field.label }));
    e.dataTransfer.setData('text/plain', field.type);
  }

  onCheckboxChange(field: PaletteItem, checked: boolean): void {
    const currentChecked = this.checkedFields();
    const newChecked = new Set(currentChecked);

    if (checked) {
      newChecked.add(field.type);
      this.checkedFields.set(newChecked);
      // Emit event to add field to canvas
      this.fieldAdd.emit(field);
    } else {
      newChecked.delete(field.type);
      this.checkedFields.set(newChecked);
    }
  }

  isFieldChecked(fieldType: LabelFieldType): boolean {
    return this.checkedFields().has(fieldType);
  }

  onNameChange(v: string): void {
    this.templateNameChange.emit(v);
  }

  onWidthChange(v: number): void {
    this.widthChange.emit(v);
  }

  onLengthChange(v: number): void {
    this.lengthChange.emit(v);
  }

  onFormatChange(v: BarcodeFormat): void {
    this.barcodeFormatChange.emit(v);
  }
}
