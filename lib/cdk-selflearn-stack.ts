import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';
import { ECSStack } from './cluster-stack';
import { CloudfrontStack } from './cloudfront-stack';
import { AcmStack } from './acm-stack';
import { Route53Stack } from './route53-stack';
import { AlbStack } from './alb-stack';
import { EcrStack } from './ecr-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkSelflearnStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3 = new S3Stack(this);
    const ec2 = new EC2Stack(this);
    const route53 = new Route53Stack(this);
    const acm = new AcmStack(this, route53);
    const cloudfront = new CloudfrontStack(this, s3, acm);
    const targetCloudfrontRecord = Route53Stack.createCloudfrontTargetRecord(
      cloudfront.distribution
    );
    route53.addARecord(
      'cloudhosting.click',
      'cdk-alias-a-record-cloudfront',
      targetCloudfrontRecord
    );
    const ecrApi = new EcrStack(this, 'cdk-repository-api');
    const ecrFe = new EcrStack(this, 'cdk-repository-fe');
    const ecrAdmin = new EcrStack(this, 'cdk-repository-admin');
    const alb = new AlbStack(this, ec2);
    const ecs = new ECSStack(this, ec2, alb, ecrApi, ecrAdmin, ecrFe, s3);
    const targetAlbRecord = Route53Stack.createAlbTargetRecord(alb.alb);
    route53.addARecord('api.cloudhosting.click', 'alias-a-record-alb', targetAlbRecord);
  }
}
