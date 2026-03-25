import type { APIRequestContext } from '@playwright/test';
import { baseUrl, regex } from '@const/constants';
import { extractXmlTag } from '@utils/xmlUtils';

function extractCustomerBlock(bodyXml: string): string {
  const match = bodyXml.match(/<customer>[\s\S]*?<\/customer>/i);
  if (!match?.[0]) {
    throw new Error('Customer lookup response missing <customer> block.');
  }
  return match[0];
}

function validateExpectedCustomerStructure(customerBlockXml: string): string {
  const customerId = extractXmlTag(customerBlockXml, 'id');
  if (!regex.numericId.test(customerId)) {
    throw new Error(`Customer lookup response has non-numeric <id>: "${customerId}"`);
  }

  // Validate key customer fields (response structure + data correctness).
  extractXmlTag(customerBlockXml, 'firstName');
  extractXmlTag(customerBlockXml, 'lastName');
  extractXmlTag(customerBlockXml, 'phoneNumber');
  extractXmlTag(customerBlockXml, 'ssn');

  const addressBlockMatch = customerBlockXml.match(/<address>[\s\S]*?<\/address>/i);
  if (!addressBlockMatch?.[0]) {
    throw new Error('Customer lookup response missing <address> block.');
  }
  const addressBlock = addressBlockMatch[0];

  extractXmlTag(addressBlock, 'street');
  extractXmlTag(addressBlock, 'city');
  extractXmlTag(addressBlock, 'state');
  extractXmlTag(addressBlock, 'zipCode');

  return customerId;
}

export async function getCustomerIdByLogin(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const url = `${baseUrl}/services/bank/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`;

  try {
    const response = await request.get(url);

    if (response.status() !== 200) {
      const snippet = (await response.text()).slice(0, 200);
      throw new Error(`Customer lookup failed: expected status 200, got ${response.status()}. Body: ${snippet}`);
    }

    const body = await response.text();

    const customerBlock = extractCustomerBlock(body);
    return validateExpectedCustomerStructure(customerBlock);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`getCustomerIdByLogin error: ${message}`);
  }
}

