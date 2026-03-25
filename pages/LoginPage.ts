import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly loginButton: Locator;

  private readonly loginErrorMessage: Locator;
  private readonly customerLoginHeading: Locator;

  constructor(private readonly page: Page) {
    // Use accessible labels/roles to avoid brittle selectors.
    // ParaBank uses stable IDs for these inputs.
    this.username = this.page.locator('#username, input[name="username"]');
    this.password = this.page.locator('#password, input[name="password"]');

    this.loginButton = this.page.locator(
      'input[type="submit"][value="Log In"], input[type="submit"][value="Log in"], button:has-text("Log In")',
    );

    this.loginErrorMessage = this.page.getByText(
      /an internal error has occurred and has been logged\./i,
    );
    this.customerLoginHeading = this.page.getByRole('heading', { name: /customer login/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');

    // Login form may or may not be visible depending on authentication state.
    // We only guarantee navigation completes; callers can decide what state they expect.
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(username: string, password: string): Promise<void> {
    if (!(await this.username.isVisible().catch(() => false))) {
      // Likely already authenticated (ParaBank redirects away from the login form).
      return;
    }

    await this.password.waitFor({ state: 'visible', timeout: 30000 });

    await this.username.fill(username);
    await this.password.fill(password);

    // Ensure we actually filled the correct inputs.
    await expect(this.username).toHaveValue(username);
    await expect(this.password).toHaveValue(password);

    await this.loginButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.loginButton.click();

    // Wait for either the known login error message or a redirect away from the login heading.
    // (Logout is part of the global menu, not the login page object.)
    const failure = this.loginErrorMessage.waitFor({ state: 'visible', timeout: 30000 });
    const movedAway = this.customerLoginHeading.waitFor({ state: 'detached', timeout: 30000 });
    const result = await Promise.race([
      movedAway.then(() => 'success'),
      failure.then(() => 'failure'),
    ]);

    if (result !== 'success') {
      throw new Error('Login failed: ParaBank returned "An internal error has occurred and has been logged."');
    }
  }
}

