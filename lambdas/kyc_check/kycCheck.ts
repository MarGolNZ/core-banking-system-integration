import { SQSEvent } from "aws-lambda";
import { SQS } from "aws-sdk";

const kycResultQueueUrl = process.env.KYC_RESULT_QUEUE_URL!;
const sqs = new SQS();

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const { accountId, depositInfo, loanAmount } = JSON.parse(record.body);

      // Perform KYC check logic
      const kycValid = await performKycCheck(accountId, depositInfo, loanAmount);

      // Send KYC result to the result queue
      await sendMessageToQueue(kycResultQueueUrl, {
        accountId,
        status: kycValid ? "KYC Success" : "KYC Failure",
      });
    }
  } catch (error) {
    console.error("Error processing KYC check:", error);
  }
};

// Simulate KYC check logic
async function performKycCheck(accountId: string, depositInfo: any, loanAmount: number): Promise<boolean> {
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
