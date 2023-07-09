---
title: Execute pg_dump against a remote database
tags: postgresql, ssh, tunnel, runbook
---


# Blog Post: How to Use `pg_dump` via SSH Tunnel to a Jump Host

In this blog post, we will discuss how to use `pg_dump` to perform a PostgreSQL database backup via an SSH tunnel to a jump host. Additionally, we will cover the steps required to open an SSH connection on the security group (assuming AWS) for this purpose. Let's get started!

## Prerequisites

Before proceeding, ensure that you have the following prerequisites:

- A PostgreSQL database server with the necessary permissions.
- An SSH client installed on your local machine.
- Access credentials (username and password) for the jump host and PostgreSQL server.
- Basic knowledge of the command line interface (CLI).

## Step 1: Open SSH Connection on the Security Group

To enable an SSH connection to the jump host, follow these steps:

1. Log in to the AWS Management Console and navigate to the EC2 service.
2. Select the relevant security group associated with the jump host instance.
3. Click on the "Inbound Rules" tab and then "Edit inbound rules."
4. Add a new rule with the following specifications:
   - Type: SSH
   - Protocol: TCP
   - Port Range: 22 (default)
   - Source: Your IP address or IP range that needs access
5. Save the changes and exit the security group settings.

## Step 2: Establish SSH Tunnel to the Jump Host

To create an SSH tunnel to the jump host, execute the following command in your local terminal:

```bash
ssh -L <local_port>:<postgres_host>:<postgres_port> <jump_host_username>@<jump_host_ip>
```

Replace the following placeholders with the actual values:

`<local_port>`: A local port number (e.g., 5432) to which the PostgreSQL connection will be forwarded.
`<postgres_host>`: The hostname or IP address of the PostgreSQL server.
`<postgres_port>`: The port number used by the PostgreSQL server (default: 5432).
`<jump_host_username>`: The username for the jump host.
`<jump_host_ip>`: The IP address or hostname of the jump host.

After executing the command, you will be prompted to enter the jump host's password. Provide the password and proceed to the next step.

## Step 3: Perform pg_dump on the PostgreSQL Database

Once the SSH tunnel is established, you can use pg_dump to back up the PostgreSQL database. Run the following command in a new terminal session:
