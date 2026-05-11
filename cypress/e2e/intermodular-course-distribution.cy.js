const makeToken = () => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60, roles: ['ROLE_ADMIN'] })
  )
  return `${header}.${payload}.signature`
}

const mockCommonCalls = (pccResponse) => {
  cy.intercept('GET', '**/user/current', {
    statusCode: 200,
    body: { id: 1, roles: ['ROLE_ADMIN'], department: { id: 1 } }
  }).as('getCurrentUser')
  cy.intercept('GET', '**/assessmentTool', { statusCode: 200, body: [] })
  cy.intercept('GET', '**/markingTool', { statusCode: 200, body: [] })
  cy.intercept('GET', '**/transversal-objectives', { statusCode: 200, body: [] })
  cy.intercept('GET', '**/pcc/cycle/*', { statusCode: 200, body: pccResponse }).as('getPcc')
}

const visitIntermodular = (pccId) => {
  cy.visit('/pcc/intermodular', {
    onBeforeLoad(window) {
      window.localStorage.setItem('token', makeToken())
      window.localStorage.setItem('pccCycleId', `${pccId}`)
    }
  })
}

describe('PCC intermodular two-part flow', () => {
  it('supports project RA distribution in both courses', () => {
    const pccBoth = {
      id: 201,
      intermodularProjectGuide: {
        firstCourseGuide: { weight: 50 },
        secondCourseGuide: { weight: 50 }
      },
      intermodularProjectLearningResultDistributions: [
        { learningResult: { id: 901, number: 1, descriptor: 'RA projecte' }, courseLevel: 1 },
        { learningResult: { id: 901, number: 1, descriptor: 'RA projecte' }, courseLevel: 2 }
      ],
      intermodularProjectModuleOrientations: [],
      modules: [
        {
          code: 'PI1',
          name: 'Projecte 1r',
          courseLevel: 1,
          proyect: true,
          learningResults: [{ id: 901, number: 1, descriptor: 'RA projecte' }]
        },
        {
          code: 'PI2',
          name: 'Projecte 2n',
          courseLevel: 2,
          proyect: true,
          learningResults: [{ id: 901, number: 1, descriptor: 'RA projecte' }]
        }
      ]
    }

    mockCommonCalls(pccBoth)
    cy.intercept('DELETE', '**/intermodular-project-guide/distributions/901/2', {
      statusCode: 200,
      body: pccBoth
    }).as('deleteDistribution2n')

    visitIntermodular(201)
    cy.get('[data-testid="distribution-option-901-1"]').click()
    cy.wait('@deleteDistribution2n')
  })

  it('supports participants and orientation by module+course', () => {
    const pccData = {
      id: 202,
      intermodularProjectGuide: {
        firstCourseGuide: { weight: 50 },
        secondCourseGuide: { weight: 50 }
      },
      intermodularProjectLearningResultDistributions: [],
      intermodularProjectModuleOrientations: [
        {
          module: { code: 'M11', name: 'Mòdul suport 1r' },
          supportLearningResultIds: [311],
          supportLearningResults: [{ id: 311, number: 1, descriptor: 'RA suport 1r' }],
          evaluationCriteriaIds: [811],
          evaluationCriterias: [{ id: 811, code: 'CA1.1', description: 'Criteri 1.1' }],
          courseLevel: 1,
          supportActivitiesGuidance: 'Guidance inicial'
        }
      ],
      modules: [
        {
          code: 'PI1',
          name: 'Projecte 1r',
          courseLevel: 1,
          proyect: true,
          learningResults: [{ id: 111, number: 1, descriptor: 'RA projecte 1r' }]
        },
        {
          code: 'PI2',
          name: 'Projecte 2n',
          courseLevel: 2,
          proyect: true,
          learningResults: [{ id: 112, number: 1, descriptor: 'RA projecte 2n' }]
        },
        {
          code: 'M11',
          name: 'Mòdul suport 1r',
          courseLevel: 1,
          learningResults: [
            {
              id: 311,
              number: 1,
              descriptor: 'RA suport 1r',
              evaluationCriterias: [{ id: 811, code: 'CA1.1', description: 'Criteri 1.1' }]
            }
          ]
        },
        {
          code: 'M22',
          name: 'Mòdul suport 2n',
          courseLevel: 2,
          learningResults: [
            {
              id: 322,
              number: 1,
              descriptor: 'RA suport 2n',
              evaluationCriterias: [{ id: 822, code: 'CA2.1', description: 'Criteri 2.1' }]
            }
          ]
        }
      ]
    }

    mockCommonCalls(pccData)
    cy.intercept('POST', '**/intermodular-project-guide/orientations', (request) => {
      if (request.body.moduleCode === 'M22') {
        expect(request.body).to.deep.equal({
          moduleCode: 'M22',
          courseLevel: 2
        })
      } else {
        expect(request.body).to.deep.equal({
          moduleCode: 'M11',
          courseLevel: 1,
          orientations: {
            supportLearningResultIds: [311],
            evaluationCriteriaIds: [811],
            supportActivitiesGuidance: 'Guidance actualitzada'
          }
        })
      }
      request.reply({ statusCode: 200, body: pccData })
    }).as('saveOrientation')
    cy.intercept('DELETE', '**/intermodular-project-guide/orientations/M11/1', {
      statusCode: 200,
      body: pccData
    }).as('deleteOrientation')

    cy.on('window:confirm', () => true)
    visitIntermodular(202)

    cy.get('[data-testid="participant-select-2"]').select('M22')
    cy.get('[data-testid="add-participant-2"]').click()
    cy.wait('@saveOrientation')

    cy.get('[data-testid="edit-orientation-1-M11"]').click()
    cy.get('.modal-body textarea').clear().type('Guidance actualitzada')
    cy.contains('.modal-footer .btn', 'Guardar orientació').click()
    cy.wait('@saveOrientation')

    cy.contains('.btn', 'Eliminar orientació').first().click({ force: true })
    cy.wait('@deleteOrientation')
  })
})
