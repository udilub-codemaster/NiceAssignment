export function extractXmlTag(xml: string, tagName: string): string {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(re);
  const value = match?.[1]?.trim() ?? '';

  if (!value) {
    throw new Error(`XML missing or empty <${tagName}> tag value.`);
  }

  return value;
}

