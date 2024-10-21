import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PriceClass, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Stack } from './s3-stack';
import { AcmStack } from './acm-stack';
import getEnv from '../shared/getEnv';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { S3OriginWithOACPatch } from './s3-origin-with-oac-patch';

export class CloudfrontStack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, s3: S3Stack, acm: AcmStack) {
    const s3BucketOAC = new cloudfront.CfnOriginAccessControl(scope, 'cdk-s3-bucket-OAC', {
      originAccessControlConfig: {
        name: 's3-bucket-OAC',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });
    const s3BucketOrigin = new S3OriginWithOACPatch(
      Bucket.fromBucketName(scope, 'cdk-bucket-copy', s3.bucket.bucketName),
      { oacId: s3BucketOAC.getAtt('Id') }
    );
    const domainNames = getEnv('DOMAIN_NAME_LIST')?.split(',');
    if (!domainNames || domainNames.length === 0) {
      throw new Error('DOMAIN_NAME_LIST environment variable is not set or is empty');
    }
    this.distribution = new cloudfront.Distribution(scope, 'cdk-cloudfront-distribution', {
      defaultBehavior: {
        origin: s3BucketOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [domainNames[0]],
      certificate: acm.certification,
      priceClass: PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });
    // S3 - BucketPolicy
    const contentsBucketPolicyStatement = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      resources: [`${s3.bucket.bucketArn}/*`],
    });
    s3.addPolicy(contentsBucketPolicyStatement);
  }
}
