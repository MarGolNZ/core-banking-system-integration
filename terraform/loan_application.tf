resource "aws_iam_role" "loan_application_exec_role" {
  name               = "loan-application-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "loan_application_basic_policy" {
  role       = aws_iam_role.loan_application_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "sqs_access" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = [
      aws_sqs_queue.kyc_request_queue.arn,
      aws_sqs_queue.lti_request_queue.arn,
    ]
    effect = "Allow"
  }
}

resource "aws_iam_role_policy" "sqs_access_policy" {
  name   = "LoanApplicationLambdaSQSAccess"
  role   = aws_iam_role.loan_application_exec_role.id
  policy = data.aws_iam_policy_document.sqs_access.json
}

# Step 1: Compile the Lambda function
resource "null_resource" "compile_loan_application_lambda" {
  triggers = {
    source_hash = filesha256("${path.module}/../lambdas/loan_application/loanApplicationDispatcher.ts")
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ../lambdas/loan_application && \
      npm ci && \
      npm run build && \
      rm -rf .temp && mkdir .temp && \
      cp -r node_modules  .temp && \
      cp -r dist/* .temp && \
      cd ../../terraform
    EOT
  }
}

# Step 2: Zip the compiled Lambda function
data "archive_file" "loan_application_lambda_package" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/loan_application/.temp"
  output_path = "${path.module}/../lambdas/loan_application/.deployment_package.zip"

  depends_on  = [null_resource.compile_loan_application_lambda]
}

# Step 3: Deploy the Lambda function
resource "aws_lambda_function" "loan_application" {
  function_name = "loanApplicationLambda"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.loan_application_exec_role.arn
  handler       = "loanApplicationDispatcher.handler"

  filename      = data.archive_file.loan_application_lambda_package.output_path

  environment {
    variables = {
      KYC_REQUEST_QUEUE_URL = aws_sqs_queue.kyc_request_queue.url
      LTI_REQUEST_QUEUE_URL = aws_sqs_queue.lti_request_queue.url
    }
  }

  depends_on = [null_resource.compile_loan_application_lambda]
}