import { SQSEvent } from "aws-lambda";
import { SES } from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const ses = new SES();
const emailSender = process.env.EMAIL_SENDER!;
const emailRecipient = process.env.EMAIL_RECIPIENT!;

export const handler = async (event: SQSEvent) => {
  try {

    if (!event.Records || !Array.isArray(event.Records)) {
      throw new Error("Invalid event: Missing or invalid Records array");
    }

    for (const record of event.Records) {
      const message = JSON.parse(record.body);

      if (message.type === "LoanDecision") {
        const decision = message.decision;

        // Trigger downstream actions
        if (decision === "Approved") {
          await sendApprovalNotification();
        } else {
          await sendRejectionNotification();
        }
      } else {
        console.warn("Unknown message type:", message.type);
      }
    }
  } catch (error) {
    console.error("Error in notification handler:", error);
    throw error;
  }
};

async function sendApprovalNotification() {
  console.log("Sending approval notification...");
  await sendEmail(
    "Loan Approved",
    "Your loan application has been approved. Congratulations!"
  );
  // Add additional downstream actions, such as SMS or other integrations
}

async function sendRejectionNotification() {
  console.log("Sending rejection notification...");
  await sendEmail(
    "Loan Rejected",
    "We regret to inform you that your loan application has been rejected."
  );
  // Add additional downstream actions, such as SMS or other integrations
}

async function sendEmail(subject: string, body: string) {
  const params = {
    Source: emailSender,
    Destination: {
      ToAddresses: [emailRecipient],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Text: {
          Data: body,
        },
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    console.log(`Email sent successfully to ${emailRecipient}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
