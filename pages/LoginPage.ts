import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly loginButton: Locator;

  private readonly loginErrorMessage: Locator;
  private readonly customerLoginHeading: Locator;
  private readonly logoutLink: Locator;

  constructor(private readonly page: Page) {
    // Use accessible labels/roles to avoid brittle selectors.
    // ParaBank uses stable IDs for these inputs.
    this.username = this.page.locator('#username, input[name="username"]');
    this.password = this.page.locator('#password, input[name="password"]');

    this.loginButton = this.page.locator(
      'input[type="submit"][value="Log In"], input[type="submit"][value="Log in"], button:has-text("Log In")',
    );

    // After successful login, ParaBank shows the account overview.
    this.logoutLink = this.page.getByRole('link', { name: /log out/i });

    this.loginErrorMessage = this.page.getByText(
      /an internal error has occurred and has been logged\./i,
    );
    this.customerLoginHeading = this.page.getByRole('heading', { name: /customer login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');

    // After registration, ParaBank may already start a session.
    // In that case, username/password inputs won't be present.
    try {
      await this.username.waitFor({ state: 'visible', timeout: 5000 });
      return;
    } catch {
      await this.logoutLink.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async logout(): Promise<void> {
    // Clicks "Log Out" when we are already authenticated.
    await this.logoutLink.click();

    // Wait until we are clearly back on the login page.
    await this.customerLoginHeading.waitFor({ state: 'visible', timeout: 30000 });
    await this.username.waitFor({ state: 'visible', timeout: 30000 });
  }

  async login(username: string, password: string): Promise<void> {
    if (await this.logoutLink.isVisible().catch(() => false)) {
      // Already logged in: no-op for the login submit.
      return;
    }

    await this.username.waitFor({ state: 'visible', timeout: 30000 });
    await this.password.waitFor({ state: 'visible', timeout: 30000 });

    await this.username.fill(username);
    await this.password.fill(password);

    // Ensure we actually filled the correct inputs.
    await expect(this.username).toHaveValue(username);
    await expect(this.password).toHaveValue(password);

    await this.loginButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.loginButton.click();

    // Wait for either a successful state or the known login error message.
    const success = this.logoutLink.waitFor({ state: 'visible', timeout: 30000 });
    const failure = this.loginErrorMessage.waitFor({ state: 'visible', timeout: 30000 });
    const result = await Promise.race([
      success.then(() => 'success'),
      failure.then(() => 'failure'),
    ]);

    if (result === 'failure') {
      throw new Error('Login failed: ParaBank returned "An internal error has occurred and has been logged."');
    }

    // Successful state: either accounts overview is ready or soon after.
    await this.logoutLink.waitFor({ state: 'visible', timeout: 30000 });
  }
}

