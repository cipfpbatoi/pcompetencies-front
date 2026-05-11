/**
 * @typedef {Object} IntermodularProjectLearningResultDistribution
 * @property {{ id: number, number?: number, descriptor?: string }|null} learningResult
 * @property {number[]} courseLevels
 */

/**
 * @typedef {Object} IntermodularProjectParticipatingModule
 * @property {{ code: string, name?: string }|null} module
 * @property {number} courseLevel
 */

/**
 * @typedef {Object} IntermodularProjectModuleOrientation
 * @property {{ code: string, name?: string }|null} module
 * @property {Array<{ id: number, number?: number, descriptor?: string }>} supportLearningResults
 * @property {number[]} supportLearningResultIds
 * @property {number} courseLevel
 * @property {string} supportActivitiesGuidance
 */

/**
 * @typedef {Object} IntermodularProjectGuide
 * @property {string} generalOrientations
 * @property {{ temporalizationOption?: string, temporalizationDetails?: string, weight?: number|null }} [firstCourse]
 * @property {{ temporalizationOption?: string, temporalizationDetails?: string, weight?: number|null }} [secondCourse]
 */

export const INTERMODULAR_COURSE_LEVELS = [1, 2]
