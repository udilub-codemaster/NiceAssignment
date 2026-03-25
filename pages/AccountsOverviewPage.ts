import { type Locator, type Page } from '@playwright/test';

export class AccountsOverviewPage {
  public readonly accountsOverviewHeading: Locator;
  public readonly logoutLink: Locator;
  private readonly accountsOverviewNavLink: Locator;

  constructor(private readonly page: Page) {
    // Use a real heading element so we don't accidentally match the left sidebar link.
    this.accountsOverviewHeading = this.page.getByRole('heading', { name: /accounts overview/i });
    // Navigate by clicking the sidebar link (avoids 404s from direct navigation paths).
    this.accountsOverviewNavLink = this.page.getByRole('link', { name: /accounts overview/i });
    this.logoutLink = this.page.getByRole('link', { name: /log out/i });
  }

  async goto(): Promise<void> {
    await this.accountsOverviewNavLink.waitFor({ state: 'visible', timeout: 30000 });
    await this.accountsOverviewNavLink.click();
    await this.accountsOverviewHeading.waitFor({ state: 'visible', timeout: 30000 });
  }

  async refresh(): Promise<void> {
    // Re-render via navigation click (more reliable than direct reload for this legacy app).
    await this.goto();
  }

  accountRowById(accountId: string): Locator {
    // ParaBank accounts overview renders a table; we key off the accountId present in a row.
    return this.page.locator('table tr').filter({ hasText: accountId }).first();
  }
}

