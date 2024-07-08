import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as logs from 'aws-cdk-lib/aws-logs';
import getEnv from '../shared/getEnv';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { ILoadBalancerV2 } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class Route53Stack {
  private readonly stackScope: Construct;
  public readonly publicHostedZone: route53.PublicHostedZone;

  constructor(scope: Construct) {
    const logGroup = new logs.LogGroup(scope, 'cdk-route53-log-group');
    const logGroupPolicy = new logs.CfnResourcePolicy(scope, 'LogGroupResourcePolicy', {
      policyName: 'Route53QueryLoggingPolicy',
      policyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'route53.amazonaws.com',
            },
            Action:  [
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:PutLogEventsBatch",
            ],
            Resource: logGroup.logGroupArn,
          },
          {
            Effect: 'Allow',
            Principal: {
              Service: 'route53.amazonaws.com',
            },
            Action: 'logs:CreateLogStream',
            Resource: `${logGroup.logGroupArn}:log-stream:*`,
          },
        ],
      }),
    });
    logGroupPolicy.node.addDependency(logGroup);
    this.stackScope = scope;
    const zoneName = getEnv('ROUTE53_ZONE_NAME');
    if (!zoneName) return;
    this.publicHostedZone = new route53.PublicHostedZone(scope, 'cdk-route53-public-hosted-zone', {
      zoneName,
      queryLogsLogGroupArn: logGroup.logGroupArn,
    });
  }

  /**
   * Add A record target to route 53
   * @param target Record target
   */
  public addARecord(recordName: string, id: string, target: route53.IAliasRecordTarget) {
    new route53.ARecord(this.stackScope, id, {
      zone: this.publicHostedZone,
      target: route53.RecordTarget.fromAlias(target),
      recordName,
    })
  }

  public addAaaaRecord(target: route53.IAliasRecordTarget) {
    new route53.AaaaRecord(this.stackScope, 'cdk-alias-aaaa-record-cloudfront', {
      zone: this.publicHostedZone,
      target: route53.RecordTarget.fromAlias(target)
    })
  }

  public static createCloudfrontTargetRecord(distribution: cloudfront.Distribution) {
    return new targets.CloudFrontTarget(distribution)
  }

  public static createAlbTargetRecord(loadbalancer: ILoadBalancerV2) {
    return new targets.LoadBalancerTarget(loadbalancer);
  }
}
