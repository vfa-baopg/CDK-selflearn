import { App, Stack, StackProps, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { join } from 'path'
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEvents from 'aws-cdk-lib/aws-lambda-event-sources';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';


export interface S3SnsSqsLambdaChainStackProps extends StackProps {
    s3Bucket: s3.Bucket
}
export class S3SnsSqsLambdaChainStack extends Construct {

        public readonly region = 'us-east-1';
        public readonly account = 'AKIAQ3EGPZYS3ZSC6HPN';
  constructor(scope: Construct, id: string, props: S3SnsSqsLambdaChainStackProps) {
    super(scope, id);

    // Create a SQS Queue.
    // A dead-letter queue is optional but it helps capture any failed messages.
    const deadLetterQueue = new sqs.Queue(this, 'CsvUploadDeadLetterQueue', {
      queueName: 'CsvUploadDeadLetterQueue',
      retentionPeriod: Duration.days(7)
    });
    const uploadQueue = new sqs.Queue(this, 'CsvUploadQueue', {
      queueName: 'CsvUploadQueue',
      visibilityTimeout: Duration.seconds(30),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: deadLetterQueue
      }
    });

    // Create a SNS Topic.
    const uploadEventTopic = new sns.Topic(this, 'CsvUploadTopic', {
      topicName: 'CsvUploadTopic'
    });

    // Bind the SQS Queue to the SNS Topic.
    const sqsSubscription = new snsSubscriptions.SqsSubscription(uploadQueue, {
      rawMessageDelivery: true
    });
    uploadEventTopic.addSubscription(sqsSubscription);

    // Binds the S3 bucket to the SNS Topic.
    props.s3Bucket.addEventNotification(
      // Modify the `s3.EventType.*` to handle other object operations.
      s3.EventType.OBJECT_CREATED_PUT,
      new s3Notifications.SnsDestination(uploadEventTopic), {
      // The trigger will only fire on files with the .csv extension.
      suffix: '.csv'
    });


    // Create a Lambda function that will be triggered by the SQS Queue.
    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'CsvUploadEventLambda', {
      functionName: 'CsvUploadEventLambda',
      entry: join(__dirname, '..', 'lambda', 'lambda.ts'),
    });

    // Bind the Lambda to the SQS Queue.
    const invokeEventSource = new lambdaEvents.SqsEventSource(uploadQueue);
    lambdaFunction.addEventSource(invokeEventSource);

    // Outputs to help access the key resources.
    new CfnOutput(this, 'DeadLetterQueueUrl', {
      exportName: 'DeadLetterQueue',
      value: `https://console.aws.amazon.com/sqs/home?region=${this.region}#queue/arn:aws:sqs:${this.region}:${this.account}:${deadLetterQueue.queueName}`
    })
    new CfnOutput(this, 'LambdaLogsUrl', {
      exportName: 'LambdaLogs',
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${lambdaFunction.functionName}`
    })
    new CfnOutput(this, 'UploadCsvToBucketCommand', {
      exportName: 'UploadCsvToBucketCommand',
      value: `aws s3 cp example.csv s3://${props.s3Bucket.bucketName}/example.csv --acl bucket-owner-full-control`
    })
  }
}