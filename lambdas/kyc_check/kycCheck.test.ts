import { handler } from "./kycCheck";
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SQSEvent } from "aws-lambda";
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

jest.mock('aws-sdk', () => {
  const SQSMocked = {
    sendMessage: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  return {
    SQS: jest.fn(() => SQSMocked)
  };
});

const sqs = new AWS.SQS({
  region: 'us-east-1'
});

describe("KYC Check Lambda", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    (sqs.sendMessage as jest.MockedFunction<any>).mockReset();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should send a KYC Success message when the customer passes the check", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            customerName: "John Doe",
            depositInfo: { amount: 1000 },
            loanAmount: 5000,
          }),
        },
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent as SQSEvent);

    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.KYC_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        customerName: "John Doe",
        status: "KYC Success",
        reason: undefined,
      }),
    });
  });

  it("should send a KYC Failure message with reason", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            customerName: "Pablo Escobar",
            depositInfo: { amount: 1000 },
            loanAmount: 5000,
          }),
        },
      ],
    };
  
    await handler(mockEvent as SQSEvent);
  
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.KYC_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        customerName: "Pablo Escobar",
        status: "KYC Failure",
        reason: "Blacklisted Name",
      }),
    });
  });

  it("should process KYC check and send failure message for blacklisted name", async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            customerName: "Pablo Escobar",
            depositInfo: { amount: 1000 },
            loanAmount: 5000,
          }),
        } as any,
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent);

    expect(sqs.sendMessage).toHaveBeenCalledTimes(1);
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.KYC_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        customerName: "Pablo Escobar",
        status: "KYC Failure",
        reason: "Blacklisted Name",
      }),
    });
  });

  it("should log an error if processing fails", async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            customerName: "John Doe",
            depositInfo: { amount: 1000 },
            loanAmount: 5000,
          }),
        } as any,
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent);

    expect(console.error).toHaveBeenCalledWith("Error processing KYC check:", expect.any(Error));
  });
});