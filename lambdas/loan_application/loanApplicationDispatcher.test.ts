import { handler } from "./loanApplicationDispatcher";
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '../env.test' });

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

describe("LoanApplicationDispatcher", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    (sqs.sendMessage().promise as jest.MockedFunction<any>).mockReset();
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should send messages to KYC and LTI queues when valid loan data is provided", async () => {
    const mockEvent = {
      body: JSON.stringify({
        accountId: "12345",
        customerName: "John Doe",
        depositInfo: { amount: 1000 },
        loanAmount: 5000,
      }),
    };
    
    const result = await handler(mockEvent as APIGatewayProxyEvent, {} as any, () => {});
    const response = result as APIGatewayProxyResult;

    expect(sqs.sendMessage).toHaveBeenCalledTimes(2);

    // Validate KYC Queue message
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.KYC_REQUEST_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        customerName: "John Doe",
        depositInfo: { amount: 1000 },
      }),
    });

    // Validate LTI Queue message
    expect(sqs.sendMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.LTI_REQUEST_QUEUE_URL,
      MessageBody: JSON.stringify({
        accountId: "12345",
        loanAmount: 5000,
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: "Loan application dispatched to KYC and LTI services.",
    });
  });

  it("should return a 400 error if loan form data is invalid", async () => {
    const mockEvent = {
      body: JSON.stringify({
        accountId: "",
        customerName: "",
        depositInfo: {},
        loanAmount: null,
      }),
    };

    const result = await handler(mockEvent as APIGatewayProxyEvent, {} as any, () => {});
    const response = result as APIGatewayProxyResult;

    expect(sqs.sendMessage).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "Invalid loan form data.",
    });
  });

  it("should return a 500 error if SQS sendMessage fails", async () => {
    const mockEvent = {
      body: JSON.stringify({
        accountId: "12345",
        customerName: "John Doe",
        depositInfo: { amount: 1000 },
        loanAmount: 5000,
      }),
    };

    (sqs.sendMessage as jest.MockedFunction<any>).mockReturnValueOnce(new Promise(() => ({})));
    const result = await handler(mockEvent as APIGatewayProxyEvent, {} as any, () => {});
    const response = result as APIGatewayProxyResult;

    expect(sqs.sendMessage).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(console.error).toHaveBeenCalledWith("Error dispatching loan application:", expect.any(Error));
  });
});