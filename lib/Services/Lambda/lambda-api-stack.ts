import { LambdaIntegration, MethodLoggingLevel, RestApi } from "aws-cdk-lib/aws-apigateway"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, Runtime, AssetCode, Code } from "aws-cdk-lib/aws-lambda"
import { Duration, Stack, StackProps } from "aws-cdk-lib"
import s3 = require("aws-cdk-lib/aws-s3")
import { Construct } from "constructs"
import { S3Stack } from "../../s3-stack"
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

interface LambdaApiStackProps extends StackProps {
    functionName: string,
    s3Stack: S3Stack
}

export class lambdaAPIStack extends Construct {
    private restApi: RestApi
    private lambdaFunction: Function
    private bucket: s3.Bucket

    constructor(scope: Construct, id: string, props: LambdaApiStackProps) {
        super(scope, id)

        this.bucket = props.s3Stack.bucket


        // Create the Lambda execution role
        const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
          ]
        });
    
        // Add additional permissions to the Lambda execution role if needed
        lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [this.bucket.bucketArn + '/*'],
        }));
    
        lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions:  [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogGroups",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "logs:GetLogEvents",
            "logs:FilterLogEvents"
          ],
          resources: ['arn:aws:logs:*:*:*'],
        }));

        this.restApi = new RestApi(this, props.functionName + "RestApi", {
            deployOptions: {
                stageName: "beta",
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
            },
            cloudWatchRole: true,
            cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY
        })

      const lambdaPolicy = new PolicyStatement()
      lambdaPolicy.addActions("s3:ListBucket")
      lambdaPolicy.addActions("s3:getBucketLocation")
      lambdaPolicy.addResources(this.bucket.bucketArn)

      // Create the Lambda function
      this.lambdaFunction = new lambda.Function(this, props.functionName, {
        functionName: props.functionName,
        handler: "handler.handler",
        runtime: lambda.Runtime.NODEJS_18_X,
        role: lambdaExecutionRole,
        code: lambda.Code.fromAsset('lib/Services/Lambda/src'),
        memorySize: 512,
        timeout: Duration.seconds(10),
        environment: {
          BUCKET: this.bucket.bucketName,
        },
      });

      this.lambdaFunction.addToRolePolicy(lambdaPolicy)
      
      this.restApi.root.addMethod("GET", new LambdaIntegration(this.lambdaFunction, {}))
  
    }
}