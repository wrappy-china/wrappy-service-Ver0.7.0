import * as express from "express"
import * as parser from "body-parser"
import * as fs from 'fs'
import * as https from "https"
import * as jwt from "jsonwebtoken"
import * as exjwt from "express-jwt"
import * as SSE from "express-sse"

const service = require('./service')
const sse = new SSE()

const secret = 'Sfaslfsadlkfasdf'
const jwtMW = exjwt({
    secret: secret
});

const server = express()
server.use(parser.json())

/*****   Event Hub   ******/
server.get('/event-hub', sse.init)

/***** Authenticate  ******/
server.post('/provider/authenticate', async function (req, res) {
    const response = await service.authenticate('service', req)
    if (response.code === 100) {
        console.log()
        const token = jwt.sign({id: response.data.id, type: response.data.type, name: response.data.name, peer: response.data.peer}, secret, { expiresIn: 604800 })
        res.json({
            token,
            user: {
                id: response.data.id,
                name: response.data.name,
                type: response.data.type,
                peer: response.data.peer
            },
        })
    }
    else res.status(401).json({ error: response.data })
})

server.post('/user/authenticate', async function (req, res) {
    const response = await service.authenticate('user', req)
    if (response.code === 100) {
        console.log()
        const token = jwt.sign({id: response.data.id, type: response.data.type, name: response.data.name, peer: response.data.peer}, secret, { expiresIn: 604800 })
        res.json({
            token,
            user: {
                id: response.data.id,
                name: response.data.name,
                type: response.data.userType,
                active: response.data.wallet.coupon.active,
                inactive: response.data.wallet.coupon.inactive,
                expired: response.data.wallet.coupon.expired,
                input: response.data.wallet.coupon.input,
                output: response.data.wallet.coupon.output,
                peer: response.data.peer
            },
        })
    }
    else res.status(401).json({ error: response.data })
})

/***** COUPON: Register  ******/
server.post('/provider/coupon/register', jwtMW, async function (req, res) {
    const response = await service.registerCoupon(req)
    res.send(response)
})

/***** PROVIDER: Update Info  ******/
server.post('/provider/update', jwtMW, async function (req, res) {
    const response = await service.updateServiceProviderInfo(req)
    res.send(response)
})

/***** STORE: Register   ******/
server.post('/provider/store/register', jwtMW, async function (req, res) {
    res.send(await service.registerStore(req))
})

/***** PROVIDER: User List  ******/
server.post('/provider/user/list', jwtMW, async function (req, res) {
    const response = await service.listUser(req)
    res.send(response)
})

/***** PROVIDER: History List  ******/
server.post('/provider/transaction/history', jwtMW, async function (req, res) {
    const response = await service.listHistory('provider', req)
    res.send(response)
})

/***** ASSET: List  ******/
server.get('/provider/asset/list', jwtMW, async function (req, res) {
    const response = await service.assetList(req)
    res.send(response)
})

/***** COUPON: Issue  ******/
server.post('/provider/coupon/issue', jwtMW, async function (req, res) {
    const response = await service.issueCoupon(sse, req)
    res.send(response)
})

/***** COUPON: Info (Provider) ******/
server.post('/provider/coupon/info', jwtMW, async function (req, res) {
    const response = await service.infoCoupon('ServiceProvider', req)
    res.send(response)
})

/***** COUPON: Info (User) ******/
server.post('/user/coupon/info', jwtMW, async function (req, res) {
    const response = await service.infoCoupon('ServiceUser', req)
    res.send(response)
})

/***** COUPON: Transfer  ******/
server.post('/user/coupon/transfer', jwtMW, async function (req, res) {
    const response = await service.transferCoupon(sse, req)
    res.send(response)
})

/***** COUPON: Redeem  ******/
server.post('/user/coupon/redeem', jwtMW, async function (req, res) {
    const response = await service.redeemCoupon(sse, req)
    res.send(response)
})

/***** COUPON: Settle  ******/
server.post('/user/coupon/settle', jwtMW, async function (req, res) {
    const response = await service.settleCoupon(req)
    res.send(response)
})

/***** COUPON: Settle  ******/
server.post('/user/coupon/settle', jwtMW, async function (req, res) {
    const response = await service.settleCoupon(req)
    res.send(response)
})

/***** COUPON: Balance  ******/
server.get('/user/coupon/balance', jwtMW, async function (req, res) {
    const response = await service.balanceCoupon(req)
    res.send(response)
})

/***** COUPON: Deactivate  ******/
server.post('/provider/coupon/deactivate', jwtMW, async function (req, res) {
    const response = await service.deactivateCoupon(sse, req)
    res.send(response)
})

/***** COUPON: Activate  ******/
server.post('/provider/coupon/activate', jwtMW, async function (req, res) {
    const response = await service.activateCoupon(sse, req)
    res.send(response)
})

/***** COUPON: List  ******/
server.post('/provider/coupon/list', jwtMW, async function (req, res) {
    const response = await service.listCoupon('provider', req)
    res.send(response)
})

/***** USER: Register   ******/
server.post('/user/register', async function (req, res) {
    res.send(await service.registerUser(req))
})

/***** COUPON: List  ******/
server.post('/user/coupon/list', jwtMW, async function (req, res) {
    const response = await service.listCoupon('user', req)
    res.send(response)
})

/***** COUPON: List  ******/
server.post('/store/coupon/list', jwtMW, async function (req, res) {
    const response = await service.listCoupon('store', req)
    res.send(response)
})

/***** USER: Update Info  ******/
server.post('/user/update', jwtMW, async function (req, res) {
    const response = await service.updateServiceUserInfo(req)
    res.send(response)
})

/***** USER: List  ******/
server.post('/user/list', jwtMW, async function (req, res) {
    const response = await service.listUser(req)
    res.send(response)
})

/***** USER: Redeemer List  ******/
server.get('/user/redeemer/list', jwtMW, async function (req, res) {
    const response = await service.listReedemer(req)
    res.send(response)
})

/***** USER: History List  ******/
server.post('/user/transaction/history', jwtMW, async function (req, res) {
    const response = await service.listHistory('user', req)
    res.send(response)
})

/***** USER: Identity  ******/
server.post('/user/identity', jwtMW, async function (req, res) {
    const response = await service.identity(req)
    res.send(response)
})

var port = process.env.PORT || 8500
const node = https.createServer({
    key: fs.readFileSync('private.key'),
    cert: fs.readFileSync('certificate.crt'),
    ca: fs.readFileSync('ca_bundle.crt'),
}, server).listen(port, function () {
    console.log('Wrappy Service API 2.0 Alpha')
    console.log('Server started on port %d', port)
})
