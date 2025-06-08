"use strict";
/**
 * Experience Level Types for HatStart Application
 * Defines interfaces and types for user experience assessment and tool filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPERIENCE_LEVEL_META = exports.DEFAULT_SCORING_CONFIG = exports.ExperienceLevel = void 0;
/**
 * User experience levels
 */
exports.ExperienceLevel = {
    Beginner: 'beginner',
    Intermediate: 'intermediate',
    Advanced: 'advanced'
};
/**
 * Default scoring configuration
 */
exports.DEFAULT_SCORING_CONFIG = {
    thresholds: {
        beginner: { min: 0, max: 30 },
        intermediate: { min: 31, max: 70 },
        advanced: { min: 71, max: 100 }
    },
    minimumAnswersRequired: 5,
    confidenceThreshold: 0.6
};
/**
 * Experience level metadata for UI display
 */
exports.EXPERIENCE_LEVEL_META = {
    [exports.ExperienceLevel.Beginner]: {
        label: 'Beginner',
        description: 'New to development or this technology',
        color: '#10B981', // Green
        icon: '🌱'
    },
    [exports.ExperienceLevel.Intermediate]: {
        label: 'Intermediate',
        description: 'Comfortable with basics, learning advanced concepts',
        color: '#3B82F6', // Blue
        icon: '🚀'
    },
    [exports.ExperienceLevel.Advanced]: {
        label: 'Advanced',
        description: 'Expert level, comfortable with complex tools',
        color: '#8B5CF6', // Purple
        icon: '⭐'
    }
};
//# sourceMappingURL=experience-types.js.map