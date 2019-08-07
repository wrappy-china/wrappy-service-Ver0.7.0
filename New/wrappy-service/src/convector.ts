import { FabricControllerAdapter } from './adapter'
import { ClientFactory } from '@worldsibu/convector-core'
import { ServiceController, PlatformController } from 'wrappy-cc'

module.exports = {
    getPlatformController: async function (identity) {
        const adapter = new FabricControllerAdapter(identity)
        return await ClientFactory(PlatformController, adapter)
    },
    getServiceController: async function (identity) {
        const adapter = new FabricControllerAdapter(identity)
        return await ClientFactory(ServiceController, adapter)
    }
}