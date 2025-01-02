variable "region" {
  description = "The AWS region"
  default     = "us-east-1"
}

variable "profile" {
  description = "AWS CLI Profile to use"
  type        = string
  default     = "default"
}
