export interface CertificateVerifyDto {
  valid: boolean;
  permitRef?: string;
  ownerName?: string;
  suburb?: string;
  standNumber?: string;
  serial?: string;
  issuedAt?: string;
}
