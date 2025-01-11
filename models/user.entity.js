import { DataTypes } from 'sequelize';
import sequelize from '../index.js'; // Correct import for Sequelize instance

const UserModel = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user', // Default role
    },
  },
  {
    tableName: 'users', // Map this model to your `users` table
    timestamps: false,  // Disable timestamps if they are not in the table
  }
);

export default UserModel;
