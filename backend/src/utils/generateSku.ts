/**
 * Utility to generate a standardized SKU code for footwear inventory
 */
export function generateSku(brandName: string, productName: string, size: string, color: string): string {
  const brandPart = brandName.trim().substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const productPart = productName.trim().substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const colorPart = color.trim().substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sizePart = size.trim().replace(/[^A-Z0-9.]/g, '').replace('.', 'P'); // e.g., 9.5 -> 9P5
  
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${brandPart}-${productPart}-${colorPart}-${sizePart}-${randomSuffix}`;
}
