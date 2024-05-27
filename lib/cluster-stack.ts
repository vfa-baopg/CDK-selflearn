import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';

export class ECSStack {
  public readonly cluster: ecs.Cluster;

  private readonly ECS_RESOURCE_NAME = {
    api: {
      taskDefinition: "api-task-definition",
      container: "api-container",
      service: "api-service",
      image: "cdk-api-image",
      logging: "ecs-api",
    },
    admin: {
      taskDefinition: "admin-task-definition",
      container: "admin-container",
      service: "admin-service",
      image: "cdk-admin-image",
      logging: "ecs-admin",
    },
    web: {
      taskDefinition: "web-task-definition",
      container: "web-container",
      service: "web-service",
      image: "cdk-web-image",
      logging: "ecs-web",
    }
  }

  // Ecs service
  private readonly apiService: ecs_patterns.ApplicationLoadBalancedFargateService;
  private readonly adminService: ecs_patterns.ApplicationLoadBalancedFargateService;
  private readonly webService: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, ec2: EC2Stack, s3: S3Stack) {
    // Create an ECS cluster
    this.cluster = new ecs.Cluster(scope, 'cdk-cluster', {
      vpc: ec2.vpc
    });

    this.apiService = this.initEcsService(scope, 'api', { BUCKET_NAME: s3.bucket.bucketName })
    this.adminService = this.initEcsService(scope, 'admin', { BUCKET_NAME: s3.bucket.bucketName })
    this.apiService = this.initEcsService(scope, 'web', { BUCKET_NAME: s3.bucket.bucketName })
  }

  
  
  /**
   * Init resource for ecs service running
   * @param scope stack scope
   * @param resource ecs resource initial
   * @param containerEnv ecs container env
   */
  private initEcsService(
    scope: Construct,
    resource: 'api' | 'web' | 'admin',
    containerEnv?: Record<string, string>
  ) {
    // Define Fargate task definition for API
    const taskDefinition = new ecs.FargateTaskDefinition(
      scope,
      this.ECS_RESOURCE_NAME[resource].taskDefinition,
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );
    const container = taskDefinition.addContainer(this.ECS_RESOURCE_NAME[resource].container, {
      image: ecs.ContainerImage.fromRegistry(this.ECS_RESOURCE_NAME[resource].image),
      logging: new ecs.AwsLogDriver({
        streamPrefix: this.ECS_RESOURCE_NAME[resource].logging,
      }),
      portMappings: [{ containerPort: 80 }],
      environment: containerEnv,
    });
    // taskDefinition.addToExecutionRolePolicy(s3.bucketPolicy);
    container.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP,
    });
    // Create Fargate services and attach to the target groups
    return new ecs_patterns.ApplicationLoadBalancedFargateService(
      scope,
      this.ECS_RESOURCE_NAME[resource].service,
      {
        cluster: this.cluster,
        taskDefinition: taskDefinition,
        publicLoadBalancer: true,
        listenerPort: 80,
      }
    );
  }
}
