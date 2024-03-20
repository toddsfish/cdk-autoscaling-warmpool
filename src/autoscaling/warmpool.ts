import { readFileSync } from 'fs';
import * as cdk from 'aws-cdk-lib';
import * as as from 'aws-cdk-lib/aws-autoscaling';
import * as cwe from 'aws-cdk-lib/aws-events';
import * as cwetargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

// Warmpool Construct requires an Autoscaling group object passed to it
export interface WarmPoolProps extends cdk.StackProps {
  readonly asg: as.AutoScalingGroup;
}

// Warmpool construct
export class WarmPool extends Construct {
  constructor(scope: Construct, id: string, props: WarmPoolProps) {
    super(scope, id);

    const { asg } = props;

    // Create Warmpool on ASG
    asg.addWarmPool({
      maxGroupPreparedCapacity: 1,
      minSize: 1,
      poolState: as.PoolState.STOPPED,
    });

    //Create IAM policy to allow Lambda to call CompleteLifecycleAction on ASG
    const warmPoolLCHookIamPolicy = new iam.Policy(
      this,
      'warmPoolLCHookIamPolicy',
      {
        policyName: 'warmPoolLCHookIamPolicy',
        statements: [
          new iam.PolicyStatement({
            actions: ['autoscaling:CompleteLifecycleAction'],
            resources: [asg.autoScalingGroupArn],
          }),
        ],
      },
    );

    // Eventbridge Rule and Lambda function to handle Lifecycle hook when an instance is moving from a Warm Pool to In-Service
    const asgCwEventRuleLambdaRole = new iam.Role(
      this,
      'asgCwEventRuleLambdaRole',
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        roleName: 'asgCwEventRuleLambdaRole',
      },
    );

    // Attach the LC policy to Lambda role
    asgCwEventRuleLambdaRole.attachInlinePolicy(warmPoolLCHookIamPolicy);

    const asgCwEventRuleLambda = new lambda.Function(
      this,
      'asgCwEventRuleLambda',
      {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: 'index.handler',
        code: new lambda.InlineCode(
          readFileSync('./lib/LifeCycleActionLambda.py', 'utf8'),
        ),
        role: asgCwEventRuleLambdaRole,
      },
    );

    // CW Event rule filtering for events with source aws.autoscaling and origin of as a WarmPool
    const asgCwEventRule = new cwe.Rule(this, 'asgCwEventRule', {
      description:
        'CW Event Rule use to transition a warmed pool instance to In-Service',
      enabled: true,
      eventPattern: {
        source: ['aws.autoscaling'],
        detailType: ['EC2 Instance-launch Lifecycle Action'],
        detail: {
          Origin: ['WarmPool'],
          Destination: ['AutoScalingGroup'],
        },
      },
    });

    // Add the Lambda Target for the CWE rule
    asgCwEventRule.addTarget(
      new cwetargets.LambdaFunction(asgCwEventRuleLambda),
    );
  }
}
