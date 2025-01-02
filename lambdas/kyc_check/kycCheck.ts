import { SQSEvent } from "aws-lambda";
import { SQS } from "aws-sdk";

const kycResultQueueUrl = process.env.KYC_RESULT_QUEUE_URL!;
const sqs = new SQS();

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const { accountId, customerName, depositInfo, loanAmount } = JSON.parse(record.body);

      // Perform KYC check logic
      const kycValid = await performKycCheck(accountId, customerName, depositInfo, loanAmount);

      // Send KYC result to the result queue
      await sendMessageToQueue(kycResultQueueUrl, {
        accountId,
        customerName,
        status: kycValid ? "KYC Success" : "KYC Failure",
        reason: !kycValid && customerName === "Pablo Escobar" ? "Blacklisted Name" : undefined,
      });
    }
  } catch (error) {
    console.error("Error processing KYC check:", error);
  }
};

// Simulate KYC check logic
async function performKycCheck(accountId: string, customerName: string, depositInfo: any, loanAmount: number): Promise<boolean> {
  // Check for blacklisted name
  if (customerName === "Pablo Escobar") {
    return false; // Fail the KYC check
  }

  // Perform actual KYC validation here
  return Math.random() > 0.5; // Mock result
}

// Helper function to send messages to the queue
async function sendMessageToQueue(queueUrl: string, messageBody: object) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
  };
  await sqs.sendMessage(params).promise();
}
