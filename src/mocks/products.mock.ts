import type { ScannedProduct, MolydalMatch } from '@/schemas/scan.schema';

export const MOCK_SCANNED_PRODUCTS: ScannedProduct[] = [
  { name: 'Mobilux EP 2', brand: 'Mobil', category: 'Graisses', subcategory: 'EP Lithium', barcode: '3456789012345' },
  { name: 'Total Carter EP 220', brand: 'TotalEnergies', category: 'Huiles industrielles', subcategory: 'Engrenages', barcode: '4567890123456' },
  { name: 'Shell Tellus S2 MX 46', brand: 'Shell', category: 'Huiles hydrauliques', subcategory: 'Anti-usure', barcode: '5678901234567' },
  { name: 'Castrol Hyspin AWH-M 68', brand: 'Castrol', category: 'Huiles hydrauliques', subcategory: 'Anti-usure', barcode: '6789012345678' },
  { name: 'Fuchs Renolin B 15', brand: 'Fuchs', category: 'Huiles hydrauliques', subcategory: 'Standard', barcode: '7890123456789' },
  { name: 'Klüber Isoflex NBU 15', brand: 'Klüber', category: 'Graisses', subcategory: 'Haute vitesse', barcode: '8901234567890' },
  { name: 'BP Energol GR-XP 320', brand: 'BP', category: 'Huiles industrielles', subcategory: 'Engrenages', barcode: '9012345678901' },
  { name: 'Petronas Tutela MR 3', brand: 'Petronas', category: 'Graisses', subcategory: 'Multi-usage', barcode: '0123456789012' },
  { name: 'Total Nevastane XMF', brand: 'TotalEnergies', category: 'Huiles alimentaires', subcategory: 'NSF H1', barcode: '1234567890124' },
  { name: 'Shell Corena S3 R 46', brand: 'Shell', category: 'Huiles compresseurs', subcategory: 'Rotatif', barcode: '2345678901235' },
  { name: 'Mobil DTE 25', brand: 'Mobil', category: 'Huiles hydrauliques', subcategory: 'Anti-usure', barcode: '3456789012346' },
  { name: 'Castrol Optigear BM 150', brand: 'Castrol', category: 'Huiles industrielles', subcategory: 'Engrenages', barcode: '4567890123457' },
];

export const MOCK_MOLYDAL_MATCHES: MolydalMatch[] = [
  { id: 'mol-001', name: 'Molyduval Soraja G2', reference: 'MOL-GR-002', category: 'Graisses', confidence: 94, pricingTier: 'standard' },
  { id: 'mol-002', name: 'Molyduval Cartex 220', reference: 'MOL-HI-220', category: 'Huiles industrielles', confidence: 91, pricingTier: 'standard' },
  { id: 'mol-003', name: 'Molyduval Hydran 46', reference: 'MOL-HY-046', category: 'Huiles hydrauliques', confidence: 88, pricingTier: 'premium' },
  { id: 'mol-004', name: 'Molyduval Hydran 68', reference: 'MOL-HY-068', category: 'Huiles hydrauliques', confidence: 85, pricingTier: 'premium' },
  { id: 'mol-005', name: 'Molyduval Hydran 15', reference: 'MOL-HY-015', category: 'Huiles hydrauliques', confidence: 72, pricingTier: 'standard' },
  { id: 'mol-006', name: 'Molyduval Sifax NBU', reference: 'MOL-GR-NBU', category: 'Graisses', confidence: 67, pricingTier: 'enterprise' },
  { id: 'mol-007', name: 'Molyduval Cartex 320', reference: 'MOL-HI-320', category: 'Huiles industrielles', confidence: 90, pricingTier: 'standard' },
  { id: 'mol-008', name: 'Molyduval Soraja MR', reference: 'MOL-GR-MR3', category: 'Graisses', confidence: 82, pricingTier: 'standard' },
  { id: 'mol-009', name: 'Molyduval Alima XMF', reference: 'MOL-AL-XMF', category: 'Huiles alimentaires', confidence: 96, pricingTier: 'enterprise' },
  { id: 'mol-010', name: 'Molyduval Compex 46', reference: 'MOL-CO-046', category: 'Huiles compresseurs', confidence: 87, pricingTier: 'premium' },
  { id: 'mol-011', name: 'Molyduval Hydran 25', reference: 'MOL-HY-025', category: 'Huiles hydrauliques', confidence: 89, pricingTier: 'standard' },
];
