import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQS } from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const kycQueueUrl = process.env.KYC_REQUEST_QUEUE_URL!;
const ltiQueueUrl = process.env.LTI_REQUEST_QUEUE_URL!;
const sqs = new SQS();

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const loanForm = event.body
      ? JSON.parse(event.body)
      : {
          accountId: "testAccountId",
          customerName: `Test Customer`,
          depositInfo: { amount: 1000 },
          loanAmount: 5000,
        };
    const { accountId, customerName, depositInfo, loanAmount } = loanForm;

    if (!accountId || !customerName || !depositInfo || !loanAmount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid loan form data." }),
      };
    }

    // Send loan form to both KYC and LTI queues
    await sendMessageToQueue(kycQueueUrl, { accountId, customerName, depositInfo });
    await sendMessageToQueue(ltiQueueUrl, { accountId, loanAmount });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Loan application dispatched to KYC and LTI services.",
      }),
    };
  } catch (error) {
    console.error("Error dispatching loan application:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

async function sendMessageToQueue(queueUrl: string, messageBody: object) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
  };
  await sqs.sendMessage(params).promise()  
}
