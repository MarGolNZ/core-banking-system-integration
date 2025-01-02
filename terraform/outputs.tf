output "kyc_request_queue_url" {
  description = "URL of the KYC Request SQS Queue"
  value       = aws_sqs_queue.kyc_request_queue.url
}

output "kyc_request_queue_arn" {
  description = "ARN of the KYC Request SQS Queue"
  value       = aws_sqs_queue.kyc_request_queue.arn
}

output "kyc_result_queue_url" {
  description = "URL of the KYC Result SQS Queue"
  value       = aws_sqs_queue.kyc_result_queue.url
}

output "lti_request_queue_url" {
  description = "URL of the LTI Request SQS Queue"
  value       = aws_sqs_queue.lti_request_queue.url
}

output "lti_request_queue_arn" {
  description = "ARN of the LTI Request SQS Queue"
  value       = aws_sqs_queue.lti_request_queue.arn
}

output "lti_result_queue_url" {
  description = "URL of the LTI Result SQS Queue"
  value       = aws_sqs_queue.lti_result_queue.url
}

# KYC Lambda
output "kyc_check_lambda_arn" {
  description = "ARN for the kyc-check-lambda"
  value       = aws_lambda_function.kyc_check.arn
}

