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
  readonly state?: 'RUNNING' | 'STOPPED' | 'HIBERNATED';
  readonly minPoolSize?: number;
  readonly maxPreparedCapacity?: number;
}

// Warmpool construct
export class WarmPool extends Construct {
  constructor(scope: Construct, id: string, props: WarmPoolProps) {
    super(scope, id);

    // Destructure assignment from WarmPoolProps - destructuring assignment syntax is a JavaScript expression that makes it possible to unpack values from arrays, or properties from objects, into distinct variables. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
    const { asg, state, minPoolSize, maxPreparedCapacity } = props;

    let asgWarmPoolState;
    switch (state) {
      case 'RUNNING':
        asgWarmPoolState = as.PoolState.RUNNING;
        break;
      case 'STOPPED':
        asgWarmPoolState = as.PoolState.STOPPED;
        break;
      case 'HIBERNATED':
        asgWarmPoolState = as.PoolState.HIBERNATED;
        break;
      default:
        asgWarmPoolState = as.PoolState.RUNNING;
        break;
    }

    // Create Warmpool on the ASG
    asg.addWarmPool({
      maxGroupPreparedCapacity: maxPreparedCapacity,
      minSize: minPoolSize,
      poolState: asgWarmPoolState,
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
        code: new lambda.InlineCode(`
        import json
        import boto3
        
        def handler(event, context):
            ## This Lambda function will be triggered on all events received by EventBridge for instances moving from the Warmed:Running, Warmed:Stopped or Warmed:Hibernated state of an ASG's Warmpool into service in the ASG.  This is required, since by design when using autoscaling groups with Warm pools an instance will need to call complete_lifecycle_action twice.  Once when the instance is launched Warm:Pending:Wait the initially bootstrapped and then a second time when there is Scale out so an Instance moves from a Warm pool Pending:Wait into the autoscaling group to be put InService. https://docs.aws.amazon.com/images/autoscaling/ec2/userguide/images/warm-pools-scale-out-event-diagram.png  The function of this Lambda is for the second complete_lifecycle_action API call to put Warm Pool instances automatically into InService.
            client = boto3.client('autoscaling')
            response = client.complete_lifecycle_action(LifecycleHookName=event['detail']['LifecycleHookName'],
            LifecycleActionToken=event['detail']['LifecycleActionToken'],
            AutoScalingGroupName=event['detail']['AutoScalingGroupName'],
            LifecycleActionResult='CONTINUE',
            InstanceId=event['detail']['EC2InstanceId'])
        `),
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
