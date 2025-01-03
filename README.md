# Loan Application Processing System

## The Loan Application Processing System is a serverless application built using AWS services such as Lambda, SQS, and SES. The system validates loan applications, performs KYC (Know Your Customer) and LTI (Loan to Income) checks, and processes notifications.

### Architecture Overview

```mermaid
graph TD;
  A[Loan Application Dispatcher (Lambda)] -->|Sends to KYC Queue| B[KYC Check (Lambda)];
  A -->|Sends to LTI Queue| C[LTI Check (Lambda)];
  B -->|Result to KYC Result Queue| D[Loan Decision Maker (Lambda)];
  C -->|Result to LTI Result Queue| D;
  D -->|Final Decision to Notification Queue| E[Notification Handler (Lambda)];
  E -->|Sends Email| F[SES];
```

### Prerequisites
AWS CLI installed and configured.
Node.js (v18.x or later) installed.
Terraform installed for infrastructure deployment.

### Setup Instructions
- Automated Setup (via Terraform):
```
terraform init
terraform plan
terraform apply
```
- Manual Setup (for Local Testing):

```
cd lambdas/loan_application
npm install
npm run build

cd ../kyc_check
npm install
npm run build

cd ../lti_check
npm install
npm run build

cd ../notification_handler
npm install
npm run build
```

### Running Tests
```
npx jest
```