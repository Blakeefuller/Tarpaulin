const jwt = require("jsonwebtoken")

const secretKey = "SuperSecret"

exports.generateAuthToken = function (userId) {
    const payload = { sub: userId }
    return jwt.sign(payload, secretKey, { expiresIn: "24h" })
}

exports.requireAuthentication = function(req, res, next) {
  console.log("== requireAuthentication()")
  const authHeader = req.get('Authorization') || ""
  const authHeaderParts = authHeader.split(" ")
  const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null
  console.log("--token: ", token)
  try {
    const payload = jwt.verify(token, secretKey)
    console.log("-- payload: ", payload)
    req.user = payload.sub

    next()
  } catch (e) {
    console.error("--Error verify token: ", e)
    res.status(401).send({err: "User not logged in or invalid authentication token"})
  }
}