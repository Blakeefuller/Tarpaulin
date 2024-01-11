const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')

const Error = sequelize.define('error', {
  ferrorile: {
    type: DataTypes.STRING,
    allowNull: false,
  },
})

exports.Error = Error

/*
 * Export an array containing the names of fields the client is allowed to set
 * on assignmentes.
 */
exports.ErrorClientFields = [
  
]
