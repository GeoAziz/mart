# k3s Staging Cluster on AWS
# Multi-node cluster for pre-production testing

variable "enable_k3s_staging" {
  description = "Enable k3s staging cluster"
  type        = bool
  default     = false
}

variable "k3s_version" {
  description = "k3s version"
  type        = string
  default     = "v1.28.0"
}

variable "k3s_node_count" {
  description = "Number of k3s nodes"
  type        = number
  default     = 3
}

variable "k3s_instance_type" {
  description = "EC2 instance type for k3s nodes"
  type        = string
  default     = "t3.medium"
}

# Latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM role for k3s nodes
resource "aws_iam_role" "k3s_node_role" {
  count = var.enable_k3s_staging ? 1 : 0

  name = "k3s-${var.environment}-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "ZilaCart"
  }
}

# IAM instance profile
resource "aws_iam_instance_profile" "k3s_node_profile" {
  count = var.enable_k3s_staging ? 1 : 0
  name  = "k3s-${var.environment}-node-profile"
  role  = aws_iam_role.k3s_node_role[0].name
}

# Attach policies
resource "aws_iam_role_policy_attachment" "k3s_ssm" {
  count      = var.enable_k3s_staging ? 1 : 0
  role       = aws_iam_role.k3s_node_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "k3s_ec2_registry" {
  count      = var.enable_k3s_staging ? 1 : 0
  role       = aws_iam_role.k3s_node_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Security group for k3s
resource "aws_security_group" "k3s" {
  count = var.enable_k3s_staging ? 1 : 0

  name   = "k3s-${var.environment}"
  vpc_id = aws_vpc.main.id

  # Allow all traffic within k3s nodes
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
    description = "k3s internal traffic"
  }

  # Allow from ALB/ELB
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s_alb[0].id]
    description     = "HTTP from ALB"
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s_alb[0].id]
    description     = "HTTPS from ALB"
  }

  # Allow SSH for debugging
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
  }

  # Allow kubelet API
  ingress {
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Kubelet API"
  }

  # Allow etcd
  ingress {
    from_port   = 2379
    to_port     = 2380
    protocol    = "tcp"
    self        = true
    description = "etcd"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "k3s-${var.environment}"
  }
}

# ALB security group
resource "aws_security_group" "k3s_alb" {
  count = var.enable_k3s_staging ? 1 : 0

  name   = "k3s-alb-${var.environment}"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "k3s-alb-${var.environment}"
  }
}

# k3s master node
resource "aws_instance" "k3s_master" {
  count = var.enable_k3s_staging ? 1 : 0

  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.k3s_instance_type
  subnet_id              = aws_subnet.private[0].id
  iam_instance_profile   = aws_iam_instance_profile.k3s_node_profile[0].name
  vpc_security_group_ids = [aws_security_group.k3s[0].id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 50
    delete_on_termination = true
  }

  user_data = base64encode(templatefile("${path.module}/k3s-master-init.sh", {
    k3s_version = var.k3s_version
    environment = var.environment
  }))

  tags = {
    Name        = "k3s-${var.environment}-master"
    Environment = var.environment
    Role        = "master"
  }

  depends_on = [aws_internet_gateway.main]
}

# k3s worker nodes
resource "aws_instance" "k3s_worker" {
  count = var.enable_k3s_staging ? var.k3s_node_count - 1 : 0

  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.k3s_instance_type
  subnet_id              = aws_subnet.private[count.index % 2].id
  iam_instance_profile   = aws_iam_instance_profile.k3s_node_profile[0].name
  vpc_security_group_ids = [aws_security_group.k3s[0].id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 50
    delete_on_termination = true
  }

  user_data = base64encode(templatefile("${path.module}/k3s-worker-init.sh", {
    k3s_version      = var.k3s_version
    master_ip        = aws_instance.k3s_master[0].private_ip
    environment      = var.environment
    node_index       = count.index + 1
  }))

  tags = {
    Name        = "k3s-${var.environment}-worker-${count.index + 1}"
    Environment = var.environment
    Role        = "worker"
  }

  depends_on = [aws_instance.k3s_master]
}

# ALB for k3s
resource "aws_lb" "k3s" {
  count = var.enable_k3s_staging ? 1 : 0

  name               = "k3s-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.k3s_alb[0].id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "k3s-${var.environment}"
  }
}

# Target group
resource "aws_lb_target_group" "k3s" {
  count = var.enable_k3s_staging ? 1 : 0

  name        = "k3s-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200-399"
  }

  tags = {
    Name = "k3s-${var.environment}"
  }
}

# Register nodes with target group
resource "aws_lb_target_group_attachment" "k3s_master" {
  count = var.enable_k3s_staging ? 1 : 0

  target_group_arn = aws_lb_target_group.k3s[0].arn
  target_id        = aws_instance.k3s_master[0].id
  port             = 80
}

resource "aws_lb_target_group_attachment" "k3s_worker" {
  count = var.enable_k3s_staging ? var.k3s_node_count - 1 : 0

  target_group_arn = aws_lb_target_group.k3s[0].arn
  target_id        = aws_instance.k3s_worker[count.index].id
  port             = 80
}

# ALB listener
resource "aws_lb_listener" "k3s" {
  count = var.enable_k3s_staging ? 1 : 0

  load_balancer_arn = aws_lb.k3s[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.k3s[0].arn
  }
}

# Outputs
output "k3s_master_public_ip" {
  description = "k3s master public IP"
  value       = var.enable_k3s_staging ? aws_instance.k3s_master[0].public_ip : null
}

output "k3s_master_private_ip" {
  description = "k3s master private IP"
  value       = var.enable_k3s_staging ? aws_instance.k3s_master[0].private_ip : null
}

output "k3s_alb_endpoint" {
  description = "k3s ALB endpoint"
  value       = var.enable_k3s_staging ? aws_lb.k3s[0].dns_name : null
}

output "k3s_kubeconfig_command" {
  description = "Command to get kubeconfig"
  value = var.enable_k3s_staging ? format(
    "scp -i ~/.ssh/id_rsa ubuntu@%s:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-staging-config",
    aws_instance.k3s_master[0].public_ip
  ) : null
}
