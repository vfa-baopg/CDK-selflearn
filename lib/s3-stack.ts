import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class S3Stack {
  public readonly bucket: s3.Bucket;
  public readonly bucketPolicy: iam.PolicyStatement;

  constructor(scope: Construct) {
    // Create an S3 bucket
    this.bucket = new s3.Bucket(scope, 'cdk-bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Remove this line if you want to keep the bucket when the stack is deleted
    });

    // Grant read/write access to ECS tasks
    this.bucketPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [this.bucket.bucketArn + '/*'],
    });
  }
}
