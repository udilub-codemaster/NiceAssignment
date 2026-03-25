import { expect } from '@playwright/test';
import { test } from '@fixtures/fixtures';
import { createFakeRegistrationUser } from '@utils/createFakeRegistrationUser';
import { escapeRegExp } from '@utils/escapeRegExp';
import { parseMoneyToCents } from '@utils/parseMoneyToCents';
import { createCoreBankingFlowState } from '@utils/coreBankingFlowState';
import { getCustomerIdByLogin } from '@api/customerApi';
import {
  createCheckingAccountViaCurl,
  getAccountById,
  getExistingAccountByCustomerId,
} from '@api/accountsApi';
import { testData, uiTimeouts } from '@const/constants';

test.describe('core-banking flow', () => {
  test('core-banking: e2e register->login->create CHECKING->transfer->validate balances', async ({
    registerPage,
    accountsOverviewPage,
    transferFundsPage,
    loginPage,
    request,
  }) => {
    const user = createFakeRegistrationUser();
    const state = createCoreBankingFlowState();
    const transferAmount = testData.TRANSFER_AMOUNT;

    await test.step('Register new user (UI)', async () => {
      await registerPage.register(user);
      await expect(registerPage.registrationSuccessMessage).toBeVisible({ timeout: uiTimeouts.LONG_MS });
      await accountsOverviewPage.goto();
      await expect(accountsOverviewPage.accountsOverviewHeading).toBeVisible();
      await expect(accountsOverviewPage.logoutLink).toBeVisible();
      // After registration, ParaBank already logs the user in.
    });

    await test.step('Fetch customer and accounts (API)', async () => {
      state.customerId = await getCustomerIdByLogin(request, user.username, user.password);
      expect(state.customerId).toMatch(/^\d+$/);
      const existingAccount = await getExistingAccountByCustomerId(request, state.customerId);
      state.existingAccountId = existingAccount.id;
      expect(existingAccount.id).toMatch(/^\d+$/);
      expect(existingAccount.customerId).toBe(state.customerId);
      expect(existingAccount.balance).toMatch(/^-?\d+(\.\d+)?$/);

      const createdCheckingAccount = await createCheckingAccountViaCurl({
        customerId: state.customerId,
        fromAccountId: existingAccount.id,
      });
      state.createdCheckingAccountId = createdCheckingAccount.id;
      state.createdCheckingAccountBalance = createdCheckingAccount.balance;
      expect(createdCheckingAccount.id).toMatch(/^\d+$/);
      expect(createdCheckingAccount.customerId).toBe(state.customerId);
      expect(createdCheckingAccount.type).toBe(testData.CHECKING_ACCOUNT_TYPE);
      expect(createdCheckingAccount.balance).toMatch(/^-?\d+(\.\d+)?$/);
    });

    await test.step('Verify new CHECKING appears in UI (accounts overview)', async () => {
      await accountsOverviewPage.goto();
      const createdRow = accountsOverviewPage.accountRowById(state.createdCheckingAccountId!);
      await expect(createdRow).toBeVisible({ timeout: uiTimeouts.LONG_MS });
      await expect(createdRow).toContainText(state.createdCheckingAccountId!);
      const balanceRegex = new RegExp(escapeRegExp(state.createdCheckingAccountBalance!), 'i');
      await expect(createdRow).toContainText(balanceRegex, { timeout: uiTimeouts.LONG_MS });
    });

    await test.step('Transfer funds (UI)', async () => {
      await transferFundsPage.goto();
      const existingBeforeTransfer = await getAccountById(request, state.existingAccountId!);
      const createdBeforeTransfer = await getAccountById(request, state.createdCheckingAccountId!);
      expect(existingBeforeTransfer.id).toBe(state.existingAccountId!);
      expect(createdBeforeTransfer.id).toBe(state.createdCheckingAccountId!);
      expect(createdBeforeTransfer.type).toBe(testData.CHECKING_ACCOUNT_TYPE);
      state.existingBeforeTransferType = existingBeforeTransfer.type;
      state.existingBeforeTransferBalance = existingBeforeTransfer.balance;
      state.createdBeforeTransferBalance = createdBeforeTransfer.balance;
      await transferFundsPage.transfer({
        fromAccountId: state.existingAccountId!,
        toAccountId: state.createdCheckingAccountId!,
        amount: transferAmount,
      });

      await expect(transferFundsPage.transferCompleteMessage).toBeVisible({ timeout: uiTimeouts.LONG_MS });
    });

    await test.step('Validate balances updated correctly (API)', async () => {
      const transferAmountCents = parseMoneyToCents(transferAmount);
      const existingBeforeCents = parseMoneyToCents(state.existingBeforeTransferBalance!);
      const createdBeforeCents = parseMoneyToCents(state.createdBeforeTransferBalance!);
      const existingAfter = await getAccountById(request, state.existingAccountId!);
      const createdAfter = await getAccountById(request, state.createdCheckingAccountId!);
      const existingAfterCents = parseMoneyToCents(existingAfter.balance);
      const createdAfterCents = parseMoneyToCents(createdAfter.balance);
      expect(existingAfter.type).toBe(state.existingBeforeTransferType!);
      expect(createdAfter.type).toBe(testData.CHECKING_ACCOUNT_TYPE);
      expect(existingAfterCents).toBe(existingBeforeCents - transferAmountCents);
      expect(createdAfterCents).toBe(createdBeforeCents + transferAmountCents);
    });

    await test.step('Logout (UI)', async () => {
      await loginPage.logout();
    });
  });
});

