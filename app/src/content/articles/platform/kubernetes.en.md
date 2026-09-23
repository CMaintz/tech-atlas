---
title: Kubernetes — how container orchestration works and where its risks lie
term: platform/kubernetes
lang: en
---

## What it is

**Kubernetes** (often shortened to **K8s**, for the eight letters between the K and the s) is an open-source system for running **containers** across a group of machines. It is the most widely used implementation of **container orchestration**: deciding where each container runs, restarting it when it fails, spreading load, rolling out new versions and connecting the pieces over the network.

Kubernetes grew out of Google's experience with Borg, an internal system that had run Google's services on huge clusters since the mid-2000s. Google engineers announced Kubernetes as an open-source project in June 2014, the year after Docker had made containers popular with developers. Version 1.0 was released in July 2015, and at the same time Google donated the project to the newly formed Cloud Native Computing Foundation (CNCF) under the Linux Foundation, where it is still developed by a large community. Within a few years it had beaten competing orchestrators, and today every major cloud provider offers a managed Kubernetes service. The name is Greek for "helmsman" — the one who steers the ship full of containers.

## How it works

### Desired state and the control loop

The central idea is **declarative configuration**. Instead of giving step-by-step commands ("start a container on server 3"), you describe the state you want in a file — "three copies of the web shop, version 2.4, reachable on port 443" — and submit it to the cluster. Kubernetes' **control plane** then works continuously to make reality match: if a copy dies, it starts a new one; if you change the version, it replaces the copies gradually. This constant comparison of desired and actual state is called a **control loop**, like a thermostat that keeps adjusting until the room has the set temperature.

### The main parts

| Part               | Role                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Cluster            | The whole set of machines managed together                                                       |
| Control plane      | The "brain": the API server, the scheduler, controllers and the etcd database holding all state  |
| Node               | A worker machine (virtual or physical) that runs workloads                                       |
| Pod                | The smallest unit Kubernetes places and runs: one or more containers sharing network and storage |
| Deployment         | Describes how many copies of a pod should run and how to update them                             |
| Service            | A stable network address in front of a changing set of pods                                      |
| Namespace          | A logical partition of the cluster, often per team or application                                |
| Secret / ConfigMap | Objects for handing configuration and credentials to pods                                        |

All changes go through the **API server**. Humans use the `kubectl` tool or a pipeline; controllers inside the cluster use the same API. That makes the API server the single most important thing to protect.

### Security building blocks

Kubernetes has strong security features, but many are optional or loosely configured by default:

- **Role-based access control (RBAC)** decides who and what may read or change which objects. Overly broad roles — "cluster-admin for everyone" — are common.
- **Network policies** limit which pods may talk to each other. Without them, every pod can typically reach every other pod.
- **Pod security standards** prevent containers from running as root, mounting the host's file system or gaining extra privileges.
- **Secrets** are only base64-encoded by default, not encrypted; encryption at rest and an external **secrets management** solution are separate choices.
- **Audit logs** record API calls, but must be turned on and collected.

NIST SP 800-190, the Application Container Security Guide, describes the main risk areas: images, registries, the orchestrator itself, the containers and the host operating system.

## What it means for an organisation and a coordinator

Most GRC people will never write a Kubernetes file, but they will meet Kubernetes in risk assessments, supplier reviews and audits. The useful questions are about ownership and configuration:

- **Who runs the control plane?** With a managed service from a cloud provider, the provider runs the control plane and the customer runs the workloads and most settings — the **shared responsibility model** applied to Kubernetes.
- **Who has admin rights, and how are they reviewed?** RBAC should follow least privilege, and access to production clusters should be logged and reviewed like any other privileged access.
- **Is the configuration in version control?** Because Kubernetes is declarative, the desired state can live in a repository (**GitOps**), giving change history and review for free.
- **Where do images come from?** Kubernetes runs whatever container images it is given, which makes it part of the **software supply chain**.

### A worked scenario

Oliver is a GRC student at a Danish online retailer. The operations team runs the web shop on a managed Kubernetes service and has asked for three copies of it; when one machine died one night, Kubernetes restarted the lost copy on another machine before anyone woke up — the example in the term's definition. Management is pleased with the availability, and Oliver's task is to check the security side for the upcoming ISO 27001 audit.

Using a short checklist based on NIST SP 800-190, he asks the team five questions and gets these answers: every developer has cluster-admin in production; there are no network policies; secrets are stored unencrypted in the cluster; audit logging is off; configuration is kept in Git with pull-request review. He records one strength (change management through Git) and four findings, and rates them with the team. Together they agree on a plan: read-only access for developers in production with an approved break-glass procedure, default-deny network policies for the payment service first, encryption of secrets at rest, and audit logs sent to the company's SIEM. Each item gets an owner and a date, and the audit trail shows the risks were identified and treated.

## Common misunderstandings

- **"Kubernetes is secure by default."** It has good security features, but many are off or permissive out of the box. Security depends on configuration.
- **"Containers are isolated like virtual machines."** Containers share the host's kernel. Isolation is weaker, which is why pod security settings matter.
- **"Kubernetes Secrets are encrypted."** By default they are only encoded. Encryption at rest must be enabled, and access to secrets restricted.
- **"A managed service means the provider handles security."** The provider secures the control plane; workloads, RBAC, network policies and images are the customer's.
- **"We need Kubernetes to be modern."** It is powerful but complex. For a few simple applications, a PaaS offering may give the same benefits with far less to secure.
