import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { S3SnsSqsLambdaChainStack } from './Services/sqs';
import { RDS } from './Services/DB/rds';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export  class CdkSelflearnStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here
    // Create a VPC
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-1',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'public-2',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 28,
          name: 'private-1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'private-2',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });

    const privateSubnetIds = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT });
    // // Create an ECS cluster
    // const cluster = new ecs.Cluster(this, 'MyCluster', {
    //   vpc: vpc
    // });

    // // Create an S3 bucket
    // const bucket = new s3.Bucket(this, 'MyBucket', {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY // Remove this line if you want to keep the bucket when the stack is deleted
    // });

    // // Grant read/write access to ECS tasks
    // const bucketReadWritePolicy = new iam.PolicyStatement({
    //   actions: ['s3:GetObject', 's3:PutObject'],
    //   resources: [bucket.bucketArn + '/*']
    // });

    // // Create an Application Load Balancer
    // const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
    //   vpc: vpc,
    //   internetFacing: true
    // });

    // // Add a listener to the load balancer
    // const listener = loadBalancer.addListener('Listener', {
    //   port: 80,
    
    //   // 'open: true' is the default, you can leave it out if you want. Set it
    //   // to 'false' and use `listener.connections` if you want to be selective
    //   // about who can access the load balancer.
    //   open: true,
    // });
    // listener.addAction('DefaultAction', {
    //   action: elbv2.ListenerAction.fixedResponse(404, {
    //     messageBody: 'Cannot route your request; no matching project found.',
    //   }),
    // });
    // // Define Fargate task definition for API
    // const apiTaskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
    //   memoryLimitMiB: 512,
    //   cpu: 256
    // });

    // const ApiContainer = apiTaskDefinition.addContainer('ApiContainer', {
    //   image: ecs.ContainerImage.fromRegistry('my-api-image'),
    //   logging: new ecs.AwsLogDriver({
    //     streamPrefix: 'ecs-api'
    //   }),
    //   portMappings: [{ containerPort: 80 }],
    //   environment: {
    //     BUCKET_NAME: bucket.bucketName
    //   }
    // });
    // apiTaskDefinition.addToExecutionRolePolicy(bucketReadWritePolicy); 
    
    // ApiContainer.addPortMappings({
    //   containerPort: 80,
    //   protocol: ecs.Protocol.TCP
    // });
    // // Define Fargate task definition for Admin
    // const adminTaskDefinition = new ecs.FargateTaskDefinition(this, 'AdminTaskDef', {
    //   memoryLimitMiB: 512,
    //   cpu: 256
    // });

    // const AdminContainer = adminTaskDefinition.addContainer('AdminContainer', {
    //   image: ecs.ContainerImage.fromRegistry('my-admin-image'),
    //   logging: new ecs.AwsLogDriver({
    //     streamPrefix: 'ecs-admin'
    //   }),
    //   portMappings: [{ containerPort: 80 }],
    //   environment: {
    //     BUCKET_NAME: bucket.bucketName
    //   }
    // });
    // adminTaskDefinition.addToExecutionRolePolicy(bucketReadWritePolicy);
    // AdminContainer.addPortMappings({
    //   containerPort: 80,
    //   protocol: ecs.Protocol.TCP
    // });
    // // Define Fargate task definition for Web
    // const webTaskDefinition = new ecs.FargateTaskDefinition(this, 'WebTaskDef', {
    //   memoryLimitMiB: 512,
    //   cpu: 256
    // });

    // const webContainer = webTaskDefinition.addContainer('WebContainer', {
    //   image: ecs.ContainerImage.fromRegistry('my-web-image'),
    //   logging: new ecs.AwsLogDriver({
    //     streamPrefix: 'ecs-web'
    //   }),
    //   portMappings: [{ containerPort: 80 }],
    //   environment: {
    //     BUCKET_NAME: bucket.bucketName
    //   }
    // });
    // webTaskDefinition.addToExecutionRolePolicy(bucketReadWritePolicy);
    // webContainer.addPortMappings({
    //   containerPort: 80,
    //   protocol: ecs.Protocol.TCP
    // });
    // // Create target groups for each service
    // const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiTargetGroup', {
    //   vpc: vpc,
    //   port: 80,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   targets: [],
    //   healthCheck: {
    //     path: '/api/health'
    //   }
    // });

    // const adminTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AdminTargetGroup', {
    //   vpc: vpc,
    //   port: 80,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   targets: [],
    //   healthCheck: {
    //     path: '/admin/health'
    //   }
    // });

    // const webTargetGroup = new elbv2.ApplicationTargetGroup(this, 'WebTargetGroup', {
    //   vpc: vpc,
    //   port: 80,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   targets: [],
    //   healthCheck: {
    //     path: '/'
    //   }
    // });

    // // Add target groups to the listener with path-based routing
    // listener.addTargetGroups('ApiTarget', {
    //   targetGroups: [apiTargetGroup],
    //   conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
    //   priority: 1
    // });

    // listener.addTargetGroups('AdminTarget', {
    //   targetGroups: [adminTargetGroup],
    //   conditions: [elbv2.ListenerCondition.pathPatterns(['/admin/*'])],
    //   priority: 2
    // });

    // listener.addTargetGroups('WebTarget', {
    //   targetGroups: [webTargetGroup],
    //   conditions: [elbv2.ListenerCondition.pathPatterns(['/*'])],
    //   priority: 3
    // });

    // // Create Fargate services and attach to the target groups
    // new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
    //   cluster: cluster,
    //   taskDefinition: apiTaskDefinition,
    //   publicLoadBalancer: true,
    //   listenerPort: 80,
    // });

    // new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'AdminService', {
    //   cluster: cluster,
    //   taskDefinition: adminTaskDefinition,
    //   publicLoadBalancer: true,
    //   listenerPort: 80
    // });

    // new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'WebService', {
    //   cluster: cluster,
    //   taskDefinition: webTaskDefinition,
    //   publicLoadBalancer: true,
    //   listenerPort: 80
    // });

    // new S3SnsSqsLambdaChainStack(this,'MyS3SnsLambda',{
    //     s3Bucket: bucket
    // });


    //Create RDS 
    new RDS(this, 'MyRDSStack', {
          env:{region:"us-east-1"}, description:"RDS Stack",
          vpcId:"vpc-aaaaaaaa",
          dbName:"sampledb",
          subnetIds: privateSubnetIds.subnetIds,
          vpc: vpc
    });
    
    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sortKey', type: dynamodb.AttributeType.STRING }, // Optional: Include if you need a sort key
      tableName: 'MyTable',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Use PAY_PER_REQUEST or PROVISIONED
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });
  }
}
