export const messages = {
  registration: {
    success: 'Your account was created successfully',
  },
} as const;

export const baseUrl = 'https://parabank.parasoft.com/parabank';

export const uiTimeouts = {
  LONG_MS: 30000,
  SHORT_MS: 10000,
} as const;

export const testData = {
  // Invalid but syntactically valid IDs for negative API assertions.
  INVALID_CUSTOMER_ID: '999999999999',
  INVALID_ACCOUNT_ID: '999999999999',

  // Core banking test inputs.
  TRANSFER_AMOUNT: '10.00',
  CHECKING_ACCOUNT_TYPE: 'CHECKING',
} as const;

export const regex = {
  numericId: /^\d+$/,
  signedDecimal: /^-?\d+(\.\d+)?$/,
} as const;

