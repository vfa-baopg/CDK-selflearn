import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AlbStack } from './alb-stack';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ECSStack {
  public readonly cluster: ecs.Cluster;

  private readonly ECS_RESOURCE_NAME = {
    api: {
      service: {
        id: 'cdk-api-service',
      },
      taskDefinition: {
        id: 'cdk-api-task-definition',
        container: {
          id: 'cdk-api-container',
          image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-api-image',
          port: 3000,
          protocol: ApplicationProtocol.HTTP,
          log: 'cdk-api-log-group',
        },
      },
      targetGroup: {
        id: 'cdk-api-target-group',
        healthcheckPath: '/api/health',
        pathPatterns: '/api/*',
        priority: 1,
      },
    },
    admin: {
      service: {
        id: 'cdk-admin-service',
      },
      taskDefinition: {
        id: 'cdk-admin-task-definition',
        container: {
          id: 'cdk-admin-container',
          image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-admin-image',
          port: 8081,
          protocol: ApplicationProtocol.HTTP,
          log: 'cdk-admin-log-group',
        },
      },
      targetGroup: {
        id: 'cdk-admin-target-group',
        healthcheckPath: '/admin/health',
        pathPatterns: '/admin/*',
        priority: 2,
      },
    },
    web: {
      service: {
        id: 'cdk-web-service',
      },
      taskDefinition: {
        id: 'cdk-web-task-definition',
        container: {
          id: 'cdk-web-container',
          image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-web-image',
          port: 80,
          protocol: ApplicationProtocol.HTTP,
          log: 'cdk-web-log-group',
        },
      },
      targetGroup: {
        id: 'cdk-web-target-group',
        healthcheckPath: '/web/health',
        pathPatterns: '/*',
        priority: 3,
      },
    },
  };

  private readonly apiService: ecs.FargateService;
  private readonly adminService: ecs.FargateService;
  private readonly webService: ecs.FargateService;
  private readonly ec2: EC2Stack;
  private readonly alb: AlbStack;

  constructor(scope: Construct, ec2: EC2Stack, s3: S3Stack, alb: AlbStack) {
    this.ec2 = ec2;
    this.alb = alb;

    // Create an ECS cluster
    this.cluster = new ecs.Cluster(scope, 'cdk-cluster', {
      vpc: this.ec2.vpc,
    });
    const taskExecutionRole = new iam.Role(scope, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
      ],
    });
    // Initialize ECS services
    this.apiService = this.initEcsService(scope,taskExecutionRole, 'api', { BUCKET_NAME: s3.bucket.bucketName });
    this.adminService = this.initEcsService(scope,taskExecutionRole, 'admin', { BUCKET_NAME: s3.bucket.bucketName });
    this.webService = this.initEcsService(scope,taskExecutionRole, 'web', { BUCKET_NAME: s3.bucket.bucketName });
  }

  /**
   * Initialize ECS service
   * @param scope stack scope
   * @param resource ECS resource (api, admin, web)
   * @param containerEnv environment variables for container
   */
  private initEcsService(
    scope: Construct,
    taskExecutionRole: iam.Role,
    resource: 'api' | 'web' | 'admin',
    containerEnv?: Record<string, string>
  ) {

    const resourceName = this.ECS_RESOURCE_NAME[resource];
    // Define Fargate task definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      scope,
      resourceName.taskDefinition.id,
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: taskExecutionRole,
      },
    );

    // Add container to task definition
    const container = taskDefinition.addContainer(
      resourceName.taskDefinition.container.id,
      {
        image: ecs.ContainerImage.fromRegistry(resourceName.taskDefinition.container.image),
        logging: new ecs.AwsLogDriver({
          streamPrefix: resourceName.taskDefinition.container.log,
        }),
        environment: containerEnv,
      }
    );

    // Update port mapping for the service
    container.addPortMappings({
      containerPort: resourceName.taskDefinition.container.port,
      protocol: ecs.Protocol.TCP,
    });

    // Create Fargate service and attach to the target group
    const fargateService = new ecs.FargateService(scope, resourceName.service.id, {
      cluster: this.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 2,
      vpcSubnets: this.ec2.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        onePerAz: true,
      }),
    });

    // Create target group and listener condition
    const targetGroup = this.alb.createTargetGroup(
      resourceName.targetGroup.id,
      resourceName.taskDefinition.container.port,
      resourceName.taskDefinition.container.protocol,
      {
        path: resourceName.targetGroup.healthcheckPath,
      },
      [fargateService]
    );

    const listenerCondition = this.alb.createListenerConditionPathPatterns([
      resourceName.targetGroup.pathPatterns,
    ]);

    // Add target group to ALB
    this.alb.addTargetGroup(
      resourceName.targetGroup.id,
      targetGroup,
      resourceName.targetGroup.priority,
      listenerCondition
    );

    return fargateService;
  }
}
