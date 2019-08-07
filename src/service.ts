import { ResponseData } from "./data"
import { Event } from "./event"
import { PlatformController, ServiceController, ServiceUser, ServiceProvider, DigitalAsset, Coupon } from 'wrappy-cc'
import * as uuid from "uuid/v4"
import { History, CouchDBHelper } from "./couchdb"

/*****    Identity Definition   *****/
const adminIdentity = 'admin'

/********** Helper Classes **********/
const fabric = require('./fabric')
const convector = require('./convector')

/********** Cryto Constants **********/
const secret = 'Sfaslfsadlkfasdf'
const bcrypt = require('bcrypt')
const saltRounds = 12

const queryParticipantClass = (type: string) => {
    const participantClass = {}
    participantClass['user'] = ServiceUser
    participantClass['service'] = ServiceProvider
    return participantClass[type]
}

const createEvent = (type, identity: string, data: any): Event => {
    const event = new Event()
    event.eventId = uuid().toUpperCase()
    event.date = new Date()
    event.type = type
    event.identity = identity
    event.data = data
    return event
}

const isValidDate = (date) => {
    return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
}

module.exports = {
    authenticate: async function (type, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: wrappy-service authenticate")
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.username) throw "ERROR: Required field [username] is missing."
            if (!request.body.password) throw "ERROR: Required field [password] is missing."
            if (type === 'user') { if (!request.body.peer) throw "ERROR: Required field [peer] is missing." }

            const identity = adminIdentity
            let username = request.body.username
            if (type === 'user') username = `${username}@${request.body.peer}`
            const password = request.body.password
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(identity)
            const participantClass = queryParticipantClass(type)
            // let participant_test = await PlatformControllerStub.queryParticipant('PlatformProvider', 'username', 'platformProvider7')
            let participant = await PlatformControllerStub.queryParticipant(participantClass.name, 'username', username)
            if (participant !== null) participant = new participantClass(participant)
            if ((participant === null) || (! await bcrypt.compare(password, participant.password))) throw `ERROR: Access denied for user [${username}].`

            if ((type === 'user') && (participant.userType=='CONSUMER')) {
                /***** VALIDATE EXPIRED COUPONS ******/
                console.log('Refreshing expired coupons ...')
                const ServiceControllerStub: ServiceController = await convector.getServiceController(participant.id)
                await ServiceControllerStub.checkExpiration()
            }

            response.data = participant
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    registerUser: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: registerUser")
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.username) throw "ERROR: Required field [username] is missing."
            if (!request.body.password) throw "ERROR: Required field [password] is missing."
            if (!request.body.name) throw "ERROR: Required field [name] is missing."
            if (!request.body.peer) throw "ERROR: Required field [peer] is missing."

            const username = request.body.username
            const id = uuid().toUpperCase()
            const user = new ServiceUser(request.body)
            user.username = `${user.username}@${request.body.peer}`
            user.id = id
            user.password = await bcrypt.hash(request.body.password, saltRounds)
            user.fingerprint = ''

            console.log(`Registering user ${username} ...`)
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(adminIdentity)
            const ServiceControllerStub: ServiceController = await convector.getServiceController(adminIdentity)

            /*****  SAVE USER TO BLOCKCHAIN  ******/
            await ServiceControllerStub.registerUser(user)

            /*****    ENROLL TO FABRIC CA    ******/
            console.log('Enrolling for certificate ... ')
            const registrationData = await fabric.registerUser(id, request.body.password, request.body.password, user.userType)

            /***** UPDATE USER FINGERPRINT  ******/
            console.log('Updating fingerprint ...')
            await PlatformControllerStub.stampFingerprint('ServiceUser', id, registrationData.fingerprint)

            response.data = {
                id: id,
                secret: registrationData.secret
            }
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    registerStore: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: registerStore")
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.username) throw "ERROR: Required field [username] is missing."
            if (!request.body.password) throw "ERROR: Required field [password] is missing."
            if (!request.body.name) throw "ERROR: Required field [name] is missing."

            const username = request.body.username
            const id = uuid().toUpperCase()
            const store = new ServiceUser(request.body)
            store.username = `${store.username}@${request.user.peer}`
            store.id = id
            store.password = await bcrypt.hash(request.body.password, saltRounds)
            store.fingerprint = ''

            console.log(`Registering store ${username} ...`)
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(adminIdentity)
            const ServiceControllerStub: ServiceController = await convector.getServiceController(request.user.id)

            /*****  SAVE USER TO BLOCKCHAIN  ******/
            await ServiceControllerStub.registerStore(store)

            /*****    ENROLL TO FABRIC CA    ******/
            console.log('Enrolling for certificate ... ')
            const registrationData = await fabric.registerUser(id, request.body.password, store.userType)

            /***** UPDATE USER FINGERPRINT  ******/
            console.log('Updating fingerprint ...')
            await PlatformControllerStub.stampFingerprint('ServiceUser', id, registrationData.fingerprint)

            response.data = {
                id: id,
                secret: registrationData.secret
            }
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    registerCoupon: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: registerCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.name) throw "Required field [name] is missing."
            if (!request.body.denomination) throw "Required field [denomination] is missing."
            if (!Array.isArray(request.body.denomination)) throw "Required field [denomination] must be an Array of Integer."

            console.log(`Registering coupon [${request.body.name}]  ...`)
            const id = uuid().toUpperCase()
            const identity = request.user.id
            const coupon = new DigitalAsset({
                id: id,
                name: request.body.name,
                denomination: request.body.denomination
            })

            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.registerCoupon(coupon)
            response.data = id
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    issueCoupon: async function (sse, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: issueCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.recipient) throw "Required field [recipient] is missing."
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (typeof (request.body.quantity) !== 'number') throw "Required field [quantity] is missing."
            if (typeof (request.body.expiry) !== 'number') throw "Required field [expiry] is missing."
            if (typeof (request.body.value) !== 'number') throw "Required field [value] is missing."

            let uuids = []
            for (let i = 0; i < request.body.quantity; i++) {
                uuids[i] = uuid().toUpperCase()
            }

            console.log(`Issuing coupon to [${request.body.recipient}]  ...`)
            const identity = request.user.id
            const param = {
                assetId: request.body.coupon,
                ids: uuids,
                value: request.body.value,
                quantity: request.body.quantity,
                expiry: request.body.expiry,
                recipient: request.body.recipient
            }

            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.issueCoupon(param)

            /*****  SAVE HISTORY  *****/
            const eventType = "ISSUE"
            for (let couponId of uuids) {

                /*****  RECIPIENT HISTORY  *****/
                const recipientHistory = new History({
                    id: request.body.recipient,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer

                })
                await CouchDBHelper.saveHistory(recipientHistory)

                /*****   SOURCE HISTORY   *****/
                const sourceHistory = new History({
                    id: request.user.peer,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer
                })
                await CouchDBHelper.saveHistory(sourceHistory)
            }

            /***** TRIGGER EVENT ******/
            const event = createEvent(eventType, request.body.recipient, { coupon: uuids })
            sse.send(event, "WRAPPY_EVENT")

            response.data = uuids
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    transferCoupon: async function (sse, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: transferCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (!Array.isArray(request.body.coupon)) throw "Required field [coupon] must be an Array of Coupon."
            if (!request.body.recipient) throw "Required field [recipient] is missing."

            /***** VALIDATE EXPIRED COUPONS ******/
            console.log('Refreshing expired coupons ...')
            const ServiceControllerExpiredStub: ServiceController = await convector.getServiceController(request.user.id)
            await ServiceControllerExpiredStub.checkExpiration()

            console.log(`Transferring coupons ...`)
            const coupons = request.body.coupon
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.transferCoupon({ coupon: coupons, recipient: request.body.recipient })

            /*****  SAVE HISTORY  *****/
            const eventType = "TRANSFER"
            for (let couponId of coupons) {

                /*****  RECIPIENT HISTORY  *****/
                const recipientHistory = new History({
                    id: request.body.recipient,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer

                })
                await CouchDBHelper.saveHistory(recipientHistory)

                /*****   SOURCE HISTORY   *****/
                const sourceHistory = new History({
                    id: request.user.id,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer
                })
                await CouchDBHelper.saveHistory(sourceHistory)
            }

            /***** TRIGGER EVENT ******/
            const event = createEvent(eventType, request.body.recipient, { coupon: coupons })
            sse.send(event, "WRAPPY_EVENT")

            response.data = coupons
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    redeemCoupon: async function (sse, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: redeemCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (!Array.isArray(request.body.coupon)) throw "Required field [coupon] must be an Array of Coupon."
            if (!request.body.store) throw "Required field [store] is missing."

            /***** VALIDATE EXPIRED COUPONS ******/
            console.log('Refreshing expired coupons ...')
            const ServiceControllerExpiredStub: ServiceController = await convector.getServiceController(request.user.id)
            await ServiceControllerExpiredStub.checkExpiration()

            console.log(`Redeeming coupons ...`)
            const coupons = request.body.coupon
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.redeemCoupon({ coupon: coupons, store: request.body.store })

            /*****  UPDATE REDEEMER LIST  *****/
            CouchDBHelper.saveRedeemer(request.body.store, identity)

            /*****  SAVE HISTORY  *****/
            const eventType = "REDEEM"
            for (let couponId of coupons) {

                /*****  RECIPIENT HISTORY  *****/
                const recipientHistory = new History({
                    id: request.body.store,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer

                })
                await CouchDBHelper.saveHistory(recipientHistory)

                /*****   SOURCE HISTORY   *****/
                const sourceHistory = new History({
                    id: request.user.id,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer
                })
                await CouchDBHelper.saveHistory(sourceHistory)
            }

            /***** TRIGGER EVENT ******/
            const event = createEvent(eventType, request.body.store, { coupon: coupons })
            sse.send(event, "WRAPPY_EVENT")

            response.data = coupons
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    settleCoupon: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: settleCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (!Array.isArray(request.body.coupon)) throw "Required field [coupon] must be an Array of Coupon."

            console.log(`Settling coupons ...`)
            const coupons = request.body.coupon
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.settleCoupon({ coupon: coupons })

            /*****  SAVE HISTORY  *****/
            const eventType = "SETTLE"
            for (let couponId of coupons) {

                /*****  RECIPIENT HISTORY  *****/
                const recipientHistory = new History({
                    id: request.user.peer,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer

                })
                await CouchDBHelper.saveHistory(recipientHistory)

                /*****   SOURCE HISTORY   *****/
                const sourceHistory = new History({
                    id: request.user.id,
                    coupon: couponId,
                    type: eventType,
                    peer: request.user.peer
                })
                await CouchDBHelper.saveHistory(sourceHistory)
            }

            response.data = coupons
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    deactivateCoupon: async function (sse, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: deactivateCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (!Array.isArray(request.body.coupon)) throw "Required field [coupon] must be an Array of Coupon."
            if (!request.body.reason) throw "Required field [reason] is missing."

            console.log(`Deactivating coupons ...`)
            const coupons = request.body.coupon
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.deactivateCoupon({ coupon: coupons, reason: request.body.reason })

            /***** TRIGGER EVENT ******/
            const event = createEvent("DEACTIVATE", "ALL", { coupon: coupons })
            sse.send(event, "WRAPPY_EVENT")

            response.data = coupons
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    activateCoupon: async function (sse, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: activateCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."
            if (!Array.isArray(request.body.coupon)) throw "Required field [coupon] must be an Array of Coupon."

            console.log(`Activating coupons ...`)
            const coupons = request.body.coupon
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.activateCoupon({ coupon: coupons })

            /***** TRIGGER EVENT ******/
            const event = createEvent("ACTIVATE", "ALL", { coupon: coupons })
            sse.send(event, "WRAPPY_EVENT")

            response.data = coupons
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    updateServiceUserInfo: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: updateServiceUserInfo")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** HASH PASSWORD IF FOUND ******/
            let param = request.body
            if (param.password) param.password = await bcrypt.hash(param.password, saltRounds)

            console.log(`Updating information for ${request.user.id} ...`)
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerStub.updateServiceUserInfo(param)

            response.data = identity
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    updateServiceProviderInfo: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: updateServiceProviderInfo")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** HASH PASSWORD IF FOUND ******/
            let param = request.body
            if (param.password) param.password = await bcrypt.hash(param.password, saltRounds)

            console.log(`Updating information for ${request.user.id} ...`)
            const identity = request.user.id
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(identity)
            await await PlatformControllerStub.updateServiceProviderInfo(param)

            response.data = identity
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    infoCoupon: async function (type, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: infoCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.coupon) throw "Required field [coupon] is missing."

            console.log(`Getting coupon info ...`)
            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            response.data = new Coupon(await ServiceControllerStub.infoCoupon({ type: type, coupon: request.body.coupon }))
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    balanceCoupon: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: balanceCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            const identity = request.user.id
            /***** VALIDATE EXPIRED COUPONS ******/
            console.log('Refreshing expired coupons ...')
            const ServiceControllerExpiredStub: ServiceController = await convector.getServiceController(identity)
            await ServiceControllerExpiredStub.checkExpiration()

            console.log(`Getting coupon balance ...`)
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            const user = new ServiceUser(await ServiceControllerStub.queryServiceUser())
            response.data = {
                active: user.wallet.coupon.active,
                inactive: user.wallet.coupon.inactive,
                expired: user.wallet.coupon.expired,
                input: user.wallet.coupon.input,
                output: user.wallet.coupon.output
            }
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    assetList: async function (request) {
        let response = new ResponseData()
        try {
            console.log("Method: assetList")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log('')

            const identity = request.user.id
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(identity)
            const assets = await PlatformControllerStub.queryAssetsByValues('DigitalAsset', 'owner', [request.user.peer])
            response.data = assets.map(asset => new DigitalAsset(asset))
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    listCoupon: async function (type, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: listCoupon")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.filter) throw "Required field [filter] is missing."
            const filter = request.body.filter
            if (!['ALL', 'ACTIVE', 'DEACTIVATED', 'REDEEMED', 'SETTLED'].includes(filter.toUpperCase())) throw "Allowed values for filter ['ALL', 'ACTIVE', 'DEACTIVATED', 'REDEEMED', 'SETTLED']."

            const identity = request.user.id
            const ServiceControllerStub: ServiceController = await convector.getServiceController(identity)
            let key = 'owner'
            let value = request.user.id
            if (type === 'provider') {
                key = 'issuer'
                value = request.user.peer
            }
            else if (type === 'store') {
                console.log(request.user.type)
                key = 'redeemedStore'
                console.log(key)
            }
            const coupons = await ServiceControllerStub.queryCoupons(key, value, filter)
            response.data = coupons.map(coupon => new Coupon(coupon))
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    listUser: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: listUser")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log(`Parameter: ${body}`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.filter) throw "Required field [filter] is missing."
            const filter = request.body.filter.toUpperCase()

            let filterStr = ''
            if (['ALL', 'CONSUMER', 'STORE'].includes(filter)) {
                if (filter !== 'ALL') filterStr = `"userType": "${filter}",`
            }
            else throw "Allowed values for FILTER = ['ALL', 'CONSUMER', 'STORE']."

            const identity = request.user.id
            const PlatformControllerStub: PlatformController = await convector.getPlatformController(identity)
            const users = await PlatformControllerStub.queryParticipants('ServiceUser', filterStr)
            response.data = users.map(user => new ServiceUser(user))
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    listReedemer: async function (request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: listReedemer")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log('')

            response.data = await CouchDBHelper.queryRedeemer(request.user.id)
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
    listHistory: async function (type, request) {
        let response = new ResponseData()
        try {
            const body = JSON.stringify(request.body)
            console.log("Method: listHistory")
            console.log(`Identity: ${request.user.id} (${request.user.type})`)
            console.log('')

            /***** MANDATORY PARAM VALIDATION ******/
            if (!request.body.dateFrom) throw "Required field [dateFrom] is missing."
            const dateFrom = new Date(request.body.dateFrom)
            if (!isValidDate(dateFrom)) throw "Field [dateFrom] is not in date format."
            if (!request.body.dateTo) throw "Required field [dateTo] is missing."
            const dateTo = new Date(request.body.dateTo)
            if (!isValidDate(dateTo)) throw "Field [dateFrom] is not in date format."

            let id = request.user.peer
            if (type === 'user') id = request.user.id
            response.data = await CouchDBHelper.queryHistory(id, request.body.dateFrom, request.body.dateTo)
            response.code = 100
            response.description = 'SUCCESS'
            console.log(response.description)
            console.log('')
        } catch (error) {
            response.code = -100
            response.description = 'FAILED'
            let message = ''
            if (typeof error === 'string') message = error
            if (typeof error === 'object') {
                if (error.endorsements) {
                    const endorsementMessage = error.endorsements[0].message
                    const regex = new RegExp("(?<=failure: )(.*)(?<=})")
                    message = JSON.parse(regex.exec(endorsementMessage)[1]).message
                }
                else if (error.responses) {
                    message = error.responses[0].error.message
                }
                else if (error.message) {
                    message = error.message
                }
            }
            console.log(message)
            response.data = message
        }
        return response
    },
}