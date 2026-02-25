import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { TextStyle } from '../../models/label-template';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.scss'
})
export class EditorToolbarComponent {
  readonly textStyle = input<TextStyle | null>(null);

  readonly textStyleChange = output<Partial<TextStyle>>();
  readonly print = output<void>();
  readonly printCard = output<void>();

  onStyleChange(patch: Partial<TextStyle>): void {
    this.textStyleChange.emit(patch);
  }
}
