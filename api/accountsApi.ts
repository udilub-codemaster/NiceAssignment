import type { APIRequestContext } from '@playwright/test';
import { execFile } from 'child_process';
import { baseUrl } from '@const/constants';
import { extractXmlTag } from '@utils/xmlUtils';
import { buildCurlErrorBody, getCurlExecutable, parseCurlStdoutForHttpStatus } from '@utils/curlUtils';

export type Account = {
  id: string;
  customerId: string;
  type: string;
  balance: string;
};

function extractAccountsBlock(bodyXml: string): string {
  const match = bodyXml.match(/<accounts>[\s\S]*?<\/accounts>/i);
  if (!match?.[0]) {
    throw new Error('Accounts lookup response missing <accounts> block.');
  }
  return match[0];
}

function extractAccountBlocks(accountsBlockXml: string): string[] {
  const matches = [...accountsBlockXml.matchAll(/<account>[\s\S]*?<\/account>/gi)];
  return matches.map((m) => m[0]).filter(Boolean);
}

function assertNumeric(str: string, fieldName: string): void {
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid numeric value for <${fieldName}>: "${str}"`);
  }
}

function validateExpectedAccountStructure(accountBlockXml: string): Account {
  const id = extractXmlTag(accountBlockXml, 'id');
  const customerId = extractXmlTag(accountBlockXml, 'customerId');
  const type = extractXmlTag(accountBlockXml, 'type');
  const balance = extractXmlTag(accountBlockXml, 'balance');

  if (!/^\d+$/.test(id)) {
    throw new Error(`Account lookup response has non-numeric <id>: "${id}"`);
  }
  assertNumeric(balance, 'balance');

  if (!customerId.trim()) {
    throw new Error('Account lookup response missing <customerId>.');
  }
  if (!type.trim()) {
    throw new Error('Account lookup response missing <type>.');
  }

  return { id, customerId, type, balance };
}

export async function getAccountsByCustomerId(
  request: APIRequestContext,
  customerId: string,
): Promise<Account[]> {
  const url = `${baseUrl}/services/bank/customers/${encodeURIComponent(customerId)}/accounts`;

  try {
    const response = await request.get(url);
    if (response.status() !== 200) {
      const snippet = (await response.text()).slice(0, 200);
      throw new Error(`Accounts lookup failed: expected status 200, got ${response.status()}. Body: ${snippet}`);
    }

    const body = await response.text();
    const accountsBlock = extractAccountsBlock(body);
    const accountBlocks = extractAccountBlocks(accountsBlock);
    if (accountBlocks.length === 0) {
      throw new Error('Accounts lookup response has no <account> entries.');
    }

    return accountBlocks.map(validateExpectedAccountStructure);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`getAccountsByCustomerId error: ${message}`);
  }
}

export async function getExistingAccountByCustomerId(
  request: APIRequestContext,
  customerId: string,
  options?: {
    preferredType?: string;
  },
): Promise<Account> {
  const accounts = await getAccountsByCustomerId(request, customerId);

  const preferredType = options?.preferredType?.trim();
  const chosen =
    (preferredType ? accounts.find((a) => a.type === preferredType) : undefined) ?? accounts[0];

  if (chosen.customerId !== customerId) {
    throw new Error(`Account lookup returned mismatched <customerId>: expected "${customerId}", got "${chosen.customerId}"`);
  }

  return chosen;
}

export async function getAccountById(
  request: APIRequestContext,
  accountId: string,
): Promise<Account> {
  const url = `${baseUrl}/services/bank/accounts/${encodeURIComponent(accountId)}`;

  try {
    const response = await request.get(url);
    if (response.status() !== 200) {
      const snippet = (await response.text()).slice(0, 200);
      throw new Error(`Account lookup failed: expected status 200, got ${response.status()}. Body: ${snippet}`);
    }

    const body = await response.text();
    const accountBlockXml = extractAccountBlock(body);
    return validateExpectedAccountStructure(accountBlockXml);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`getAccountById error: ${message}`);
  }
}

function extractAccountBlock(bodyXml: string): string {
  const match = bodyXml.match(/<account>[\s\S]*?<\/account>/i);
  if (!match?.[0]) {
    throw new Error('Account creation response missing <account> block.');
  }
  return match[0];
}

function buildCreateAccountUrl(params: {
  customerId: string;
  newAccountType: string;
  fromAccountId: string;
}): string {
  const url = new URL(`${baseUrl}/services/bank/createAccount`);
  url.searchParams.set('customerId', params.customerId);
  url.searchParams.set('newAccountType', params.newAccountType);
  url.searchParams.set('fromAccountId', params.fromAccountId);
  return url.toString();
}

async function execCurlQuery(url: string): Promise<{ statusCode: number; body: string }> {
  // Append HTTP status code as the last line so we can reliably parse it.
  // Note: endpoint parameters are passed via query string in this variant.
  const curlArgs = [
    '-sS',
    '-X',
    'POST',
    url,
    '-w',
    '\n%{http_code}',
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(getCurlExecutable(), curlArgs, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (err, out) => {
      if (err) return reject(err);
      resolve(out);
    });
  });
  return parseCurlStdoutForHttpStatus(stdout);
}

async function execCurlForm(params: {
  customerId: string;
  newAccountType: string;
  fromAccountId: string;
}): Promise<{ statusCode: number; body: string }> {
  const url = `${baseUrl}/services/bank/createAccount`;
  const curlArgs = [
    '-sS',
    '-X',
    'POST',
    url,
    '--data-urlencode',
    `customerId=${params.customerId}`,
    '--data-urlencode',
    `newAccountType=${params.newAccountType}`,
    '--data-urlencode',
    `fromAccountId=${params.fromAccountId}`,
    '-w',
    '\n%{http_code}',
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      getCurlExecutable(),
      curlArgs,
      { encoding: 'utf8', maxBuffer: 1024 * 1024 },
      (err, out) => {
        if (err) return reject(err);
        resolve(out);
      },
    );
  });

  return parseCurlStdoutForHttpStatus(stdout);
}

export async function createCheckingAccountViaCurl(params: {
  customerId: string;
  fromAccountId: string;
}): Promise<Account> {
  if (!/^\d+$/.test(params.customerId)) {
    throw new Error(`createCheckingAccountViaCurl: invalid customerId "${params.customerId}"`);
  }
  if (!/^\d+$/.test(params.fromAccountId)) {
    throw new Error(`createCheckingAccountViaCurl: invalid fromAccountId "${params.fromAccountId}"`);
  }

  // ParaBank's OpenAPI shows `newAccountType` as an int, but the enum in the docs
  // is also displayed as CHECKING/SAVINGS/LOAN. Try both styles.
  const candidateNewAccountTypeValues = ['CHECKING', '0', '1', '2', '3'];

  let lastError: unknown;

  for (const newAccountType of candidateNewAccountTypeValues) {
    const url = buildCreateAccountUrl({
      customerId: params.customerId,
      newAccountType,
      fromAccountId: params.fromAccountId,
    });

    const attempts = [
      {
        variant: 'query',
        exec: () => execCurlQuery(url),
      },
      {
        variant: 'form',
        exec: () =>
          execCurlForm({
            customerId: params.customerId,
            newAccountType,
            fromAccountId: params.fromAccountId,
          }),
      },
    ] as const;

    for (const attempt of attempts) {
      try {
        const { statusCode, body } = await attempt.exec();
        if (statusCode !== 200) {
          lastError = new Error(
            `createAccount (${attempt.variant}) HTTP ${statusCode}.\nRequest: ${attempt.variant === 'query' ? url : `${baseUrl}/services/bank/createAccount`}\nBody:\n${buildCurlErrorBody(body)}`,
          );
          continue;
        }

        const accountBlock = extractAccountBlock(body);
        const created = validateExpectedAccountStructure(accountBlock);

        // For the assignment step we specifically want CHECKING.
        if (created.type !== 'CHECKING') {
          lastError = new Error(
            `createAccount (${attempt.variant}) created unexpected <type>: "${created.type}". input newAccountType="${newAccountType}"`,
          );
          continue;
        }

        if (created.customerId !== params.customerId) {
          lastError = new Error(
            `createAccount (${attempt.variant}) customerId mismatch: expected "${params.customerId}", got "${created.customerId}"`,
          );
          continue;
        }

        return created;
      } catch (err) {
        lastError = err;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`createCheckingAccountViaCurl failed: ${message}`);
}

