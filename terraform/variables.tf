variable "region" {
  description = "The AWS region"
  default     = "us-east-1"
}

variable "profile" {
  description = "AWS CLI Profile to use"
  type        = string
  default     = "default"
}

variable "email_sender" {
  description = "SES-verified email address to send notifications"
  type        = string
  default     = "verified-sender@example.com"  # Replace with your verified email
}

variable "email_recipient" {
  description = "Recipient email address to receive notifications"
  type        = string
  default     = "recipient@example.com"        # Replace with your email
}
