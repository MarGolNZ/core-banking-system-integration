# Define SQS queues for each downstream function

# Define the Dead Letter Queue for KYC Check Request
resource "aws_sqs_queue" "kyc_request_dlq" {
  name                     = "KYCRequestDLQ"
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 20
}

# Define the KYC Check Request Queue
resource "aws_sqs_queue" "kyc_request_queue" {
  name = "KYCRequestQueue"

  visibility_timeout_seconds = 3600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.kyc_request_dlq.arn
    maxReceiveCount     = 3
  })

  policy = <<POLICY
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": "*",
              "Action": "sqs:SendMessage",
              "Resource": "*"
            },
            {
              "Effect": "Allow",
              "Principal": "*",
              "Action": "sqs:SendMessage"
            }
          ]
        }
        POLICY
}

# Define the Dead Letter Queue for KYC Result
resource "aws_sqs_queue" "kyc_result_dlq" {
  name                     = "KYCResultDLQ"
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 20
}

# Define the KYC Check Result Queue
resource "aws_sqs_queue" "kyc_result_queue" {
  name = "KYCResultQueue"

  visibility_timeout_seconds = 3600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.kyc_result_dlq.arn
    maxReceiveCount     = 3
  })

  policy = <<POLICY
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": "*",
              "Action": "sqs:SendMessage",
              "Resource": "*"
            },
            {
              "Effect": "Allow",
              "Principal": "*",
              "Action": "sqs:SendMessage"
            }
          ]
        }
        POLICY
}

