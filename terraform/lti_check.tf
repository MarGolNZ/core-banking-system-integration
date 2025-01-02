# Define IAM Role for LTI Check Lambda
resource "aws_iam_role" "lti_check_exec_role" {
  name               = "lti-check-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "lti_check_basic_policy" {
  role       = aws_iam_role.lti_check_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lti_queues_policy" {
  # Input queue permissions
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.lti_request_queue.arn]
    effect    = "Allow"
  }

  # Output queue permissions
  statement {
    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.lti_result_queue.arn]
    effect    = "Allow"
  }
}

resource "aws_iam_role_policy" "lti_queue_access" {
  name   = "LtiQueueAccessPolicy"
  role   = aws_iam_role.lti_check_exec_role.id
  policy = data.aws_iam_policy_document.lti_queues_policy.json
}

# Compile and Deploy the Lambda
resource "null_resource" "compile_lti_check_lambda" {
  triggers = {
    source_hash = filesha256("${path.module}/../lambdas/lti_check/ltiCheck.ts")
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ../lambdas/lti_check && \
      npm ci && \
      npm run build && \
      [ -d .temp ] && rm -rf .temp || true && \
      mkdir .temp && \
      cp -r node_modules  .temp && \
      cp -r dist/* .temp && \
      cd ../../terraform
    EOT
  }
}

data "archive_file" "lti_check_lambda_package" {
  depends_on  = [null_resource.compile_lti_check_lambda]
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/lti_check/.temp"
  output_path = "${path.module}/../lambdas/lti_check/.deployment_package.zip"
}

resource "aws_lambda_function" "lti_check" {
  function_name = "ltiCheckLambda"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lti_check_exec_role.arn
  handler       = "ltiCheck.handler"

  filename      = data.archive_file.lti_check_lambda_package.output_path

  environment {
    variables = {
      LTI_RESULT_QUEUE_URL = aws_sqs_queue.lti_result_queue.url
    }
  }
}

