import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';
import { ECSStack } from './cluster-stack';
import { CloudfrontStack } from './cloudfront-stack';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { S3SnsSqsLambdaChainStack } from './Services/sqs';
import { RDS } from './Services/DB/rds';
import { IpAddresses, Subnet, SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export  class CdkSelflearnStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3 = new S3Stack(this);
    const ec2 = new EC2Stack(this);
    const ecs = new ECSStack(this, ec2, s3);
    const cloudfront = new CloudfrontStack(this, s3);
    
    // Config Subnet 
    const subnetConfigs = [
      { cidr: '10.0.1.0/24',  az: 'us-east-1a', name: 'public-A', SubnetType: cdk.aws_ec2.SubnetType.PUBLIC },
      { cidr: '10.0.2.0/24',  az: 'us-east-1b', name: 'public-B', SubnetType: cdk.aws_ec2.SubnetType.PUBLIC },
      { cidr: '10.0.3.0/24',  az: 'us-east-1a', name: 'private-A', SubnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
      { cidr: '10.0.4.0/24',  az: 'us-east-1b', name: 'private-B', SubnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS }
    ];
    subnetConfigs.forEach(config => {
      const subnet = new Subnet(this, config.name, {
        vpcId: ec2.vpc.vpcId,
        availabilityZone: config.az,
        cidrBlock: config.cidr,
        mapPublicIpOnLaunch: false // Set to true if you want a public subnet
      });

      // Optionally, tag the subnet
      cdk.Tags.of(subnet).add('Name', config.name);
    });

    const privateSubnetIds = ec2.vpc.selectSubnets({ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT });

     //Create RDS 
    const rds = new RDS(this, 'MyRDSStack', {
      env:{region:"us-east-1"}, description:"RDS Stack",
      vpcId:"vpc-aaaaaaaa",
      dbName:"sampledb",
      subnetIds: privateSubnetIds.subnetIds,
      vpc: ec2.vpc
    });

    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sortKey', type: dynamodb.AttributeType.STRING }, // Optional: Include if you need a sort key
      tableName: 'MyTable',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Use PAY_PER_REQUEST or PROVISIONED
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });


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
