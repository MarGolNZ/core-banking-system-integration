import { SQSEvent } from "aws-lambda";
import { SQS } from "aws-sdk";

const ltiResultQueueUrl = process.env.LTI_RESULT_QUEUE_URL!;
const sqs = new SQS();

export const handler = async (event: SQSEvent) => {

  if (!event.Records || !Array.isArray(event.Records)) {
    throw new Error("Invalid event: Missing or invalid Records array");
  }
  
  for (const record of event.Records) {
    const { accountId, loanAmount } = JSON.parse(record.body);

    // Perform LTI check logic
    const ltiValid = await performLtiCheck(accountId, loanAmount);

    // Send LTI result to result queue
    await sendMessageToQueue(ltiResultQueueUrl, {
      accountId,
      loanAmount,
      status: ltiValid ? "LTI Success" : "LTI Failure",
    });
  }
};

async function performLtiCheck(accountId: string, loanAmount: number): Promise<boolean> {
  // Simulate LTI check logic
  return loanAmount < 10000; // Mock result: valid if loan amount < 10,000
}

async function sendMessageToQueue(queueUrl: string, messageBody: object) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
  };
  await sqs.sendMessage(params).promise();
}
