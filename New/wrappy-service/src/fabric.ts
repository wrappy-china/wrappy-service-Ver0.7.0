import { FileSystemWallet, X509WalletMixin, Gateway } from "fabric-network"
import { FabricNetwork } from './network'
import { safeLoad } from 'js-yaml'
import * as FabricCAClient from 'fabric-ca-client'
import * as fs from "fs"

const x509 = require('x509')

/**** Profile Values ****/
const adminId = 'admin'
const affiliation = ''

/**** Connection Profile and Wallet ****/
const connectionProfile = safeLoad(fs.readFileSync(FabricNetwork.FABRIC_NETWORK_PROFILE, 'utf8')) 
const wallet = new FileSystemWallet(FabricNetwork.FABRIC_WALLET)

/**** Create client for connecting to Certificate Authority ****/
const caInfo = connectionProfile.certificateAuthorities[FabricNetwork.FABRIC_CA]
const caTLSCACerts = fs.readFileSync(caInfo.tlsCACerts.path)
const ca = new FabricCAClient(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName)

module.exports = {
    registerUser: async function (id, password, type: string) {
        /*** Verify admin wallet already registered ***/
        const adminExists = await wallet.exists(adminId)
        if (!adminExists) throw `ERROR: admin account not registered yet.`

        /*** Verify ID already registered ***/
        const idExists = await wallet.exists(id)
        if (idExists) throw `ERROR: ID [${id}] already registered.`

        /***  Create client for connecting to Certificate Authority ***/
        const gateway = new Gateway()
        await gateway.connect(connectionProfile, { wallet, identity: adminId, discovery: { enabled: true, asLocalhost: true } })

        /*** Get Admin Identity from Certificate Authority ***/
        const ca = gateway.getClient().getCertificateAuthority()
        const adminIdentity = gateway.getCurrentIdentity()

        /*** Register the user, enroll the user, and import the new identity into the wallet ***/
        const secret = await ca.register({ affiliation: affiliation, enrollmentID: id, enrollmentSecret: password, role: 'client', attrs: [{ name: 'type', value: type, ecert: true }] }, adminIdentity)
        const enrollment = await ca.enroll({ enrollmentID: id, enrollmentSecret: secret })
        const cert = x509.parseCert(enrollment.certificate)
        const fingerprint = cert.fingerPrint
        const identity = X509WalletMixin.createIdentity(FabricNetwork.FABRIC_ORG_MSP, enrollment.certificate, enrollment.key.toBytes())
        await wallet.import(id, identity)
        return {
            secret: secret,
            fingerprint: fingerprint
        }
    },
    invoke: async function (username, chaincode, fcn: string, ...args: string[]) {
        /*** Verify user wallet already registered ***/
        const userExists = await wallet.exists(username)
        if (!userExists) throw `ERROR: User [${username}] identity does not exist.`

        /***  Create client for connecting to Certificate Authority ***/
        const gateway = new Gateway()
        await gateway.connect(connectionProfile, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } })
        const network = await gateway.getNetwork(FabricNetwork.FABRIC_CHANNEL)
        const contract = network.getContract(chaincode)

        /*** Submit Transaction ***/
        const txResult = await contract.submitTransaction(fcn, ...args)
        await gateway.disconnect()
        return txResult
    }
}