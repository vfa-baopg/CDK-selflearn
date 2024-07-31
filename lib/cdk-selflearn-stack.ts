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
import { ECS_RESOURCE_NAME } from './env/config'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import {  rdsStack } from './Services/DB/rds-stack';
import { IpAddresses, Subnet, SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { lambdaAPIStack } from './Services/Lambda/lambda-api-stack';
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
    route53.addARecord(targetCloudfrontRecord,'CloudfrontARecord');
    route53.addAaaaRecord(targetCloudfrontRecord,'CloudfrontAAAARecord');
    const alb = new AlbStack(this, ec2);
    const ecs = new ECSStack(this, {ec2, alb,s3});
    const targetAlbRecord = Route53Stack.createAlbTargetRecord(
      alb.alb
    );
    route53.addARecord(targetAlbRecord,'AlbARecord');
    route53.addAaaaRecord(targetAlbRecord,'AlbAAAARecord');

    //Init RDS
    // const rds = new rdsStack(this, 'customRDS',{
    //     ec2: ec2
    // });


    // Init Lambda
    // 1. Lambda with API Gateway
    const lambdaApi = new lambdaAPIStack(this, 'lambda-API-Gateway',{
      functionName: "Lambda-with-APIGateway",
      s3Stack: s3
    })

    // 2. Lambda 

  }
}
