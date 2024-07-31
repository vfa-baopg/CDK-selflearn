import { StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EC2Stack } from '../../ec2-stack';
import * as cdk from 'aws-cdk-lib';
  export interface rdsProps extends StackProps {
    ec2: EC2Stack;
  }
  
  export class rdsStack extends Construct {
    private readonly ec2: EC2Stack;

    protected readonly rdsInstance: rds.DatabaseInstance;
    constructor(scope: Construct, id: string, props: rdsProps) {
      super(scope, id);
      this.ec2 = props.ec2;
      // Create a Secrets Manager secret for the RDS instance credentials
      const rdsCredentials =new secretsmanager.Secret(scope, 'DBCredentialsSecret', {
        secretName: 'mysqlCredentials',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'devadmin',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      });

      // Create an RDS instance
      this.rdsInstance = new rds.DatabaseInstance(this, 'MyRdsInstance', {
        instanceIdentifier: 'DevDeployInstance',
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_14_10 }),
        vpc: this.ec2.vpc,
        credentials: rds.Credentials.fromSecret(rdsCredentials),
        databaseName: 'myUnqueDbName',
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
        allocatedStorage: 20, // GB
        maxAllocatedStorage: 100, // GB
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        publiclyAccessible: true, // Set to false if you don't want public access
        multiAz: false,
        autoMinorVersionUpgrade: true,
        backupRetention: cdk.Duration.days(7),
      });
    }
  }
  