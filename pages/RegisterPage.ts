import { type Locator, type Page } from '@playwright/test';
import { createFakeRegistrationUser } from '@utils/createFakeRegistrationUser';
import { messages } from '@const/constants';

export type RegistrationUser = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
};

export class RegisterPage {
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly addressStreet: Locator;
  private readonly addressCity: Locator;
  private readonly addressState: Locator;
  private readonly zipCode: Locator;
  private readonly phoneNumber: Locator;
  private readonly ssn: Locator;
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly repeatedPassword: Locator;
  private readonly registerLink: Locator;
  private readonly registerButton: Locator;
  public readonly registrationSuccessMessage: Locator;
  public readonly firstNameRequiredErrorMessage: Locator;

  constructor(private readonly page: Page) {

    // Prefer `id` selectors: they are stable for this application and avoid CSS escaping issues.
    this.firstName = this.page.locator('[id="customer.firstName"]');
    this.lastName = this.page.locator('[id="customer.lastName"]');
    this.addressStreet = this.page.locator('[id="customer.address.street"]');
    this.addressCity = this.page.locator('[id="customer.address.city"]');
    this.addressState = this.page.locator('[id="customer.address.state"]');
    this.zipCode = this.page.locator('[id="customer.address.zipCode"]');
    this.phoneNumber = this.page.locator('[id="customer.phoneNumber"]');
    this.ssn = this.page.locator('[id="customer.ssn"]');
    this.username = this.page.locator('[id="customer.username"]');
    this.password = this.page.locator('[id="customer.password"]');
    this.repeatedPassword = this.page.locator('[id="repeatedPassword"]');
    this.registerLink = this.page.getByRole('link', { name: /^Register$/i });
    this.registerButton = this.page.locator('input[type="submit"][value="Register"]');
    this.registrationSuccessMessage = this.page.getByText(new RegExp(messages.registration.success, 'i'));
    this.firstNameRequiredErrorMessage = this.page.getByText(/First name is required\./i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.registerLink.click();
    await this.firstName.waitFor({ state: 'visible' });
  }

  async register(user: RegistrationUser): Promise<void> {
    await this.firstName.fill(user.firstName);
    await this.lastName.fill(user.lastName);
    await this.addressStreet.fill(user.address);
    await this.addressCity.fill(user.city);
    await this.addressState.fill(user.state);
    await this.zipCode.fill(user.zipCode);
    await this.phoneNumber.fill(user.phoneNumber);
    await this.ssn.fill(user.ssn);
    await this.username.fill(user.username);
    await this.password.fill(user.password);
    await this.repeatedPassword.fill(user.password);
    await this.registerButton.click();
  }

  async registerWithFakeData(): Promise<void> {
    const user = createFakeRegistrationUser();
    await this.register(user);
  }
}

