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
    this.stackScope = scope;
    const logGroup = new logs.LogGroup(scope, 'cdk-route53-log-group');
    const zoneName = getEnv('ROUTE53_ZONE_NAME');
    console.log(zoneName);
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
  public addARecord(target: route53.IAliasRecordTarget) {
    new route53.ARecord(this.stackScope, 'cdk-alias-a-record-cloudfront', {
      zone: this.publicHostedZone,
      target: route53.RecordTarget.fromAlias(target)
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
