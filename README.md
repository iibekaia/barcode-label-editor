# Barcode Label Editor

Angular app for designing barcode label **templates** (patterns). You set dimensions and barcode format, drag fields (Name, Barcode, Sale Price, Article) onto a white label canvas, then use that template with a product list so each product gets a label with the same layout and styling. Barcodes are generated with **jsBarcode**.

## Features

- **Label dimensions** – Width and length in mm.
- **Barcode format** – CODE128, CODE39, EAN13, EAN8, UPC, etc.
- **Left palette** – Draggable fields: Name, Barcode, Sale Price, Article. Drag onto the white box to add.
- **White box** – Drag-and-drop container; dropped elements are positioned and can be selected.
- **Text formatting** – When a text element is selected: font, size, bold, italic, underline, strikethrough, alignment.
- **Template → generator** – The saved template (name, dimensions, format, elements) is used by `LabelGeneratorService` and `BarcodeGeneratorService` to fill in product data and generate barcodes (jsBarcode) for each product.

## How to use the template with your product list

1. Inject `LabelGeneratorService` and `BarcodeGeneratorService`.
2. Get your current template (e.g. from a service or signal).
3. For each product, for each element in `template.elements`:
   - If `element.type === 'text'`: use `labelGenerator.getValue(product, element)` for the text.
   - If `element.type === 'barcode'`: use `labelGenerator.getBarcodeDataUrl(product, template, element)` for the image `src`.
4. Render each label (e.g. in a loop) with the same layout (positions/sizes from the template) and the values above.

## Project structure

- `src/app/models/label-template.ts` – Types: `LabelTemplate`, `LabelElement`, `Product`, `BarcodeFormat`, `TextStyle`.
- `src/app/services/barcode-generator.service.ts` – jsBarcode wrapper: `generateDataUrl`, `renderToCanvas`, `getValueForElement`.
- `src/app/services/label-generator.service.ts` – Uses template + product to get per-element values and barcode images.
- `src/app/components/field-palette/` – Left sidebar with draggable fields.
- `src/app/components/editor-toolbar/` – Top bar: name, width, length, barcode format, text formatting when a text element is selected.
- `src/app/components/label-canvas/` – White drop zone and list of elements (text/barcode) with selection and delete.
- `src/app/components/barcode-editor/` – Main editor that composes palette, toolbar, and canvas and holds template state.

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
