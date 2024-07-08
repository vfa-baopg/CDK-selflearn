import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';
import { ECSStack } from './cluster-stack';
import { CloudfrontStack } from './cloudfront-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkSelflearnStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3 = new S3Stack(this);
    const ec2 = new EC2Stack(this);
    const ecs = new ECSStack(this, ec2, s3);
    const cloudfront = new CloudfrontStack(this, s3);

    // Create an Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: ec2.vpc,
      internetFacing: true
    });

    // Add a listener to the load balancer
    const listener = loadBalancer.addListener('Listener', {
      port: 80,
    
      // 'open: true' is the default, you can leave it out if you want. Set it
      // to 'false' and use `listener.connections` if you want to be selective
      // about who can access the load balancer.
      open: true,
    });
    listener.addAction('DefaultAction', {
      action: elbv2.ListenerAction.fixedResponse(404, {
        messageBody: 'Cannot route your request; no matching project found.',
      }),
    });
    // Create target groups for each service
    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTargetGroup', {
      vpc: ec2.vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [],
      healthCheck: {
        path: '/api/health'
      }
    });

    const adminTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AdminTargetGroup', {
      vpc: ec2.vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [],
      healthCheck: {
        path: '/admin/health'
      }
    });

    const webTargetGroup = new elbv2.ApplicationTargetGroup(this, 'WebTargetGroup', {
      vpc: ec2.vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [],
      healthCheck: {
        path: '/'
      }
    });

    // Add target groups to the listener with path-based routing
    listener.addTargetGroups('ApiTarget', {
      targetGroups: [apiTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      priority: 1
    });

    listener.addTargetGroups('AdminTarget', {
      targetGroups: [adminTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/admin/*'])],
      priority: 2
    });

    listener.addTargetGroups('WebTarget', {
      targetGroups: [webTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/*'])],
      priority: 3
    });
  }
}
// const app = new cdk.App();

// const infra = new CdkSelflearnStack(app,'CDKInfra');
// const splitAtListenerLBStack = new SplitAtListener_LoadBalancerStack(app, 'SplitAtListener-LBStack', {
//   vpc: infra.vpc,
// });
// new SplitAtListener_ServiceStack(app, 'SplitAtListener-ServiceStack', {
//   cluster: infra.cluster,
//   vpc: infra.vpc,
//   loadBalancer: splitAtListenerLBStack.loadBalancer,
//   containerName: "web"
// });


// const splitAtTargetGroupLBStack = new SplitAtTargetGroup_LoadBalancerStack(app, 'SplitAtTargetGroup-LBStack', {
//   vpc: infra.vpc,
// });
// new SplitAtTargetGroup_ServiceStack(app, 'SplitAtTargetGroup-ServiceStack', {
//   cluster: infra.cluster,
//   vpc: infra.vpc,
//   targetGroup: splitAtTargetGroupLBStack.targetGroup
// });
// app.synth();