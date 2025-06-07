# Job Role Detection Algorithm Documentation

## Overview

The HatStart Job Role Detection system identifies a developer's primary job role through a questionnaire and analysis algorithm. This system helps personalize tool recommendations based on specific roles like Frontend Developer, Backend Developer, DevOps Engineer, etc.

## Questionnaire Design

### Question Categories

The questionnaire consists of 5 key questions across several categories:

1. **Technologies** - Tech stacks and tools used daily
2. **Responsibilities** - Primary work duties and focus areas
3. **Workflows** - How work is approached and structured
4. **Preferences** - Career goals and professional interests
5. **Tools** - Specific tools used on a daily basis

### Question Types

- **Multi-select**: Choose multiple options from a list
- **Single-choice**: Select one option from multiple choices
- **Work-focus**: Special question type for role identification
- **Technology-preferences**: Gauge tech preferences and experience
- **Responsibilities**: Understand primary work responsibilities

### Role Indicators

Each question option contains role indicators that associate it with specific job roles:

```typescript
roleIndicators: [
  { role: 'frontend-developer', weight: 0.9 },
  { role: 'fullstack-developer', weight: 0.6 },
  { role: 'mobile-developer', weight: 0.3 }
]
```

The weights (0-1) represent how strongly an option indicates a particular role, with higher values suggesting stronger correlation.

## Role Detection Algorithm

### Score Calculation Process

1. **Answer Validation**
   - Verify that required questions are answered
   - Filter out invalid responses
   - Ensure minimum required answers are provided

2. **Role Score Calculation**
   ```
   // Initialize scores for all roles to 0
   roleScores = { 'frontend-developer': 0, 'backend-developer': 0, ... }
   
   // For each selected option in the answers
   for each option in selectedOptions:
     for each indicator in option.roleIndicators:
       roleScores[indicator.role] += indicator.weight
   
   // Normalize scores to 0-1 range
   maxScore = max(roleScores)
   for each role in roleScores:
     roleScores[role] = roleScores[role] / maxScore
   ```

3. **Primary Role Determination**
   - Sort roles by score in descending order
   - Select the highest-scoring role as the primary role
   - Identify alternative roles (2nd-4th place) with scores > 0.3

4. **Confidence Calculation**
   - Base confidence on the primary role score (0-1)
   - Adjust based on the gap between primary and secondary roles
   - Factor in questionnaire completion rate
   - Apply penalty for skipped questionnaires
   ```
   confidence = primaryScore
   confidence += (primaryScore - secondaryScore) * 0.2
   confidence *= (0.5 + completionRate / 200)
   if (skipped) confidence *= 0.6
   confidence = min(0.95, confidence)
   ```

### Confidence Assessment

The algorithm calculates confidence in the role detection based on:

- **Primary Score (50%)**: How strongly the answers indicate the primary role
- **Score Gap (20%)**: Differentiation between primary and alternative roles
- **Completion Rate (30%)**: Percentage of questions answered
- **Skipped Penalty (40%)**: Applied if user skipped the full questionnaire

A minimum confidence threshold (default: 0.65) determines if the detection is reliable enough for recommendations.

## Recommendation Generation

### Role-Based Recommendations

The system generates personalized recommendations based on the detected role:

1. **General Advice**: Role-specific guidance for career development
   ```
   "Explore Frontend Developer specific tools and workflows"
   ```

2. **Essential Tools**: Recommended tools from the role's primary tools list
   ```
   "Install vscode - an essential tool for Frontend Developer roles"
   ```

3. **Learning Resources**: Suggestions for skill development based on role
   ```
   "Consider connecting with other Frontend Developer professionals"
   ```

### Tool Configuration Integration

The system integrates with the Job Role Configuration Service, which maintains detailed configurations for each role including:

- Primary, recommended, and optional tools
- Relevant tool categories
- Skill areas associated with the role
- Typical workflow types

These configurations are used to provide targeted recommendations and filter the tool catalog.

## Implementation Details

### Data Structures

```typescript
interface JobRoleQuestion {
  id: string;
  text: string;
  type: JobRoleQuestionType;
  category: string;
  options: JobRoleQuestionOption[];
  required?: boolean;
  // ... other fields
}

interface JobRoleDetectionResult {
  primaryRole: JobRole;
  confidence: number;
  alternativeRoles: Array<{ role: JobRole; confidence: number }>;
  recommendations: string[];
  timestamp: Date;
}
```

### Validation Rules

1. **Required Questions**: All questions marked as required must be answered
2. **Valid Answers**: Multi-select answers must have at least one selected option
3. **Confidence Threshold**: Minimum 65% confidence for reliable role detection
4. **Alternative Roles**: Only roles with > 30% relative score are included as alternatives

### Edge Cases Handled

- Insufficient required answers trigger an error
- Mixed signals result in lower confidence scores
- Ties in role scores are handled by sorting priority
- Skipped questionnaires have explicitly reduced confidence
- All scores are normalized to handle varying numbers of answers

## Usage Example

```typescript
const service = new JobRoleAssessmentService();
const questions = service.getQuestions();

// User completes questionnaire
const response: JobRoleResponse = {
  answers: [
    {
      questionId: 'tech-stack',
      selectedOptionIds: ['frontend-tech', 'backend-tech'],
      timestamp: new Date()
    },
    // ... more answers
  ],
  startTime: new Date(),
  endTime: new Date(),
  completionRate: 80,
  skipped: false
};

const result = service.detectJobRole(response);
// Returns: { primaryRole: 'fullstack-developer', confidence: 0.85, ... }
```

## Migration from Experience Levels

This job role detection system replaces the previous experience level assessment (beginner/intermediate/advanced) with the following improvements:

1. **Role-Specific Recommendations**: Tools tailored to job roles instead of generic experience levels
2. **Multiple Alternatives**: Recognizes that developers often span multiple roles
3. **Detailed Role Configuration**: More granular control over tool recommendations
4. **Career Focus**: Aligns with professional development within specific career paths

Tool manifests and recommendations that previously used experience levels can now be migrated to use job roles, with tools marked as:
- **Essential**: Primary tools for the role (previously advanced-level tools)
- **Recommended**: Suggested tools for the role (previously intermediate-level tools)
- **Optional**: Nice-to-have tools (previously beginner-level tools)

## Future Enhancements

1. **Role Combinations**: Support explicit hybrid roles like "DevOps Frontend Developer"
2. **Adaptive Questioning**: Adjust questions based on previous answers
3. **Role Specialization**: Detect sub-specialties within major roles
4. **Experience Within Role**: Gauge junior/senior level within the detected role
5. **Company-Specific Roles**: Support for custom role definitions specific to an organization 