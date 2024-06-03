import * as cdk from 'aws-cdk-lib';
import * as r53resolver from 'aws-cdk-lib/aws-route53resolver';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';


export class Route53ResolverDnsFirewallStack {
    constructor(scope: Construct, vpc:  ec2.Vpc) {

        const logGroup = new logs.LogGroup(
            scope,
            'DNSFirewallLogGroup',
            {
                logGroupName: 'DNSQueryLogging',
                retention: logs.RetentionDays.ONE_WEEK,
            }
        );
        logGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        const dnsLoggingConfig = new r53resolver.CfnResolverQueryLoggingConfig(
          scope, 'DNSLogsConfig',
            {
                name: 'DNSCWLogsConfig',
                destinationArn: logGroup.logGroupArn,
            }
        );

        new r53resolver.CfnResolverQueryLoggingConfigAssociation(
          scope,
            'DNSLogAssoc',
            {
                resolverQueryLogConfigId: dnsLoggingConfig.ref,
                resourceId: vpc.vpcId,
            }
        );
        const allowedDomainList = new r53resolver.CfnFirewallDomainList(
          scope, 'AllowedDomainList',
            {
                name: 'AllowedFirewallDomainList',
                domains: ['*']
            }
        );

        const blockDomainList = new r53resolver.CfnFirewallDomainList(
          scope,
            'BlockedDomainList',
            {
                name: 'BlockDomainList',
                domains: ['test.example.com', 'test1.example.com']
            }
        );

        const ruleGroup = new r53resolver.CfnFirewallRuleGroup(
          scope,
            'DNSRuleGroup',
            {
                name: 'FirewallRuleGroup',
                firewallRules: [
                    {
                        priority: 10,
                        firewallDomainListId: blockDomainList.ref,
                        action: 'BLOCK',
                        blockResponse: 'NXDOMAIN',
                    },
                    {
                        priority: 20,
                        firewallDomainListId: allowedDomainList.ref,
                        action: 'ALLOW',
                    }

                ],
            }
        );

        const cfnFirewallRuleGroupAssociation = new r53resolver.CfnFirewallRuleGroupAssociation(scope, 'FirewallRuleGroupAssociation', {
            firewallRuleGroupId: ruleGroup.ref,
            priority: 101,
            vpcId: vpc.vpcId,
            mutationProtection: 'ENABLED'
        });
    }
}