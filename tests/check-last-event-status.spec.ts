import { set, reset } from 'mockdate'

class EventStatus {
  status: 'active' | 'inReview' | 'done'

  constructor(event?: { endDate: Date, reviewDurationInHours: number }) {
    if (event === undefined) {
      this.status = 'done'
      return;
    }

    const now = new Date()

    if (event.endDate >= now) {
      this.status = 'active'
      return;
    }
    const reviewDurationInMiliSeconds = event.reviewDurationInHours * 60 * 60 * 1000
    const reviewDate = new Date(event.endDate.getTime() + reviewDurationInMiliSeconds)

    this.status = reviewDate >= now ? 'inReview' : 'done'
  }
}

class CheckLastEventStatus {
  constructor(private readonly loadLastEventRepository: LoadLastEventRepository) { }

  async perform({ groupId }: { groupId: string }): Promise<EventStatus> {
    const event = await this.loadLastEventRepository.loadLastEvent({ groupId })

    return new EventStatus(event)
  }
}

type LoadLastReturnRepository = { endDate: Date, reviewDurationInHours: number } | undefined

interface LoadLastEventRepository {
  loadLastEvent(input: { groupId: string }): Promise<LoadLastReturnRepository>;
}

class LoadLastEventRepositorySpy implements LoadLastEventRepository {
  groupId?: string
  callsCount = 0
  output: LoadLastReturnRepository

  setEndDateAfterNow(): void {
    this.output = {
      endDate: new Date(new Date().getTime() + 1),
      reviewDurationInHours: 1
    }
  }

  setEndDateBeforeNow() {
    this.output = {
      endDate: new Date(new Date().getTime() - 1),
      reviewDurationInHours: 1
    }
  }

  setEndDateToEqualNow() {
    this.output = {
      endDate: new Date(),
      reviewDurationInHours: 1
    }
  }


  async loadLastEvent({ groupId }: { groupId: string }): Promise<LoadLastReturnRepository> {
    this.groupId = groupId;
    this.callsCount++
    return this.output
  }
}
type SutOutput = {
  sut: CheckLastEventStatus
  loadLastEventRepository: LoadLastEventRepositorySpy
}

const makeSut = (): SutOutput => {
  const loadLastEventRepository = new LoadLastEventRepositorySpy()
  const sut = new CheckLastEventStatus(loadLastEventRepository)

  return { sut, loadLastEventRepository }
}

describe('CheckLastEventStatus', () => {
  const groupId = 'any_group_id'

  beforeAll(() => set(new Date()))

  afterAll(() => reset())

  it('Should get last event data', async () => {
    const { sut, loadLastEventRepository } = makeSut()

    await sut.perform({ groupId })

    expect(loadLastEventRepository.groupId).toBe(groupId)
    expect(loadLastEventRepository.callsCount).toBe(1)
  })

  it('Should return status done', async () => {
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.output = undefined

    const eventStatus = await sut.perform({ groupId })

    expect(eventStatus.status).toBe('done')
  })

  it('Should return status active when now is before event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.setEndDateAfterNow()

    const eventStatus = await sut.perform({ groupId })

    expect(eventStatus.status).toBe('active')
  })

  it('Should return status active when now is to equal event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.setEndDateToEqualNow()

    const eventStatus = await sut.perform({ groupId })

    expect(eventStatus.status).toBe('active')
  })

  it('Should return status inReview when now is after event end time', async () => {
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.setEndDateBeforeNow()

    const EventStatus = await sut.perform({ groupId })

    expect(EventStatus.status).toBe('inReview')
  })

  it('Should return status inReview when now is before event review time', async () => {
    const reviewDurationInHours = 1
    const reviewDurationInMiliSeconds = reviewDurationInHours * 60 * 60 * 1000
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMiliSeconds),
      reviewDurationInHours
    }

    const EventStatus = await sut.perform({ groupId })

    expect(EventStatus.status).toBe('inReview')
  })

  it('Should return status inReview when now is to equal event review time', async () => {
    const reviewDurationInHours = 1
    const reviewDurationInMiliSeconds = reviewDurationInHours * 60 * 60 * 1000
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMiliSeconds),
      reviewDurationInHours
    }

    const EventStatus = await sut.perform({ groupId })

    expect(EventStatus.status).toBe('inReview')
  })


  it('Should return status done when now is after event review time', async () => {
    const reviewDurationInHours = 1
    const reviewDurationInMiliSeconds = reviewDurationInHours * 60 * 60 * 1000
    const { sut, loadLastEventRepository } = makeSut()
    loadLastEventRepository.output = {
      endDate: new Date(new Date().getTime() - reviewDurationInMiliSeconds - 1),
      reviewDurationInHours
    }

    const EventStatus = await sut.perform({ groupId })

    expect(EventStatus.status).toBe('done')
  })
})