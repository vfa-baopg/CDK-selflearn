import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import getEnv from '../shared/getEnv';

export class EC2Stack {
  public readonly vpc: ec2.Vpc;
  constructor(scope: Construct) {
    const vpcName = getEnv('VPC_NAME');
    this.vpc = new ec2.Vpc(scope, 'cdk-vpc-learn', {
      vpcName,
      maxAzs: 2,
    })
  }
}
