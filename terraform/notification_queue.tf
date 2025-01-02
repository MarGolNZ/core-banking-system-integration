resource "aws_sqs_queue" "notification_request_queue" {
  name                     = "NotificationRequestQueue"
  message_retention_seconds = 1209600
  visibility_timeout_seconds = 30
}

output "notification_request_queue_url" {
  description = "URL of the Notification Request Queue"
  value       = aws_sqs_queue.notification_request_queue.url
}

output "notification_request_queue_arn" {
  description = "ARN of the Notification Request Queue"
  value       = aws_sqs_queue.notification_request_queue.arn
}
