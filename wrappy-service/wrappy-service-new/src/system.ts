import { ResponseData } from "./data"
const fabric = require('./fabric')

module.exports = {
    registerAdmin: async function (request) {
        let response = new ResponseData()
        try {
            console.log("Method: registerAdmin")
            console.log(`Parameter: none`)
            console.log('')

            /***** ADMINISTRATOR ONLY ******/
            if (request.user.id !== 'admin') throw "ERROR: Administrator credential required."

            console.log(`Registering administrator ...`)
            await fabric.registerAdmin()
            response.data = 'admin'
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
}