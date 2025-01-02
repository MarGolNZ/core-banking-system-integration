resource "aws_iam_role" "loan_decision_exec_role" {
  name               = "loan-decision-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "loan_decision_basic_policy" {
  role       = aws_iam_role.loan_decision_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "decision_maker_policy" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]
    resources = [
      aws_sqs_queue.kyc_result_queue.arn,
      aws_sqs_queue.lti_result_queue.arn,
    ]
    effect = "Allow"
  }

  statement {
    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.notification_request_queue.arn]
    effect    = "Allow"
  }
}

resource "aws_iam_role_policy" "decision_maker_access" {
  name   = "LoanDecisionAccessPolicy"
  role   = aws_iam_role.loan_decision_exec_role.id
  policy = data.aws_iam_policy_document.decision_maker_policy.json
}

resource "null_resource" "compile_loan_decision_lambda" {
  triggers = {
    source_hash = filesha256("${path.module}/../lambdas/loan_decision/loanDecisionMaker.ts")
  }
  provisioner "local-exec" {
    command = <<EOT
      cd ../lambdas/loan_decision && \
      npm ci && \
      npm run build && \
      rm -rf .temp && mkdir .temp && \
      cp -r node_modules dist/* .temp && \
      cd ../../terraform
    EOT
  }
}

data "archive_file" "loan_decision_lambda_package" {
  depends_on  = [null_resource.compile_loan_decision_lambda]
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/loan_decision/.temp"
  output_path = "${path.module}/../lambdas/loan_decision/.deployment_package.zip"
}

resource "aws_lambda_function" "loan_decision_maker" {
  function_name = "loanDecisionMaker"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.loan_decision_exec_role.arn
  handler       = "loanDecisionMaker.handler"

  filename      = data.archive_file.loan_decision_lambda_package.output_path

  environment {
    variables = {
      NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification_request_queue.url
    }
  }
}
