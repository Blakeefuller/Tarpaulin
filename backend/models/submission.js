const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const { User } = require('./user')
const { Assignment } = require('./assignment')

const Submission = sequelize.define('submission', {
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  grade: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  file: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Assignment.hasMany(Submission, { foreignKey: { name: 'assignmentId', type: DataTypes.INTEGER }, allowNull: false });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });

User.hasMany(Submission, { foreignKey: { name: 'studentId', type: DataTypes.INTEGER }, allowNull: false });
Submission.belongsTo(User, { foreignKey: 'studentId' });

exports.Submission = Submission

/*
 * Export an array containing the names of fields the client is allowed to set
 * on Submission.
 */
exports.SubmissionClientFields = [
  'assignmentId',
  'studentId',
  'timestamp',
  'grade',
  'file'
]