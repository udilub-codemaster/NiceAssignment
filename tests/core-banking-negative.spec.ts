import { expect } from '@playwright/test';
import { test } from '@fixtures/fixtures';
import { createFakeRegistrationUser } from '@utils/createFakeRegistrationUser';
import { getCustomerIdByLogin } from '@api/customerApi';
import { createCheckingAccountViaCurl, getAccountsByCustomerId } from '@api/accountsApi';
import { testData, uiTimeouts } from '@const/constants';

test('core-banking negative: missing mandatory registration field shows error', async ({ registerPage }) => {
  const user = createFakeRegistrationUser();
  user.firstName = '';

  await registerPage.register(user);
  await expect(registerPage.firstNameRequiredErrorMessage).toBeVisible({ timeout: uiTimeouts.SHORT_MS });
});

test('core-banking negative: accounts API rejects invalid customerId', async ({ request }) => {
  const wrongCustomerId = testData.INVALID_CUSTOMER_ID;
  await expect(getAccountsByCustomerId(request, wrongCustomerId)).rejects.toThrow();
});

test('core-banking negative: creating CHECKING with invalid fromAccountId fails (API)', async ({
  registerPage,
  request,
}) => {
  const user = createFakeRegistrationUser();
  await registerPage.register(user);
  await expect(registerPage.registrationSuccessMessage).toBeVisible({ timeout: uiTimeouts.LONG_MS });

  const customerId = await getCustomerIdByLogin(request, user.username, user.password);
  const invalidFromAccountId = testData.INVALID_ACCOUNT_ID;

  await expect(
    createCheckingAccountViaCurl({
      customerId,
      fromAccountId: invalidFromAccountId,
    }),
  ).rejects.toThrow();
});

