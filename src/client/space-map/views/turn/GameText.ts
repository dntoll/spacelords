/** inga-hexkoordinater: saved event text can still contain the old coordinates. */
export function gameText(text: string): string {
  return text
    .replace(/ (?:at|near) HEX -?\d+,\s*-?\d+/g, '')
    .replace(/HEX -?\d+,\s*-?\d+/g, '')
    .replace(/ at selected location/g, '')
    .replace(/ {2,}/g, ' ');
}
