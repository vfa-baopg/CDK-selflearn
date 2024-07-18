import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StackProps } from 'aws-cdk-lib';
import { S3Stack } from '../s3-stack';
import { EC2Stack } from '../ec2-stack';
import { ECSStack } from '../cluster-stack';

export interface CodepipelineStackProps extends StackProps {
  s3Stack?: S3Stack;
  ec2?: EC2Stack;
  ecrRepo?: ecr.Repository;
  service?: ECSStack;
  resource?: ('api' | 'web' | 'admin');
}

export class CodepipelineBuildDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CodepipelineStackProps) {
    super(scope, id, props);

    // Ensure props.resource is defined and not empty
    const resource = props.resource ?? 'web';

    // Create S3 bucket if not provided
    if (props.s3Stack == undefined) {
      props.s3Stack = new S3Stack(this);
    }

    // Create an ECR repository if not provided
    if (props.ecrRepo == undefined) {
      props.ecrRepo = new ecr.Repository(this, 'EcrRepository');
    }

    // Create EC2 stack if not provided
    if (props.ec2 == undefined) {
      props.ec2 = new EC2Stack(this);
    }

    // Create ECS service if not provided
    if (props.service == undefined) {
      props.service = new ECSStack(this, props.ec2, props.s3Stack);
    }

    // Create CodePipeline
    const pipeline = new codepipeline.Pipeline(this, `${resource}-Pipeline`, {
      pipelineName: `${resource}-dev`,
    });

    // Add source action (S3 event)
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.S3SourceAction({
      actionName: 'Source',
      bucket: props.s3Stack.bucket,
      bucketKey: `${resource}/src.zip`,
      output: sourceOutput,
      trigger: codepipelineActions.S3Trigger.EVENTS,
    });

    // Add source action to the pipeline
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Add Manual Approval stage
    const approveAction = new codepipelineActions.ManualApprovalAction({
      actionName: 'ManualApproval',
    });

    pipeline.addStage({
      stageName: 'Approve',
      actions: [approveAction],
    });

    // Define build project
    const buildProject = new codebuild.PipelineProject(this, `${resource}BuildProject`, {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
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
              `printf '[{"name":"${resource}","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json`,
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
      actionName: `${resource}Build`,
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // Add build stage to the pipeline
    pipeline.addStage({
      stageName: `${resource}Build`,
      actions: [buildAction],
    });

    // Define the service variable based on resource
    let service;
    switch(resource) {
      case 'api':
        service = props.service?.apiService;
        break;
      case 'web':
        service = props.service?.webService;
        break;
      case 'admin':
        service = props.service?.adminService;
        break;
      default:
        throw new Error(`Unsupported resource: ${resource}`);
    }
    // Define deploy action (example deployment to ECS)
    const deployAction = new codepipelineActions.EcsDeployAction({
      actionName: `${resource}DeployAction`,
      service: service.service, // ECS service name determined dynamically
      input: buildOutput, // Assuming buildOutput is your pipeline's build output artifact
    });

    // Add deploy stage to the pipeline
    pipeline.addStage({
      stageName: `${resource}Deploy`,
      actions: [deployAction],
    });

    // Grant pipeline role necessary permissions
    props.ecrRepo.grantPullPush(buildProject.role!);
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:CompleteLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:InitiateLayerUpload',
      ],
      resources: [props.ecrRepo.repositoryArn],
    }));
  
    // Grant S3 bucket permissions
    props.s3Stack.bucket.grantReadWrite(pipeline.role);
  }
}