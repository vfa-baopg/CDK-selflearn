import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { S3Stack } from './s3-stack';

export class CloudfrontStack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, s3: S3Stack) {
    const origin = new origins.S3Origin(s3.bucket);
    this.distribution = new cloudfront.Distribution(scope, 'cdk-cloudfront', {
      defaultBehavior: {
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      }
    })
  }
}
