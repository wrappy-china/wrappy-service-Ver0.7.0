export class ResponseData {
  code: number
  description: string
  date: Date
  data: any

  constructor() {
    this.code = 100
    this.description = ''
    this.date = new Date()
    this.data = null
  }
}