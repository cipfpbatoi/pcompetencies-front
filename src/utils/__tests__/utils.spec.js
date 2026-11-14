import { describe, expect, it } from 'vitest'
import { getErrorReasons } from '@/utils/utils.js'

describe('getErrorReasons', () => {
  it('flattens the keyed validation reasons into a single list', () => {
    const error = {
      response: {
        data: {
          reasons: {
            evaluationCriteriaLimit: ['El mòdul 0612 supera el 65%'],
            visitPeriodicity: 'Cal indicar la periodicitat de les visites',
            periods: ['Període 1 fora del curs', 'Els períodes 1 i 2 se solapen']
          }
        }
      }
    }

    expect(getErrorReasons(error)).toEqual([
      'El mòdul 0612 supera el 65%',
      'Cal indicar la periodicitat de les visites',
      'Període 1 fora del curs',
      'Els períodes 1 i 2 se solapen'
    ])
  })

  it('returns an empty list when the error carries no reasons', () => {
    expect(getErrorReasons(new Error('Network Error'))).toEqual([])
    expect(getErrorReasons({ response: { data: { detail: 'Error' } } })).toEqual([])
  })
})
