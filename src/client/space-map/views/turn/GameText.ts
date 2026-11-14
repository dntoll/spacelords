/** inga-hexkoordinater: saved event text can still contain the old coordinates. */
export function gameText(text: string): string {
  return text.replace(/HEX -?\d+,\s*-?\d+/g, 'selected location');
}
