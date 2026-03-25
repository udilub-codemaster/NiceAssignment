export type CoreBankingFlowState = {
  customerId?: string;
  existingAccountId?: string;
  createdCheckingAccountId?: string;
  createdCheckingAccountBalance?: string;
  existingBeforeTransferBalance?: string;
  createdBeforeTransferBalance?: string;
  existingBeforeTransferType?: string;
};

export function createCoreBankingFlowState(): CoreBankingFlowState {
  return {};
}

