import { test as base } from '@playwright/test';
import { RegisterPage } from '@pages/RegisterPage';
import { LoginPage } from '@pages/LoginPage';
import { AccountsOverviewPage } from '@pages/AccountsOverviewPage';
import { TransferFundsPage } from '@pages/TransferFundsPage';

type Fixtures = {
  registerPage: RegisterPage;
  loginPage: LoginPage;
  accountsOverviewPage: AccountsOverviewPage;
  transferFundsPage: TransferFundsPage;
};

export const test = base.extend<Fixtures>({
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await use(registerPage);
  },

  // Not currently used by the register test (because registration already logs in),
  // but useful for subsequent steps.
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  accountsOverviewPage: async ({ page }, use) => {
    const accountsOverviewPage = new AccountsOverviewPage(page);
    await use(accountsOverviewPage);
  },

  transferFundsPage: async ({ page }, use) => {
    const transferFundsPage = new TransferFundsPage(page);
    await use(transferFundsPage);
  },
});

