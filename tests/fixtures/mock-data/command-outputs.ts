// Mock command outputs for testing detection modules
export const MOCK_COMMAND_OUTPUTS = {
  // Operating System Detection
  OS: {
    WINDOWS: {
      'systeminfo': `Host Name:                 DESKTOP-ABC123
OS Name:                   Microsoft Windows 11 Pro
OS Version:                10.0.22631 N/A Build 22631
OS Manufacturer:           Microsoft Corporation
OS Configuration:          Standalone Workstation
System Type:               x64-based PC
Processor(s):              1 Processor(s) Installed.
                           [01]: Intel64 Family 6 Model 142 Stepping 10 GenuineIntel ~2800 Mhz`,
      'ver': 'Microsoft Windows [Version 10.0.22631.4317]'
    },
    MACOS: {
      'sw_vers': `ProductName:		macOS
ProductVersion:		13.5.2
ProductVersionExtra:	(a)
BuildVersion:		22G91`,
      'uname -m': 'arm64',
      'hostname': 'MacBook-Pro.local'
    },
    LINUX: {
      'uname -a': 'Linux ubuntu-test 5.15.0-78-generic #85-Ubuntu SMP Fri Jul 7 15:25:09 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux',
      'lsb_release -a': `Distributor ID:	Ubuntu
Description:	Ubuntu 22.04.3 LTS
Release:	22.04
Codename:	jammy`,
      'cat /etc/os-release': `NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 22.04.3 LTS"
VERSION_ID="22.04"
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
VERSION_CODENAME=jammy
UBUNTU_CODENAME=jammy`
    }
  },

  // Programming Languages
  LANGUAGES: {
    'node --version': 'v18.17.0',
    'npm --version': '9.6.7',
    'python --version': 'Python 3.9.7',
    'python3 --version': 'Python 3.11.5',
    'java -version': `openjdk version "11.0.19" 2023-04-18
OpenJDK Runtime Environment (build 11.0.19+7-Ubuntu-0ubuntu122.04.1)
OpenJDK 64-Bit Server VM (build 11.0.19+7-Ubuntu-0ubuntu122.04.1, mixed mode, sharing)`,
    'go version': 'go version go1.20.6 linux/amd64',
    'rustc --version': 'rustc 1.71.0 (8ede3aae2 2023-07-12)',
    'tsc --version': 'Version 5.1.6'
  },

  // Frameworks and Libraries
  FRAMEWORKS: {
    'react --version': '18.2.0',
    'ng version': `
     _                      _                 ____ _     ___
    / \\   _ __   __ _ _   _| | __ _ _ __     / ___| |   |_ _|
   / △ \\ | '_ \\ / _\` | | | | |/ _\` | '__|   | |   | |    | |
  / ___ \\| | | | (_| | |_| | | (_| | |      | |___| |___ | |
 /_/   \\_\\_| |_|\\__, |\\__,_|_|\\__,_|_|       \\____|_____|___|
                |___/
    

Angular CLI: 16.1.4
Node: 18.17.0
Package Manager: npm 9.6.7
OS: linux x64`,
    'vue --version': '@vue/cli 5.0.8',
    'django-admin --version': '4.2.3',
    'flask --version': 'Flask 2.3.2',
    'flutter --version': `Flutter 3.10.6 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 6e4339da80 (3 weeks ago) • 2023-07-12 09:42:25 -0700
Engine • revision 54ad777fcd
Tools • Dart 3.0.6 • DevTools 2.23.1`
  },

  // IDEs and Development Tools
  TOOLS: {
    'code --version': `1.80.1
74f6148eb9ea00507ec113ec51c489d6ffb4b771
x64`,
    'git --version': 'git version 2.39.0',
    'docker --version': 'Docker version 24.0.2, build cb74dfc',
    'kubectl version --client': `Client Version: version.Info{Major:"1", Minor:"27", GitVersion:"v1.27.4", GitCommit:"fa3d7990104d7c1f16943a67f11b154b71f6a132", GitTreeState:"clean", BuildDate:"2023-07-19T12:20:54Z", GoVersion:"go1.20.6", Compiler:"gc", Platform:"linux/amd64"}
Kustomize Version: v5.0.1`,
    'mysql --version': 'mysql  Ver 8.0.34-0ubuntu0.22.04.1 for Linux on x86_64 ((Ubuntu))',
    'psql --version': 'psql (PostgreSQL) 14.9 (Ubuntu 14.9-0ubuntu0.22.04.1)'
  },

  // Error cases for testing
  ERRORS: {
    COMMAND_NOT_FOUND: 'command not found',
    ACCESS_DENIED: 'Access is denied',
    TIMEOUT: 'Operation timed out',
    NETWORK_ERROR: 'Network unreachable'
  }
};

// Platform-specific path examples
export const MOCK_PATHS = {
  WINDOWS: {
    NODE_MODULES: 'C:\\Users\\User\\AppData\\Roaming\\npm\\node_modules',
    PROGRAM_FILES: 'C:\\Program Files',
    PROGRAM_FILES_X86: 'C:\\Program Files (x86)',
    APPDATA: 'C:\\Users\\User\\AppData\\Roaming',
    LOCALAPPDATA: 'C:\\Users\\User\\AppData\\Local'
  },
  MACOS: {
    APPLICATIONS: '/Applications',
    USER_APPLICATIONS: '/Users/testuser/Applications',
    HOMEBREW: '/usr/local/bin',
    LIBRARY: '/Users/testuser/Library/Application Support'
  },
  LINUX: {
    USR_BIN: '/usr/bin',
    USR_LOCAL_BIN: '/usr/local/bin',
    OPT: '/opt',
    HOME: '/home/testuser',
    CONFIG: '/home/testuser/.config'
  }
};

// Mock file system structures
export const MOCK_FILE_SYSTEM = {
  PACKAGE_JSON: {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      react: '^18.2.0',
      typescript: '^5.1.6'
    },
    devDependencies: {
      '@types/node': '^20.4.2',
      jest: '^29.6.1'
    }
  },
  REQUIREMENTS_TXT: `Django==4.2.3
Flask==2.3.2
requests==2.31.0
pytest==7.4.0`,
  GEMFILE: `source 'https://rubygems.org'
gem 'rails', '~> 7.0.0'
gem 'pg', '~> 1.1'
gem 'puma', '~> 5.0'`,
  GO_MOD: `module example.com/myproject

go 1.20

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4
)`
}; 