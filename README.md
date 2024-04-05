# Overview

https://blog.toddaas.com/posts/ec2_warm_pools_are_useful_part_1/#you-guessed-it-more-automation

[![View on Construct Hub](https://constructs.dev/badge?package=%40pandanus-cloud%2Fcdk-autoscaling-warmpool)](https://constructs.dev/packages/@pandanus-cloud/cdk-autoscaling-warmpool)

# Install

## Typescript

    npm install @pandanus-cloud/cdk-autoscaling-warmpool

or

    yarn add @pandanus-cloud/cdk-autoscaling-warmpool

# Usage

    import { WarmPool } from '@pandanus-cloud/cdk-autoscaling-warmpool';
    import * as cdk from 'aws-cdk-lib';
    import * as as from 'aws-cdk-lib/aws-autoscaling';
    import * as ec2 from 'aws-cdk-lib/aws-ec2';
    import * as iam from 'aws-cdk-lib/aws-iam';

    const asgRole = new iam.Role(this, 'asgRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'asgRole',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonEC2RoleforSSM',
        ),
      ],
    });

    // Autoscaling Group (ASG)
    const asg = new as.AutoScalingGroup(this, 'asg', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      // The latest Amazon Linux image of a particular generation
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      ssmSessionPermissions: true,
      minCapacity: 3,
      maxCapacity: 6,
      desiredCapacity: 3,
      role: asgRole,
      healthCheck: as.HealthCheck.elb({
        grace: cdk.Duration.seconds(0),
      }),
      autoScalingGroupName: 'asg',
      defaultInstanceWarmup: cdk.Duration.seconds(0),
    });


    // Reference to the @pandanus-cloud/cdk-autoscaling-warmpool CDK Construct
    new WarmPool(this, 'warmPool', {
      asg: asg,
      state: 'STOPPED',
      maxPreparedCapacity: 1,
      minPoolSize: 1,
    });
