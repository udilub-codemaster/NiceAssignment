import type { APIRequestContext, Expect } from '@playwright/test';
import { getAccountById } from '@api/accountsApi';
import { parseMoneyToCents } from '@utils/parseMoneyToCents';

export async function validateTransferBalancesUpdatedCorrectly(params: {
  expect: Expect;
  request: APIRequestContext;
  fromAccountId: string;
  toAccountId: string;
  transferAmount: string;
  fromBeforeBalance: string;
  toBeforeBalance: string;
  fromExpectedType: string;
  toExpectedType: string;
}): Promise<void> {
  const transferAmountCents = parseMoneyToCents(params.transferAmount);
  const fromBeforeCents = parseMoneyToCents(params.fromBeforeBalance);
  const toBeforeCents = parseMoneyToCents(params.toBeforeBalance);

  const [fromAfter, toAfter] = await Promise.all([
    getAccountById(params.request, params.fromAccountId),
    getAccountById(params.request, params.toAccountId),
  ]);

  const fromAfterCents = parseMoneyToCents(fromAfter.balance);
  const toAfterCents = parseMoneyToCents(toAfter.balance);

  params.expect(fromAfter.type).toBe(params.fromExpectedType);
  params.expect(toAfter.type).toBe(params.toExpectedType);
  params.expect(fromAfterCents).toBe(fromBeforeCents - transferAmountCents);
  params.expect(toAfterCents).toBe(toBeforeCents + transferAmountCents);
}

