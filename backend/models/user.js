const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const bcrypt = require("bcryptjs")

const User = sequelize.define('user', {
  name: { 
    type: DataTypes.STRING(30), 
    allowNull: false
  },
  email: { 
    type: DataTypes.STRING(50), 
    allowNull: false, 
    unique: true
  },
  password: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  }, 
  role: { 
    type: DataTypes.ENUM('admin', 'instructor', 'student'), 
    defaultValue: 'student'
  }
})

exports.User = User

exports.UserClientFields = [
  'name',
  'email',
  'password',
  'role'
]

/*
 * Insert a new User into the DB.
 */
exports.insertNewUser = async function (user) {
  const userToInsert = user
  console.log("==user: ", user)

  const hash = await bcrypt.hash(userToInsert.password, 8)
  userToInsert.password = hash
  console.log("  -- userToInsert:", userToInsert)

  const result = await User.create(userToInsert)
  // const result = await User.build(userToInsert)

  return result
}


/*
* Fetch a user from the DB based on user ID.
*/
async function getUserByEmail (email, includePassword) {
  try {
    const results = await User.findOne({where:{ email: email}})
    console.log("==results: ", results)
    return results
  } catch(e) {
    return null
  }
}
exports.getUserByEmail = getUserByEmail

async function getUserById (id, includePassword) {
  try {
    const result = await User.findOne({where:{ id: id}})
    console.log("==result: ", result)
    return result
  } catch(e) {
    return null
  }
}
exports.getUserById = getUserById



exports.validateUser = async function (email, password) {
  const user = await getUserByEmail(email, true)
  return user && await bcrypt.compare(password, user.password)
}