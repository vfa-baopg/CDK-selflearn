import { Construct } from 'constructs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { EC2Stack } from './ec2-stack';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import getEnv from '../shared/getEnv';

export class AlbStack {
  private readonly scope: Construct;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  private readonly ec2: EC2Stack;
  private readonly listener: elbv2.ApplicationListener;

  constructor(scope: Construct, ec2: EC2Stack) {
    const albName = getEnv('ALB_NAME');
    this.scope = scope;
    this.ec2 = ec2;
    this.alb = new elbv2.ApplicationLoadBalancer(scope, 'cdk-alb', {
      vpc: ec2.vpc,
      loadBalancerName: albName,
      internetFacing: true,
      vpcSubnets: ec2.vpc.selectSubnets({
        subnetType: SubnetType.PUBLIC,
        onePerAz: true,
      }),
    });
    // Create listener to listen request from internet
    this.listener = this.alb.addListener('cdk-alb-listener', {
      port: 80,
      // 'open: true' is the default, you can leave it out if you want. Set it
      // to 'false' and use `listener.connections` if you want to be selective
      // about who can access the load balancer.
      open: true,
    });
    // Add 404 response action
    this.listener.addAction('DefaultAction', {
      action: elbv2.ListenerAction.fixedResponse(404, {
        messageBody: 'Cannot route your request; no matching project found.',
      }),
    });
  }

  createTargetGroup(
    id: string,
    port: number,
    protocol: elbv2.ApplicationProtocol,
    healthCheck: elbv2.HealthCheck,
    targets?: elbv2.IApplicationLoadBalancerTarget[]
  ) {
    return new elbv2.ApplicationTargetGroup(this.scope, id, {
      vpc: this.ec2.vpc,
      port,
      targets,
      healthCheck,
      protocol,
    });
  }

  addTargetGroup(
    id: string,
    targetGroup: elbv2.IApplicationTargetGroup,
    priority: number,
    condition?: elbv2.ListenerCondition
  ) {
    this.listener.addTargetGroups(id, {
      targetGroups: [targetGroup],
      conditions: condition ? [condition] : undefined,
      priority,
    });
  }

  createListenerConditionPathPatterns(values: string[]) {
    return elbv2.ListenerCondition.pathPatterns([...values]);
  }
}
