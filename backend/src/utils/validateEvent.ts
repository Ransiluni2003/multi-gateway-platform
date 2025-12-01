// Simple event payload validator
export function validateEvent(data: any, requiredFields: string[]): boolean {
  if (!data) return false;
  return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(data, field));
}
