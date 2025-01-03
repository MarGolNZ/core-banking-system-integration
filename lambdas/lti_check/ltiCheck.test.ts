import { handler } from "./ltiCheck";
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

describe("LTI Check Lambda", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    (sqs.sendMessage as jest.MockedFunction<any>).mockReset();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should send an LTI Success message when the loan amount is valid", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            loanAmount: 5000,
          }),
        },
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent as SQSEvent);

    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.LTI_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        loanAmount: 5000,
        status: "LTI Success",
      }),
    });
  });

  it("should send an LTI Failure message when the loan amount exceeds the limit", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            loanAmount: 20000,
          }),
        },
      ],
    };
  
    await handler(mockEvent as SQSEvent);
  
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.LTI_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        loanAmount: 20000,
        status: "LTI Failure",
      }),
    });
  });

  it("should send an LTI Failure message when the loan amount exceeds the limit", async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            loanAmount: 20000,
          }),
        } as any,
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent);

    expect(sqs.sendMessage).toHaveBeenCalledTimes(1);
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.LTI_RESULT_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        loanAmount: 20000,
        status: "LTI Failure",
      }),
    });
  });

  it("should log an error if processing fails", async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            accountId: "12345",
            loanAmount: 5000,
          }),
        } as any,
      ],
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValue(new Promise(() => ({})));

    await handler(mockEvent);

    expect(console.error).toHaveBeenCalledWith("Error processing LTI check:", expect.any(Error));
  });
});