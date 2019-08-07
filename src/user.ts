import { ResponseData } from "./data"
import * as path from "path"
import * as dotenv from 'dotenv'
import { FabricControllerAdapter } from '@worldsibu/convector-adapter-fabric'
import { ClientFactory } from '@worldsibu/convector-core'

/********** Cryto Constants **********/
const Cryptr = require('cryptr')
const secret = 'Sfaslfsadlkfasdf'
const cryptr = new Cryptr(secret)

/******* Environment Variables ******/
dotenv.config()
const homedir = require('os').homedir()
const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'wrappy'
const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'ch1'
const FABRIC_ORG = process.env.FABRIC_ORG || 'org1'
const FABRIC_KEYSTORE = process.env.KEYSTORE || `${homedir}/hyperledger-fabric-network/.hfc-${FABRIC_ORG}`
const FABRIC_NETWORK_PROFILE = process.env.NETWORKPROFILE || `${homedir}/hyperledger-fabric-network/network-profiles/${FABRIC_ORG}.network-profile.yaml`

async function env() {
    let response = new ResponseData()
    try {
        console.log("Method: env")
        console.log(`Parameter: none`)
        console.log('')

        response.data = {
            CHANNEL: FABRIC_CHANNEL,
            CHAINCODE: FABRIC_CHAINCODE,
            ORG: FABRIC_ORG,
            KEYSTORE: FABRIC_KEYSTORE,
            NETWORK_PROFILE: FABRIC_NETWORK_PROFILE
        }

        response.code = 100
        response.description = 'SUCCESS'
        console.log(response.description)
        console.log('')
    } catch (error) {
        console.log(error)
        console.log('')
        response.code = -100
        response.description = 'FAILED'
        if (error.message) error = JSON.stringify(error.message)
        response.data = error
    }
    return response
}

async function listUser(request) {
    let response = new ResponseData()
    try {
        const body = JSON.stringify(request.body)
        console.log("Method: listUser")
        console.log(`Parameter: ${body}`)
        console.log('')

        /***** MANDATORY PARAM VALIDATION ******/
        if (!request.body.identity) throw "ERROR: Required field [identity] is missing."
        const identity = request.body.identity

        const adapter = new FabricControllerAdapter({
            txTimeout: 300000,
            user: identity,
            channel: FABRIC_CHANNEL,
            chaincode: FABRIC_CHAINCODE,
            keyStore: path.resolve(__dirname, FABRIC_KEYSTORE),
            networkProfile: path.resolve(__dirname, FABRIC_NETWORK_PROFILE)
        })

        await adapter.init()
        //const WrappyControllerBackEnd = await ClientFactory(WrappyController, adapter)
        //response.data = await WrappyControllerBackEnd.queryAllUser()
        response.code = 100
        response.description = 'SUCCESS'
        console.log(response.description)
        console.log('')
    } catch (error) {
        console.log(error)
        console.log('')
        response.code = -100
        response.description = 'FAILED'
        if (error.message) error = JSON.stringify(error.message)
        response.data = error
    }
    return response
}

async function createUser(request) {
    let response = new ResponseData()
    try {
        const body = JSON.stringify(request.body)
        console.log("Method: createUser")
        console.log(`Parameter: ${body}`)
        console.log('')

        /***** MANDATORY PARAM VALIDATION ******/
        if (!request.body.username) throw "ERROR: Required field [username] is missing."
        if (!request.body.name) throw "ERROR: Required field [name] is missing."
        if (!request.body.password) throw "ERROR: Required field [password] is missing."

        const adapter = new FabricControllerAdapter({
            txTimeout: 300000,
            user: 'admin',
            channel: FABRIC_CHANNEL,
            chaincode: FABRIC_CHAINCODE,
            keyStore: path.resolve(__dirname, FABRIC_KEYSTORE),
            networkProfile: path.resolve(__dirname, FABRIC_NETWORK_PROFILE)
        })

        //let user = new User()
        //user.username = request.body.username
        //user.name = request.body.name
        //user.password = request.body.password

        await adapter.init()
        //const WrappyControllerBackEnd = await ClientFactory(WrappyController, adapter)
        //response.data = await WrappyControllerBackEnd.createUser(user)
        response.code = 100
        response.description = 'SUCCESS'
        console.log(response.description)
        console.log('')
    } catch (error) {
        console.log(error)
        console.log('')
        response.code = -100
        response.description = 'FAILED'
        if (error.message) error = JSON.stringify(error.message)
        response.data = error
    }
    return response
}

export { env, createUser, listUser }