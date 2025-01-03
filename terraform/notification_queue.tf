resource "aws_sqs_queue" "notification_request_queue" {
  name                     = "NotificationRequestQueue"
  message_retention_seconds = 1209600
  visibility_timeout_seconds = 30
}

