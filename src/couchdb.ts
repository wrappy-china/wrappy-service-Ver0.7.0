import * as uuid from 'uuid/v4'

const dbHost = process.env.DB || ''
const dbConnection = require('nano')(dbHost)
const DB = dbConnection.use('wrappy')

export class History {
    _id: string
    readonly classification: string = 'net.wrappy.transaction.History'
    id: string
    coupon: string
    type: string    
    date: Date
    peer: string

    constructor(json: any) {
        for (let prop in json) {
            this[prop] = json[prop]
        }
    }
}

export class Redeemer {
    _id: string
    readonly classification: string = 'net.wrappy.transaction.Redeemer'
    store: string
    user: string
    firstTransaction: Date
    lastTransaction: Date

    constructor(json: any) {
        for (let prop in json) {
            this[prop] = json[prop]
        }
    }
}

export class CouchDBHelper {
    static async saveHistory(history: History) {
        const id = uuid().toUpperCase()
        history._id = id
        history.date = new Date()
        await DB.insert(history)
    }

    static async queryHistory(id: string, dateFrom, dateTo: Date) {
        const selector = {
            "selector": {
                "classification": "net.wrappy.transaction.History",
                "id": id,
                "date": {
                    $gte: dateFrom,
                    $lte: dateTo
                  }
            },
            "sort": [{"date": "asc"}]  
        }
        const histories = await DB.find(selector)
        return histories.docs.map(history => new History(history))
    }

    static async saveRedeemer(store, user: string) {
        const redeemers = await DB.find({
            "selector": {
                "classification": "net.wrappy.transaction.History",
                "store": store,
                "user": user
            }
        })
        if (redeemers.docs.length == 0) {
            const id = uuid().toUpperCase()
            const date = new Date
            const redeemer = new Redeemer({
                _id: id,
                store: store,
                user: user,
                firstTransaction: date,
                lastTransaction: date
            })
            await DB.insert(redeemer)
        }
        else {
            const redeemer = new Redeemer(redeemers.docs[0])
            redeemer.lastTransaction = new Date()
            await DB.insert(redeemer)
        }
    }

    static async queryRedeemer(store: string) {
        const redeemers = await DB.find({
            "selector": {
                "classification": "net.wrappy.transaction.Redeemer",
                "store": store
            }
        })
        return redeemers.docs.map(redeemer => new Redeemer(redeemer))
    }

}