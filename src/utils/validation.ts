export function isValidBarcode(barcode: string): boolean {
  const eanRegex = /^(\d{8}|\d{13})$/;
  const upcRegex = /^\d{12}$/;
  return eanRegex.test(barcode) || upcRegex.test(barcode);
}
