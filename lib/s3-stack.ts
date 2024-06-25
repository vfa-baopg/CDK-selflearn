import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import getEnv from '../shared/getEnv'

export class S3Stack {
  public readonly bucket: s3.Bucket

  constructor(scope: Construct) {
    const s3BucketName = getEnv('S3_BUCKET_NAME')
    this.bucket = new s3.Bucket(scope, 'cdk-bucket', {
      bucketName: `my-unique-bucket-${s3BucketName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
  }

  public addPolicy(policy: iam.PolicyStatement) {
    this.bucket.addToResourcePolicy(policy)
  }
}
