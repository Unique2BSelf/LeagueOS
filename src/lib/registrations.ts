export function isInsuranceBlockingStatus(status: string | null | undefined) {
  return status === 'REQUIRED' || status === 'EXPIRED';
}

export function resolveRegistrationStatus(input: {
  paid: boolean;
  insuranceStatus: string | null | undefined;
  currentStatus?: string | null;
}) {
  if (input.currentStatus === 'REJECTED') {
    return 'REJECTED';
  }

  if (!input.paid) {
    return 'PENDING';
  }

  return isInsuranceBlockingStatus(input.insuranceStatus) ? 'PENDING' : 'APPROVED';
}
