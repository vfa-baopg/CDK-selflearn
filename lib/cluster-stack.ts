import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';
import { S3Stack } from './s3-stack';
import { EC2Stack } from './ec2-stack';
import { ECS_RESOURCE_NAME } from '../constants/ecs';

export class ECSStack {
  public readonly cluster: ecs.Cluster;

  // Ecs service
  private readonly apiService: ecs_patterns.ApplicationLoadBalancedFargateService;
  private readonly adminService: ecs_patterns.ApplicationLoadBalancedFargateService;
  private readonly webService: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, ec2: EC2Stack, s3: S3Stack) {
    // Create an ECS cluster
    this.cluster = new ecs.Cluster(scope, 'cdk-cluster', {
      vpc: ec2.vpc,
    });

    this.apiService = this.initEcsService(scope, 'api', { BUCKET_NAME: s3.bucket.bucketName });
    this.adminService = this.initEcsService(scope, 'admin', { BUCKET_NAME: s3.bucket.bucketName });
    this.apiService = this.initEcsService(scope, 'web', { BUCKET_NAME: s3.bucket.bucketName });
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
      ECS_RESOURCE_NAME[resource].taskDefinition,
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );
    const container = taskDefinition.addContainer(ECS_RESOURCE_NAME[resource].container, {
      image: ecs.ContainerImage.fromRegistry(ECS_RESOURCE_NAME[resource].image),
      logging: new ecs.AwsLogDriver({
        streamPrefix: ECS_RESOURCE_NAME[resource].logging,
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
      ECS_RESOURCE_NAME[resource].service,
      {
        cluster: this.cluster,
        taskDefinition: taskDefinition,
        publicLoadBalancer: true,
        listenerPort: 80,
      }
    );
  }
}
