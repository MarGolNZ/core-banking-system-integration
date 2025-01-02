resource "aws_iam_role" "notification_handler_exec_role" {
  name               = "notification-handler-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "notification_handler_basic_policy" {
  role       = aws_iam_role.notification_handler_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Add SES permissions to the Lambda IAM role
data "aws_iam_policy_document" "notification_handler_policy" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.notification_request_queue.arn]
    effect    = "Allow"
  }

  # SES permissions
  statement {
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"] # Use * or restrict to specific SES identities (e.g., verified email/identity ARNs)
    effect    = "Allow"
  }
}

resource "aws_iam_role_policy" "notification_handler_access" {
  name   = "NotificationHandlerAccessPolicy"
  role   = aws_iam_role.notification_handler_exec_role.id
  policy = data.aws_iam_policy_document.notification_handler_policy.json
}

resource "null_resource" "compile_notification_handler_lambda" {
  triggers = {
    source_hash = filesha256("${path.module}/../lambdas/notification/notificationHandler.ts")
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ../lambdas/notification && \
      npm ci && \
      npm run build && \
      rm -rf .temp && mkdir .temp && \
      cp -r node_modules dist/* .temp && \
      cd ../../terraform
    EOT
  }
}

data "archive_file" "notification_handler_package" {
  depends_on  = [null_resource.compile_notification_handler_lambda]
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/notification/.temp"
  output_path = "${path.module}/../lambdas/notification/.deployment_package.zip"
}

resource "aws_lambda_function" "notification_handler" {
  function_name = "notificationHandler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.notification_handler_exec_role.arn
  handler       = "notificationHandler.handler"

  filename      = data.archive_file.notification_handler_package.output_path

  environment {
    variables = {
      EMAIL_SENDER    = var.email_sender
      EMAIL_RECIPIENT = var.email_recipient
    }
  }
}
