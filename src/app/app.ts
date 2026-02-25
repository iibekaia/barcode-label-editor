import { Component } from '@angular/core';
import { BarcodeEditorComponent } from './components/barcode-editor/barcode-editor.component';

@Component({
  selector: 'app-root',
  imports: [BarcodeEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
