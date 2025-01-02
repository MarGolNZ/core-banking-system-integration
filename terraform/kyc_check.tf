# KYC Lambda Role and Policy
resource "aws_iam_role" "kyc_check_exec_role" {
  name               = "kyc-check-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "kyc_check_basic_policy" {
  role       = aws_iam_role.kyc_check_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "kyc_queues_policy" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.kyc_request_queue.arn]
    effect    = "Allow"
  }

  statement {
    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.kyc_result_queue.arn]
    effect    = "Allow"
  }
}

resource "aws_iam_role_policy" "kyc_queue_access" {
  name   = "KycQueueAccessPolicy"
  role   = aws_iam_role.kyc_check_exec_role.id
  policy = data.aws_iam_policy_document.kyc_queues_policy.json
}

# Compile the Lambda function
resource "null_resource" "compile_kyc_check_lambda" {
  triggers = {
    source_hash = filesha256("${path.module}/../lambdas/kyc_check/kycCheck.ts")
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ../lambdas/kyc_check && \
      npm ci && \
      npm run build && \
      rm -rf .temp && mkdir .temp && \
      cp -r node_modules dist/* .temp && \
      cd ../../terraform
    EOT
  }
}

# Zip the Lambda function
data "archive_file" "kyc_check_lambda_package" {
  depends_on  = [null_resource.compile_kyc_check_lambda]
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/kyc_check/.temp"
  output_path = "${path.module}/../lambdas/kyc_check/.deployment_package.zip"
}

# Deploy the Lambda function
resource "aws_lambda_function" "kyc_check" {
  function_name = "kycCheckLambda"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.kyc_check_exec_role.arn
  handler       = "kycCheck.handler"

  filename      = data.archive_file.kyc_check_lambda_package.output_path

  environment {
    variables = {
      KYC_RESULT_QUEUE_URL = aws_sqs_queue.kyc_result_queue.url
    }
  }
}
