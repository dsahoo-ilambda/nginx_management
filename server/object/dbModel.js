const {Sequelize} = require('sequelize')
//const sequelize = new Sequelize('postgres://testuser:testuser@localhost:5432/testdb')
// changing to this format helps async() work
const sequelize = new Sequelize('testdb', 'testuser', 'testuser', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
  });

(async() => {
    try {
        await sequelize.sync();
        console.log('Database synchorized')
    } catch(err) {
        console.log(err.message)
    }
   
})();

 
var User = sequelize.define('user', 
    {
        firstName: {
            type: Sequelize.STRING,
            field: 'first_name'
        },
        lastName: {
            type: Sequelize.STRING,
            field: 'last_name'
        },
        age: {
            type: Sequelize.INTEGER
        }
    }, 
    {freezeTableName: true}
)



var Customer = sequelize.define('nginx_customer',
    {
        customer_id: {
            type: Sequelize.STRING,
            field: 'customer_id',
            allowNull: false,
            primaryKey: true
        },
        zone: {
            type: Sequelize.INTEGER
        },
        rate: {
            type: Sequelize.FLOAT
        },
        burst: {
            type: Sequelize.INTEGER
        },
        eda_edge_group: {
            type: Sequelize.STRING,
            field: 'eda_edge_group'
        },
        external_ip: {
            type: Sequelize.STRING,
            field: 'external_ip',
            validate: {
                isIP: true
            }
        }, 
        external_port: {
            type: Sequelize.INTEGER,
            field: 'external_port'
        },
        config_file: {
            type: Sequelize.STRING
        }
    },
    {
        freezeTableName: true,
        timestamps: true
    }
)

var CustomerHistory = sequelize.define('nginx_customer_history', 
    {
        action: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                isIn: {
                    args: [['create', 'update', 'delete']],
                    msg: "action must be create, update or delete"
                }
            }
        },
        config: {
            type: Sequelize.STRING
        },
        username: {
            type: Sequelize.STRING
        },
        customer_id: {
            type: Sequelize.STRING,
            allowNull: false,
            field: 'customer_id',
            references: {
                model: Customer,
                key: 'customer_id'
            },
            onDelete: 'CASCADE'
        }
    },
    {
        freezeTableName: true,
        timestamps: true,
        tableName: 'nginx_customer_history'
    }
)

// This doesn't work
/* Customer.hasMany(CustomerHistory, {
    foreignKey: {
        name: 'customer_id'
    },
    onDelete: 'CASCADE'
})
CustomerHistory.belongsTo(Customer, {
    onDelete: 'CASCADE'
}) */

module.exports = {User, Customer, CustomerHistory}