/**
 * Job Role Configurations
 * Defines job role profiles with tool recommendations and skill areas
 */

import type { JobRole, JobRoleConfig } from '../types/job-role-types';
import { JOB_ROLE_META } from '../types/job-role-types';

/**
 * Default job role configurations
 * Contains predefined configurations for all supported job roles
 */
export const DEFAULT_JOB_ROLE_CONFIGS: JobRoleConfig[] = [
  // Infrastructure Engineers
  {
    id: 'cloud-infrastructure-architect',
    name: JOB_ROLE_META['cloud-infrastructure-architect'].label,
    description: 'Designs and implements cloud infrastructure solutions',
    icon: JOB_ROLE_META['cloud-infrastructure-architect'].icon,
    color: JOB_ROLE_META['cloud-infrastructure-architect'].color,
    primaryTools: [
      'aws-cli',
      'terraform',
      'kubectl',
      'cloudformation',
      'aws-cdk',
      'ansible'
    ],
    recommendedTools: [
      'pulumi',
      'helm',
      'docker',
      'prometheus',
      'cloudwatch',
      'python'
    ],
    optionalTools: [
      'kubernetes',
      'grafana',
      'vault',
      'istio',
      'openshift',
      'go'
    ],
    categories: ['cloud', 'devops', 'backend', 'security'],
    skillAreas: [
      'Infrastructure as Code',
      'Cloud Architecture',
      'Networking',
      'Cost Optimization',
      'Containerization'
    ],
    workflowTypes: ['architecture-planning', 'deployment', 'monitoring']
  },
  {
    id: 'platform-engineer',
    name: JOB_ROLE_META['platform-engineer'].label,
    description: 'Creates and maintains internal development platforms',
    icon: JOB_ROLE_META['platform-engineer'].icon,
    color: JOB_ROLE_META['platform-engineer'].color,
    primaryTools: [
      'openshift',
      'jenkins',
      'kubernetes',
      'argocd',
      'helm',
      'tekton'
    ],
    recommendedTools: [
      'prometheus',
      'grafana',
      'docker',
      'terraform',
      'ansible',
      'gitlab-ci'
    ],
    optionalTools: [
      'istio',
      'kustomize',
      'operator-sdk',
      'vault',
      'sonarqube'
    ],
    categories: ['devops', 'cloud', 'security'],
    skillAreas: [
      'Container Orchestration',
      'CI/CD',
      'Developer Experience',
      'Platform APIs',
      'Service Mesh'
    ],
    workflowTypes: ['platform-development', 'automation', 'monitoring']
  },
  {
    id: 'devops-engineer',
    name: JOB_ROLE_META['devops-engineer'].label,
    description: 'Automates development and operations processes',
    icon: JOB_ROLE_META['devops-engineer'].icon,
    color: JOB_ROLE_META['devops-engineer'].color,
    primaryTools: [
      'ansible',
      'jenkins',
      'gitlab-ci',
      'docker',
      'kubernetes',
      'prometheus'
    ],
    recommendedTools: [
      'terraform',
      'grafana',
      'github-actions',
      'helm',
      'python',
      'bash'
    ],
    optionalTools: [
      'packer',
      'vault',
      'argocd',
      'istio',
      'elk-stack'
    ],
    categories: ['devops', 'cloud', 'security'],
    skillAreas: [
      'CI/CD Pipelines',
      'Infrastructure Automation',
      'Monitoring',
      'Incident Response',
      'Container Security'
    ],
    workflowTypes: ['automation', 'deployment', 'monitoring']
  },
  {
    id: 'site-reliability-engineer',
    name: JOB_ROLE_META['site-reliability-engineer'].label,
    description: 'Ensures application reliability and performance',
    icon: JOB_ROLE_META['site-reliability-engineer'].icon,
    color: JOB_ROLE_META['site-reliability-engineer'].color,
    primaryTools: [
      'prometheus',
      'grafana',
      'kubernetes',
      'elk-stack',
      'datadog',
      'pagerduty'
    ],
    recommendedTools: [
      'python',
      'terraform',
      'docker',
      'ansible',
      'jenkins',
      'cloudwatch'
    ],
    optionalTools: [
      'opentelemetry',
      'jaeger',
      'istio',
      'vault',
      'chaos-monkey'
    ],
    categories: ['devops', 'cloud', 'security'],
    skillAreas: [
      'Observability',
      'Incident Management',
      'Performance Optimization',
      'Chaos Engineering',
      'Automated Recovery'
    ],
    workflowTypes: ['monitoring', 'incident-response', 'optimization']
  },

  // Application Developers
  {
    id: 'frontend-developer',
    name: JOB_ROLE_META['frontend-developer'].label,
    description: 'Builds user interfaces and client-side applications',
    icon: JOB_ROLE_META['frontend-developer'].icon,
    color: JOB_ROLE_META['frontend-developer'].color,
    primaryTools: [
      'typescript',
      'react',
      'vscode',
      'javascript',
      'webpack',
      'css'
    ],
    recommendedTools: [
      'tailwindcss',
      'jest',
      'next-js',
      'redux',
      'storybook',
      'eslint'
    ],
    optionalTools: [
      'graphql',
      'playwright',
      'cypress',
      'vue',
      'sass',
      'figma'
    ],
    categories: ['frontend', 'testing', 'design'],
    skillAreas: [
      'UI Development',
      'Responsive Design',
      'State Management',
      'Web Performance',
      'Accessibility'
    ],
    workflowTypes: ['development', 'testing', 'design-implementation']
  },
  {
    id: 'backend-developer',
    name: JOB_ROLE_META['backend-developer'].label,
    description: 'Creates server-side applications and APIs',
    icon: JOB_ROLE_META['backend-developer'].icon,
    color: JOB_ROLE_META['backend-developer'].color,
    primaryTools: [
      'java',
      'spring-boot',
      'postgresql',
      'intellij',
      'maven',
      'git'
    ],
    recommendedTools: [
      'nodejs',
      'docker',
      'postman',
      'junit',
      'hibernate',
      'python'
    ],
    optionalTools: [
      'go',
      'mongodb',
      'redis',
      'kafka',
      'graphql',
      'quarkus'
    ],
    categories: ['backend', 'database', 'language'],
    skillAreas: [
      'API Design',
      'Database Design',
      'Microservices',
      'Authentication/Authorization',
      'Performance Optimization'
    ],
    workflowTypes: ['development', 'testing', 'api-design']
  },
  {
    id: 'fullstack-developer',
    name: JOB_ROLE_META['fullstack-developer'].label,
    description: 'Builds both frontend and backend components',
    icon: JOB_ROLE_META['fullstack-developer'].icon,
    color: JOB_ROLE_META['fullstack-developer'].color,
    primaryTools: [
      'typescript',
      'nodejs',
      'react',
      'postgresql',
      'vscode',
      'docker'
    ],
    recommendedTools: [
      'express',
      'mongodb',
      'jest',
      'tailwindcss',
      'git',
      'postman'
    ],
    optionalTools: [
      'next-js',
      'graphql',
      'redis',
      'kubernetes',
      'cypress',
      'github-actions'
    ],
    categories: ['frontend', 'backend', 'database'],
    skillAreas: [
      'Full Application Development',
      'API Integration',
      'Database Management',
      'UI Development',
      'Deployment'
    ],
    workflowTypes: ['development', 'testing', 'deployment']
  },
  {
    id: 'mobile-developer',
    name: JOB_ROLE_META['mobile-developer'].label,
    description: 'Creates applications for mobile platforms',
    icon: JOB_ROLE_META['mobile-developer'].icon,
    color: JOB_ROLE_META['mobile-developer'].color,
    primaryTools: [
      'kotlin',
      'swift',
      'android-studio',
      'xcode',
      'react-native',
      'firebase'
    ],
    recommendedTools: [
      'flutter',
      'gradle',
      'cocoapods',
      'fastlane',
      'java',
      'git'
    ],
    optionalTools: [
      'jetpack-compose',
      'swift-ui',
      'realm',
      'redux',
      'mockito',
      'appium'
    ],
    categories: ['mobile', 'frontend', 'testing'],
    skillAreas: [
      'Mobile UI Development',
      'Native APIs',
      'Cross-Platform Development',
      'App Performance',
      'Mobile Security'
    ],
    workflowTypes: ['development', 'testing', 'app-store-publishing']
  },

  // Data & Analytics Roles
  {
    id: 'data-engineer',
    name: JOB_ROLE_META['data-engineer'].label,
    description: 'Designs data processing systems and pipelines',
    icon: JOB_ROLE_META['data-engineer'].icon,
    color: JOB_ROLE_META['data-engineer'].color,
    primaryTools: [
      'python',
      'spark',
      'sql',
      'airflow',
      'postgresql',
      'aws-glue'
    ],
    recommendedTools: [
      'kafka',
      'hadoop',
      'docker',
      'dbt',
      'redshift',
      'snowflake'
    ],
    optionalTools: [
      'terraform',
      'kubernetes',
      'mongodb',
      'elasticsearch',
      'aws-emr',
      'databricks'
    ],
    categories: ['database', 'backend', 'cloud'],
    skillAreas: [
      'ETL/ELT Pipelines',
      'Data Warehousing',
      'Big Data Processing',
      'Data Modeling',
      'Stream Processing'
    ],
    workflowTypes: ['data-pipeline-development', 'database-design', 'data-processing']
  },
  {
    id: 'data-scientist',
    name: JOB_ROLE_META['data-scientist'].label,
    description: 'Extracts insights from data using statistical methods',
    icon: JOB_ROLE_META['data-scientist'].icon,
    color: JOB_ROLE_META['data-scientist'].color,
    primaryTools: [
      'python',
      'jupyter',
      'pandas',
      'scikit-learn',
      'r',
      'tableau'
    ],
    recommendedTools: [
      'tensorflow',
      'pytorch',
      'sql',
      'dvc',
      'matplotlib',
      'numpy'
    ],
    optionalTools: [
      'spark',
      'h2o',
      'keras',
      'power-bi',
      'airflow',
      'aws-sagemaker'
    ],
    categories: ['database', 'language'],
    skillAreas: [
      'Statistical Analysis',
      'Machine Learning',
      'Data Visualization',
      'Experiment Design',
      'Feature Engineering'
    ],
    workflowTypes: ['data-analysis', 'model-development', 'research']
  },
  {
    id: 'ml-engineer',
    name: JOB_ROLE_META['ml-engineer'].label,
    description: 'Deploys and scales machine learning models',
    icon: JOB_ROLE_META['ml-engineer'].icon,
    color: JOB_ROLE_META['ml-engineer'].color,
    primaryTools: [
      'python',
      'tensorflow',
      'pytorch',
      'kubernetes',
      'docker',
      'mlflow'
    ],
    recommendedTools: [
      'scikit-learn',
      'kubeflow',
      'spark',
      'dvc',
      'airflow',
      'aws-sagemaker'
    ],
    optionalTools: [
      'ray',
      'seldon',
      'onnx',
      'grafana',
      'jenkins',
      'fastapi'
    ],
    categories: ['cloud', 'devops', 'backend'],
    skillAreas: [
      'Model Deployment',
      'MLOps',
      'Model Optimization',
      'Performance Monitoring',
      'Scalable ML Systems'
    ],
    workflowTypes: ['model-deployment', 'pipeline-automation', 'monitoring']
  },

  // Security & QA
  {
    id: 'security-engineer',
    name: JOB_ROLE_META['security-engineer'].label,
    description: 'Ensures security of systems and data',
    icon: JOB_ROLE_META['security-engineer'].icon,
    color: JOB_ROLE_META['security-engineer'].color,
    primaryTools: [
      'nmap',
      'wireshark',
      'metasploit',
      'owasp-zap',
      'hashicorp-vault',
      'snyk'
    ],
    recommendedTools: [
      'burpsuite',
      'kali-linux',
      'docker',
      'sonarqube',
      'python',
      'aws-security-hub'
    ],
    optionalTools: [
      'terraform',
      'kubernetes',
      'ansible',
      'elk-stack',
      'osquery',
      'falco'
    ],
    categories: ['security', 'devops', 'cloud'],
    skillAreas: [
      'Application Security',
      'Network Security',
      'Penetration Testing',
      'Security Automation',
      'Compliance'
    ],
    workflowTypes: ['security-testing', 'monitoring', 'incident-response']
  },
  {
    id: 'qa-engineer',
    name: JOB_ROLE_META['qa-engineer'].label,
    description: 'Ensures software quality through testing',
    icon: JOB_ROLE_META['qa-engineer'].icon,
    color: JOB_ROLE_META['qa-engineer'].color,
    primaryTools: [
      'selenium',
      'cypress',
      'jira',
      'jenkins',
      'jest',
      'postman'
    ],
    recommendedTools: [
      'junit',
      'playwright',
      'appium',
      'testng',
      'cucumber',
      'gitlab-ci'
    ],
    optionalTools: [
      'docker',
      'k6',
      'jmeter',
      'sonarqube',
      'xray',
      'qtest'
    ],
    categories: ['testing', 'devops'],
    skillAreas: [
      'Test Automation',
      'Manual Testing',
      'Performance Testing',
      'Test Planning',
      'Bug Tracking'
    ],
    workflowTypes: ['test-development', 'test-execution', 'quality-assurance']
  },

  // Leadership & Management
  {
    id: 'engineering-manager',
    name: JOB_ROLE_META['engineering-manager'].label,
    description: 'Leads engineering teams and processes',
    icon: JOB_ROLE_META['engineering-manager'].icon,
    color: JOB_ROLE_META['engineering-manager'].color,
    primaryTools: [
      'jira',
      'git',
      'vscode',
      'jenkins',
      'slack',
      'confluence'
    ],
    recommendedTools: [
      'github',
      'gitlab',
      'figma',
      'miro',
      'asana',
      'linear'
    ],
    optionalTools: [
      'tableau',
      'notion',
      'lucidchart',
      'zoom',
      'microsoft-teams',
      'power-bi'
    ],
    categories: ['productivity', 'devops'],
    skillAreas: [
      'Team Leadership',
      'Project Management',
      'Process Improvement',
      'Technical Strategy',
      'Performance Management'
    ],
    workflowTypes: ['planning', 'team-management', 'reporting']
  },
  {
    id: 'tech-lead',
    name: JOB_ROLE_META['tech-lead'].label,
    description: 'Provides technical leadership and guidance',
    icon: JOB_ROLE_META['tech-lead'].icon,
    color: JOB_ROLE_META['tech-lead'].color,
    primaryTools: [
      'git',
      'vscode',
      'intellij',
      'jira',
      'github',
      'slack'
    ],
    recommendedTools: [
      'docker',
      'kubernetes',
      'confluence',
      'jenkins',
      'sonarqube',
      'terraform'
    ],
    optionalTools: [
      'argocd',
      'gitlab-ci',
      'figma',
      'miro',
      'datadog',
      'aws-cloudformation'
    ],
    categories: ['productivity', 'devops', 'cloud'],
    skillAreas: [
      'Architecture Design',
      'Code Review',
      'Technical Mentoring',
      'System Integration',
      'Technical Decision Making'
    ],
    workflowTypes: ['architecture-planning', 'development', 'team-leadership']
  },

  // Custom role (placeholder)
  {
    id: 'custom',
    name: JOB_ROLE_META['custom'].label,
    description: 'Custom role with personalized tools',
    icon: JOB_ROLE_META['custom'].icon,
    color: JOB_ROLE_META['custom'].color,
    primaryTools: [],
    recommendedTools: [],
    optionalTools: [],
    categories: [],
    skillAreas: [],
    workflowTypes: []
  }
];

/**
 * Map of job role IDs to their configurations for quick lookup
 */
export const JOB_ROLE_CONFIG_MAP: Record<JobRole, JobRoleConfig> = 
  DEFAULT_JOB_ROLE_CONFIGS.reduce((acc, config) => {
    acc[config.id as JobRole] = config;
    return acc;
  }, {} as Record<JobRole, JobRoleConfig>); 