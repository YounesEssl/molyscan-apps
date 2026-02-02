export function formatBarcode(barcode: string): string {
  if (barcode.length === 13) {
    return `${barcode.slice(0, 1)}-${barcode.slice(1, 7)}-${barcode.slice(7, 12)}-${barcode.slice(12)}`;
  }
  return barcode;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
