import { type Locator, type Page } from '@playwright/test';

export class TopMenuPage {
  public readonly logoutLink: Locator;
  private readonly customerLoginHeading: Locator;
  private readonly username: Locator;

  constructor(private readonly page: Page) {
    // ParaBank renders a global navigation area with "Log Out" when authenticated.
    this.logoutLink = this.page.getByRole('link', { name: /log out/i });

    // Used to confirm we returned to the logged-out state.
    this.customerLoginHeading = this.page.getByRole('heading', { name: /customer login/i });
    this.username = this.page.locator('#username, input[name="username"]');
  }

  async logout(): Promise<void> {
    await this.logoutLink.waitFor({ state: 'visible', timeout: 30000 });
    await this.logoutLink.click();
    await this.customerLoginHeading.waitFor({ state: 'visible', timeout: 30000 });
    await this.username.waitFor({ state: 'visible', timeout: 30000 });
  }
}

