
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface CodepipelineStackProps extends StackProps {
  s3Bucket?: s3.Bucket,
  ecrRepo?: ecr.Repository,
  service?: ecs.FargateService
}

export class CodepipelineBuildDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CodepipelineStackProps) {
    super(scope, id, props);
    // Create S3 bucket if not provided
    if (props.s3Bucket == undefined) {
      props.s3Bucket = new s3.Bucket(this, 'SourceBucket', {
        versioned: true, // Enable versioning for the bucket
      });
    }

    // Create an ECR repository if not Provided
    if (props.ecrRepo == undefined){
      props.ecrRepo = new ecr.Repository(this, 'EcrRepository');
    }
   
    //Create ECS Service
    if (props.service == undefined){
      // Create ECS cluster
      const cluster = new ecs.Cluster(this, 'EcsCluster', {
        vpc: new ec2.Vpc(this, 'Vpc', { maxAzs: 3 }) // Default is all AZs in the region
      });

      // Create ECS task definition
      const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');
      const container = taskDefinition.addContainer('web', {
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
        memoryLimitMiB: 512,
        cpu: 256,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs' }),
      });
      container.addPortMappings({
        containerPort: 80,
      });

      // Create ECS service
      props.service = new ecs.FargateService(this, 'Service', {
        cluster,
        taskDefinition,
        desiredCount: 1,
      });                           
    }


    // Create CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: "dev",
    });
    // Add S3 event as source action
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.S3SourceAction({
      actionName: 'Source_Stage',
      bucket: props.s3Bucket,
      bucketKey: 'src.zip', // Specify the path to the artifact within the bucket
      output: sourceOutput, // Artifact where the source code will be stored
      trigger: codepipelineActions.S3Trigger.EVENTS, // Trigger the pipeline on S3 events
    });

    // Add the source action to the pipeline
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Add Approve stage
    const approveAction = new codepipelineActions.ManualApprovalAction({
      actionName: 'Manual_Approval',
      // notifyEmails: ['your.email@example.com'], // Notify this email when manual approval is required
    });

    pipeline.addStage({
      stageName: 'Approve',
      actions: [approveAction],
    });

    // Define build project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true, // Required to build Docker images
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws --version',
              '$(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)',
              'REPOSITORY_URI=$REPOSITORY_URI',
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'echo Building the Docker image...',
              'docker build -t $REPOSITORY_URI:latest .',
              'docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker images...',
              'docker push $REPOSITORY_URI:latest',
              'docker push $REPOSITORY_URI:$IMAGE_TAG',
              'printf \'[{"name":"web","imageUri":"%s"}]\' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: 'imagedefinitions.json',
        },
      }),
      environmentVariables: {
        'REPOSITORY_URI': {
          value: props.ecrRepo.repositoryUri,
        },
      },
    });

    // Define build action
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput], // Define output artifacts
    });

    // Add build stage to the pipeline
    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    // Define deploy action (example deployment to ECS)
    const deployAction = new codepipelineActions.EcsDeployAction({
      actionName: 'DeployAction',
      service: props.service,
      input: buildOutput,
    });

    // Add deploy stage to the pipeline
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });

    // Grant pipeline role necessary permissions
    props.s3Bucket.grantReadWrite(pipeline.role);
    props.ecrRepo.grantPullPush(buildProject.role!);
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage', 'ecr:CompleteLayerUpload', 'ecr:UploadLayerPart', 'ecr:InitiateLayerUpload'],
      resources: [`${props.ecrRepo.repositoryArn}`],
    }));
  }
}