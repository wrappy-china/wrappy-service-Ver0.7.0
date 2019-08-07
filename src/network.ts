import * as dotenv from 'dotenv'

dotenv.config()
export class FabricNetwork {
    static USER_HOME: string = require('os').homedir()
    static FABRIC_HOME: string = process.env.FABRIC_HOME || `${FabricNetwork.USER_HOME}\\hyperledger-fabric-network`
    static FABRIC_CHAINCODE: string = process.env.FABRIC_CHAINCODE || 'wrappy'
    static FABRIC_CHANNEL: string = process.env.FABRIC_CHANNEL || 'mychannel'
    static FABRIC_ORG: string = process.env.FABRIC_ORG || 'org1'
    static FABRIC_ORG_MSP: string = process.env.FABRIC_ORG_MSP || 'Org1MSP'
    static FABRIC_CA: string = process.env.FABRIC_CA || 'ca.org1.alyale.com'
    static FABRIC_WALLET: string = process.env.FABRIC_WALLET || `${FabricNetwork.FABRIC_HOME}\\wallet`
    static FABRIC_NETWORK_PROFILE: string = process.env.NETWORKPROFILE || `${FabricNetwork.FABRIC_HOME}\\network-profiles\\${FabricNetwork.FABRIC_ORG}.network-profile.yaml`
}
