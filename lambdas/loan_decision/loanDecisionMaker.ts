import { SQSEvent } from "aws-lambda";
import { SQS } from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const notificationQueueUrl = process.env.NOTIFICATION_QUEUE_URL!;
const sqs = new SQS();

export const handler = async (event: SQSEvent) => {
  try {

    if (!event.Records || !Array.isArray(event.Records)) {
      throw new Error("Invalid event: Missing or invalid Records array");
    }
    
    let kycResult: any = null;
    let ltiResult: any = null;

    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      if (message.type === "KYCResult") {
        kycResult = message.result;
      } else if (message.type === "LTIResult") {
        ltiResult = message.result;
      }
    }

    // Validate both results
    if (kycResult === null || ltiResult === null) {
      throw new Error("Missing KYC or LTI result for decision making");
    }

    const decision = kycResult && ltiResult ? "Approved" : "Rejected";

    // Send decision to Notification Queue
    await sendMessageToQueue(notificationQueueUrl, {
      type: "LoanDecision",
      decision,
    });

    console.log(`Loan decision made: ${decision}`);
  } catch (error) {
    console.error("Error in loan decision making:", error);
    throw error;
  }
};

async function sendMessageToQueue(queueUrl: string, messageBody: object) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
  };
  await sqs.sendMessage(params).promise();
}
