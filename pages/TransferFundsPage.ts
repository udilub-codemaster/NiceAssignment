import type { Locator, Page } from '@playwright/test';

export class TransferFundsPage {
  private readonly transferFundsNavLink: Locator;
  private readonly fromAccountIdSelect: Locator;
  private readonly toAccountIdSelect: Locator;
  private readonly amountInput: Locator;
  private readonly transferButton: Locator;
  private readonly transferHeading: Locator;

  // Expose locators for assertions in the test.
  public readonly transferCompleteMessage: Locator;
  public readonly transferErrorMessage: Locator;

  constructor(private readonly page: Page) {
    this.transferFundsNavLink = this.page.getByRole('link', { name: /transfer funds/i });

    // ParaBank uses stable IDs on selects; use <select> dropdowns.
    this.fromAccountIdSelect = this.page.locator('#fromAccountId');
    this.toAccountIdSelect = this.page.locator('#toAccountId');
    this.amountInput = this.page.locator('#amount, input[name="amount"]');

    this.transferButton = this.page.locator(
      'input[type="submit"][value="Transfer"], input[type="submit"][value="Transfer Funds"], button:has-text("Transfer")',
    );

    this.transferHeading = this.page.getByRole('heading', { name: /transfer funds/i });

    // Common ParaBank success/error texts; assertions are done in the test.
    this.transferCompleteMessage = this.page.getByText(/transfer complete/i);
    this.transferErrorMessage = this.page.getByText(/insufficient|error/i);
  }

  async goto(): Promise<void> {
    await this.transferFundsNavLink.waitFor({ state: 'visible', timeout: 30000 });
    await this.transferFundsNavLink.click();

    await this.transferHeading.waitFor({ state: 'visible', timeout: 30000 });
    await this.fromAccountIdSelect.waitFor({ state: 'visible', timeout: 30000 });
  }

  async transfer(params: { fromAccountId: string; toAccountId: string; amount: string }): Promise<void> {
    await this.fromAccountIdSelect.waitFor({ state: 'visible', timeout: 30000 });
    await this.toAccountIdSelect.waitFor({ state: 'visible', timeout: 30000 });

    // ParaBank option values typically match the account id.
    const selectByValue = async (select: Locator, value: string): Promise<void> => {
      try {
        await select.selectOption({ value });
      } catch {
        await select.selectOption({ label: value });
      }
    };

    await selectByValue(this.fromAccountIdSelect, params.fromAccountId);
    await selectByValue(this.toAccountIdSelect, params.toAccountId);
    await this.amountInput.fill(params.amount);
    await this.transferButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.transferButton.click();
  }
}

