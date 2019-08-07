import { ControllerAdapter } from '@worldsibu/convector-core'
import { FabricNetwork } from './network'

const fabric = require('./fabric')

export class FabricControllerAdapter implements ControllerAdapter {
  public identity: string

  constructor(identity: string) {
    this.identity = identity
  }

  /**** Invoke Chaincode ****/
  public async invoke(controller: string, name: string, config?: any, ...args: any[]): Promise<any> {
    let params = (args || []).map(arg => { return typeof arg === 'object' ? JSON.stringify(arg) : arg.toString() })
    const txResult = await fabric.invoke(this.identity, FabricNetwork.FABRIC_CHAINCODE, `${controller}_${name}`, ...params)
    let result = null
    try { result = JSON.parse(txResult.toString()) }
    catch(e) { result = null }
    return result
  }

   /**** Invoke Chaincode ****/
  public async query(controller: string, name: string, config?: any, ...args: any[]): Promise<any> {
    // TODO //
    return null
  }
}