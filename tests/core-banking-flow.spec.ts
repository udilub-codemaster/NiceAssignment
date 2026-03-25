import { expect } from '@playwright/test';
import { test } from '@fixtures/fixtures';
import { createFakeRegistrationUser } from '@utils/createFakeRegistrationUser';
import { escapeRegExp } from '@utils/escapeRegExp';
import { createCoreBankingFlowState } from '@utils/coreBankingFlowState';
import { validateTransferBalancesUpdatedCorrectly } from '@utils/transferBalanceAssertions';
import { getCustomerIdByLogin } from '@api/customerApi';
import {
  createCheckingAccountViaCurl,
  getAccountById,
  getExistingAccountByCustomerId,
} from '@api/accountsApi';
import { regex, testData, uiTimeouts } from '@const/constants';

test.describe('core-banking flow', () => {
  test('core-banking: e2e register->login->create CHECKING->transfer->validate balances', async ({
    registerPage,
    accountsOverviewPage,
    transferFundsPage,
    topMenuPage,
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
      await expect(topMenuPage.logoutLink).toBeVisible();
      // After registration, ParaBank already logs the user in.
    });

    await test.step('Fetch customer and accounts (API)', async () => {
      const customerId = await getCustomerIdByLogin(request, user.username, user.password);
      expect(customerId).toMatch(regex.numericId);
      state.customerId = customerId;
      const existingAccount = await getExistingAccountByCustomerId(request, customerId);
      state.existingAccountId = existingAccount.id;
      expect(existingAccount.id).toMatch(regex.numericId);
      expect(existingAccount.customerId).toBe(customerId);
      expect(existingAccount.balance).toMatch(regex.signedDecimal);

      const createdCheckingAccount = await createCheckingAccountViaCurl({
        customerId,
        fromAccountId: existingAccount.id,
      });
      state.createdCheckingAccountId = createdCheckingAccount.id;
      state.createdCheckingAccountBalance = createdCheckingAccount.balance;
      expect(createdCheckingAccount.id).toMatch(regex.numericId);
      expect(createdCheckingAccount.customerId).toBe(customerId);
      expect(createdCheckingAccount.type).toBe(testData.CHECKING_ACCOUNT_TYPE);
      expect(createdCheckingAccount.balance).toMatch(regex.signedDecimal);
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
      await validateTransferBalancesUpdatedCorrectly({
        expect,
        request,
        fromAccountId: state.existingAccountId!,
        toAccountId: state.createdCheckingAccountId!,
        transferAmount,
        fromBeforeBalance: state.existingBeforeTransferBalance!,
        toBeforeBalance: state.createdBeforeTransferBalance!,
        fromExpectedType: state.existingBeforeTransferType!,
        toExpectedType: testData.CHECKING_ACCOUNT_TYPE,
      });
    });

    await test.step('Logout (UI)', async () => {
      await topMenuPage.logout();
    });
  });
});

