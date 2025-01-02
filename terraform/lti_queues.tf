# Define the Dead Letter Queue for LTI Request Queue
resource "aws_sqs_queue" "lti_request_dlq" {
  name                     = "LTIRequestDLQ"
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 20
}

# Define the LTI Request Queue
resource "aws_sqs_queue" "lti_request_queue" {
  name = "LTIRequestQueue"

  visibility_timeout_seconds = 3600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.lti_request_dlq.arn
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

# Define the Dead Letter Queue for LTI Result Queue
resource "aws_sqs_queue" "lti_result_dlq" {
  name                     = "LTIResultDLQ"
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 20
}

# Define the LTI Result Queue
resource "aws_sqs_queue" "lti_result_queue" {
  name = "LTIResultQueue"

  visibility_timeout_seconds = 3600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.lti_result_dlq.arn
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
